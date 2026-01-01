import { GoogleGenAI, Type } from "@google/genai";
import { QuizData } from "../types";

// NOTE: Ideally, the API key should come from a secure backend proxy in production.
// For this frontend-only demo, we use the env variable directly as instructed.
const apiKey = process.env.API_KEY || ''; 

export const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  /**
   * Generates generic text content based on a prompt.
   * Useful for descriptions, syllabus, etc.
   */
  generateText: async (prompt: string, context: string = ''): Promise<string> => {
      try {
        const fullPrompt = `${context}\n\nTarefa: ${prompt}\n\nResponda em Português de Portugal, num tom profissional e convidativo.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
        });
        return response.text || "";
      } catch (error) {
          console.error("Gemini Text Gen Error:", error);
          return "";
      }
  },

  /**
   * Generates a course plan based on a topic.
   */
  generateCoursePlan: async (topic: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Crie um plano de curso detalhado para o tema: "${topic}". 
        O plano deve incluir Objetivos Gerais, Público-Alvo e uma estrutura de Módulos (pelo menos 4 módulos) com tópicos.
        Formate a resposta em Markdown limpo e profissional, em Português de Portugal.`,
      });
      
      return response.text || "Não foi possível gerar o plano. Tente novamente.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Erro ao comunicar com a IA. Verifique a chave de API.";
    }
  },

  /**
   * Generates a diagnostic quiz in JSON format.
   */
  generateQuiz: async (topic: string): Promise<QuizData | null> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gere um quiz de diagnóstico sobre "${topic}" com 5 perguntas de escolha múltipla.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    options: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING } 
                    },
                    correctAnswer: { type: Type.STRING, description: "Must match one of the options exactly" }
                  }
                }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(text) as QuizData;
    } catch (error) {
      console.error("Gemini Quiz Error:", error);
      return null;
    }
  }
};