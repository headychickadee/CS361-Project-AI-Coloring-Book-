# AI Coloring Book Creater Web App

A web application that generates custom coloring book pages. Built with node.js and vanilla Javascript.

## Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your machine. 

## Setup Instructions

1. **Clone the repository:**
    ```bash
    git clone https://github.com/headychickadee/CS361-Project-AI-Coloring-Book-
    cd CS61-Project-AI-Coloring-Book-
    ```

2. **Install Dependencies:**
    ```bash
    npm install
    ```

3. **Configure Environment Variables:**
    - Duplicate the `.env.example` file and rename the copy to `.env`.
    - Add the test API key given in the assignment comments to the `.env` file.
      ```
      OPENAI_API_KEY=test-api-key-here
      PORT=3000
      ```

4. **Run the Application:**
    ```bash
    npm start
    ```

5. **Open in Browser:**
    Navigate to `http://localhost:3000` to use the application.
    NOTE: A different port can be designated in the `.env` file if desired.
