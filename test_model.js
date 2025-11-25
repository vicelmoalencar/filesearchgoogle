const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function testModel() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        console.log("Testing gemini-2.5-flash model...\n");
        const result = await model.generateContent("Say hello!");
        const response = await result.response;
        const text = response.text();
        console.log("✅ SUCCESS!");
        console.log("Response:", text);
    } catch (error) {
        console.log("❌ FAILED!");
        console.error("Error:", error.message);
    }
}

testModel();
