import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/api/test', (req, res) => {
    res.json({ status: 'Server is working!' });
});

const pollinations = new OpenAI({
    apiKey: process.env.POLLINATIONS_API_KEY,
    baseURL: 'https://gen.pollinations.ai/v1',
});

const STYLE_TEMPLATES = {
    'simple-outline': 'Simple coloring book page with clean bold thick black outlines, featuring large simple shapes, minimal details, and a pure white background. No shading, no gradients, no color, just flat 2D vector line art.',
    'realistic': 'Detailed hyper-realistic coloring book page, featuring fine black ink line art. Very detailed, using crosshatching to indicate intricate textures, and with realistic proportions. Crisp black linework on a pure white background, no color.',
    'geometric': 'An adult coloring book page featuring repeating patterns and geometric shapes. Uses symmetry, radial repetition, patterns and crisp shapes, clean black vector style line art on a pure white background, no shading, no color. Detailed, but not overwhelming.',
    'greyscale': 'A greyscale coloring book page, that uses black and white tonal gradients, to indicate patterns and shading, with crisp black outlines on a white background. Black to white gradient shades only, no color.',
    'doodle': 'Whimsical, jam-packed layouts, or "doodle dump" style coloring book page. Pop-surrealist layouts, featuring overlapping cartoon characters and quirky background elements in playful chaos. Vector style line art with thick black lines, a pure white background, no shading, no color.'
};

app.post('/api/generate', async (req, res) => {

    const { prompt, style } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const styleModifier = STYLE_TEMPLATES[style] || STYLE_TEMPLATES['simple-outline'];

    try {
        const chatResponse = await pollinations.chat.completions.create({
            model: 'openai/gpt-5.4-nano',
            messages: [
                {
                    role: 'system',
                    content: 'You are a creative coloring book illustrator. Return ONLY a valid JSON object with a "scenes" key containing an array of 6 distinct strings. Each string must be a distinct, highly visual scene description expanding on a user-supplied theme, optimized for a coloring book page. No extra conversational text.'
                },
                {
                    role: 'user',
                    content: `Theme: "${prompt}". Generate 6 distinct scene descriptions for individual coloring book pages, adhering to these page style instructions: ${styleModifier}`,
                }
            ],
            response_format: { type: 'json_object' }
        });

        const parsedData = JSON.parse(chatResponse.choices[0].message.content);
        const sceneList = parsedData.scenes || (Array.isArray(parsedData) ? parsedData : Object.values(parsedData)[0]);

        if (!sceneList || !Array.isArray(sceneList) || sceneList.length === 0) {
            throw new Error('LLM did not return a valid scene list.');
        }

        const fetchPromises = sceneList.slice(0, 6).map(async (sceneDescription, idx) => {
            const fullPrompt = `${styleModifier}. Subject: ${sceneDescription}.`;
            const response = await fetch('https://gen.pollinations.ai/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`
                },
                body: JSON.stringify({
                    prompt: fullPrompt,
                    model: 'tongyi-mai/z-image-turbo',
                    n: 1,
                    size: '768x1024'
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Pollinations API error (${response.status}): ${errText}`);
            }
            
            const linkHeader = response.headers.get('link');
            let imageUrl = '';

            if (linkHeader) {
                const match = linkHeader.match(/<([^>]+)>/);
                if (match) imageUrl = match[1];
            }
            
            if (!imageUrl) {
                try {
                    const data = await response.json();
                    imageUrl = data.url || data.data?.[0]?.url;
                } catch (e) {
                    console.error(e);
                }
            }

            return imageUrl;
        });

        const results = await Promise.allSettled(fetchPromises);

        const images = results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value);

        if (images.length === 0) {
            return res.status(500).json({ error: 'Failed to generate images from batch.' });
        }

        res.json({ images });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Server error during generation process.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));