
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
}

// Legacy File API (48h expiration)
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// New File Search API (permanent storage)
export const genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODEL_NAME = "gemini-2.5-flash"; // Stable version of Gemini 2.5 Flash

// File Search Store name (permanent corpus)
export const FILE_SEARCH_STORE_NAME = "cct-file-search-store";
