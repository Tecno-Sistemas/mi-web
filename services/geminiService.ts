import { GoogleGenAI, Type } from "@google/genai";
import { ClassItem, DifficultyLevel, GeneratedLesson } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

export const generateCurriculum = async (
  language: string,
  level: DifficultyLevel
): Promise<ClassItem[]> => {
  const prompt = `
    Create a structured learning path (curriculum) for learning the programming language "${language}" at a "${level}" level.
    The curriculum should consist of exactly 8 to 10 distinct classes (lessons).
    Start from "Clase 1".
    Return a list of objects containing an ID, title, and a short description.
    The content MUST be in Spanish.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              title: { type: Type.STRING, description: "Example: Clase 1: Introducción a las variables" },
              description: { type: Type.STRING, description: "A brief summary of what will be learned." }
            },
            required: ["id", "title", "description"]
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("No response generated");
    
    return JSON.parse(jsonStr) as ClassItem[];
  } catch (error) {
    console.error("Error generating curriculum:", error);
    throw error;
  }
};

export const generateLessonContent = async (
  language: string,
  level: DifficultyLevel,
  classTitle: string
): Promise<GeneratedLesson> => {
  const prompt = `
    You are an expert programming tutor for the channel "ElTecno-Sistemas".
    Write a detailed tutorial for the class "${classTitle}" for the language "${language}" (${level} level).
    
    Structure:
    1. **Introduction**: Brief concept explanation.
    2. **Theory**: Detailed explanation.
    3. **Code Examples**: Provide clear code blocks.
    4. **Challenge**: A small exercise for the student.
    
    Tone: Encouraging, educational, clear.
    Language: Spanish.
    Format: Markdown.
    Important: Do NOT include JSON. Just Markdown text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return {
      title: classTitle,
      content: response.text || "Hubo un error generando el contenido. Intenta de nuevo."
    };
  } catch (error) {
    console.error("Error generating lesson:", error);
    throw error;
  }
};
