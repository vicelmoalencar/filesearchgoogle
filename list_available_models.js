const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listAvailableModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        console.log("Fetching list of available models...\n");

        // Use fetch to call the API directly
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Available models:");
        console.log("=================\n");

        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                console.log(`Name: ${model.name}`);
                console.log(`Display Name: ${model.displayName}`);
                console.log(`Description: ${model.description}`);
                console.log(`Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
                console.log('---');
            });
        } else {
            console.log("No models found.");
        }
    } catch (error) {
        console.error("Error listing models:", error.message);
        console.error("\nPossible issues:");
        console.error("1. Invalid API key");
        console.error("2. Generative Language API not enabled in Google Cloud Console");
        console.error("3. API key doesn't have proper permissions");
    }
}

listAvailableModels();
