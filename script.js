document.addEventListener('DOMContentLoaded', () => {
    const styleOptions = document.querySelectorAll('.style-option');
    const generateBtn = document.getElementById('generateBtn');
    const promptInput = document.getElementById('promptInput');

    // Style Card elements
    const infoModal = document.getElementById('infoModal');
    const closeModal = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalImg = document.getElementById('modalImg');

    let selectedStyle = 'simple-outline';
    let selectedStyleTitle = 'Simple Outline';

    // Handle style card selection
    styleOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            if (e.target.closest('.info-btn')) return;

            styleOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedStyle = option.getAttribute('data-style');
            selectedStyleTitle = option.getAttribute('data-title');
        });

        const infoBtn = option.querySelector('.info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(option);                
            });
        }
    });
    
    // Event listeners to close style info popup 
    closeModal.addEventListener('click', () => closeModalHandler(false));
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) closeModalHandler(false);
    });

    // Helper function to populate style info popup with data/img
    function openModal(option) {
        modalTitle.textContent = option.getAttribute('data-title');
        modalDesc.textContent = option.getAttribute('data-desc');
        const cardImg = option.querySelector('.image-container img');
        modalImg.setAttribute('src', cardImg ? cardImg.getAttribute('src') : '');
        infoModal.classList.add('active');
    }

    // Helper function to handle pop up closure 
    function closeModalHandler() {
        infoModal.classList.remove('active');
    }

    // Event listener to initiate image generation 
    generateBtn.addEventListener('click', async () => {
        const promptValue = promptInput.value.trim();

        // Ensure valid prompt input
        if (!promptValue) {
            alert('Please describe what you would like to color first!');
            promptInput.focus();
            return;
        }

        // Screen Transition to Progress Display
        setScreenState('loading');
        const { stopProgress, completeProgress } = runProgressBar(selectedStyleTitle, promptValue);

        // Await Image Generation w/ Error Handling
        try {
            const images = await fetchColoringPages(promptValue, selectedStyle);
            completeProgress();

            setTimeout(() => {
                setScreenState('results');
                renderResults(images, promptValue);
            }, 300);
        } catch (err) {
            stopProgress();
            alert(err.message);
            setScreenState('creator');
        }
    });
});

// Helper Function to Set Web App Screen for Display:
function setScreenState(state) {
    const creatorCard = document.getElementById('creatorCard');
    const loadingScreen = document.getElementById('loadingScreen');
    const resultsScreen = document.getElementById('resultsScreen');

    creatorCard.style.display = state === 'creator' ? 'block' : 'none';
    loadingScreen.style.display = state === 'loading' ? 'block' : 'none';
    resultsScreen.style.display = state === 'results' ? 'flex' : 'none';

    if (state === 'results') {
        resultsScreen.style.flexDirection = 'column';
        resultsScreen.style.gap = '1.5rem';
    }
}

// Helper function to generate Progress Bar for Image Generation
function runProgressBar(styleTitle, promptValue) {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const loadingStatusText = document.getElementById('loadingStatusText');

    let progress = 0;
    progressBarFill.style.width = '0%';
    progressPercentage.textContent = '0%';

    const interval = setInterval(() => {
        if (progress < 95) {
            progress += 1;
            progressBarFill.style.width = `${progress}%`;
            progressPercentage.textContent = `${progress}%`;
            
            if (progress <= 30) {
                loadingStatusText.textContent = `Analyzing prompt with AI: "${promptValue}"...`;
            } else if (progress <= 70) {
                loadingStatusText.textContent = `Applying ${styleTitle} style guidelines...`;
            } else {
                loadingStatusText.textContent = `Generating 6 pages via Pollinations...`;
            }
        }
    }, 60);

    return {
        stopProgress: () => clearInterval(interval),
        completeProgress: () => {
            clearInterval(interval);
            progressBarFill.style.width = '100%';
            progressPercentage.textContent = '100%';
            loadingStatusText.textContent = 'Done!';
        }
    };
}

// Helper Function to Trigger Image Generation
async function fetchColoringPages(prompt, style) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Generation failed');
    return data.images;
}       

// Helper Function to Display Generated Images
function renderResults(imageUrls, title) {
    const resultsGrid = document.getElementById('resultsGrid');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const startOverBtn = document.getElementById('startOverBtn');

    resultsGrid.innerHTML = '';
    imageUrls.forEach((url, idx) => {
        const card = document.createElement('div');
        card.className = 'style-option';
        card.innerHTML = `
            <div class="image-container">
                <img src="${url}" alt="Coloring Page ${idx + 1}" crossorigin="anonymous">
            </div>
            <div class="style-header-row">
                <span class="style-name">Page ${idx + 1}</span>
                <a href="${url}" download="coloring-page-${idx + 1}.png" target="_blank" class="info-btn">⬇</a>
            </div>
        `;
        resultsGrid.appendChild(card);
    });

    if (downloadPdfBtn) {
        downloadPdfBtn.onclick = async () => {
            downloadPdfBtn.textContent = 'Building PDF...';
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: 'letter'
            });

            for (let i = 0; i < imageUrls.length; i++) {
                if (i > 0) doc.addPage();
                const imgData = await fetchImageAsBase64(imageUrls[i]);
                doc.addImage(imgData, 'PNG', 0.5, 0.5, 7.5, 10);
            }

            doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-coloring-book.pdf`);
            downloadPdfBtn.textContent = 'Download PDF';
        };
    }

    if (startOverBtn) {
        startOverBtn.onclick = () => setScreenState('creator');
    }
}

// Helper Function to fetch images
async function fetchImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}