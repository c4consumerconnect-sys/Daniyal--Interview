# TalentScout AI

An intelligent interview platform that conducts real-time audio interviews based on your CV. Built with React and the Google Gemini Live API.

## Features

-   **Smart CV Analysis**: Uploads PDF or text resumes and uses Gemini 2.5 Flash to extract skills, experience, and interview topics.
-   **Real-time Voice Interview**: Conducts a low-latency, natural voice conversation using the Gemini Live API.
-   **Oscilloscope Visualizer**: Real-time audio visualization that reacts to voice input.
-   **Structured Interview Flow**: Automatically introduces itself and asks relevant questions based on the candidate's profile.

## Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI**: Google Gemini API (Flash 2.5 for analysis, Live API for voice)
-   **Audio**: Web Audio API (Raw PCM streaming)

## Run Locally

Prerequisites: Node.js

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Create a `.env` or `.env.local` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    # or
    API_KEY=your_api_key_here
    ```

3.  **Run the app**:
    ```bash
    npm run dev
    ```
    Open http://localhost:5173 (or the port shown in your terminal) to view it in the browser.

## License

MIT
