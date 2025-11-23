
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export const MODEL_NAME = "gemini-2.5-flash"; // Stable version of Gemini 2.5 Flash
