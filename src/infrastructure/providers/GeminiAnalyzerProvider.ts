import { GoogleGenAI } from "@google/genai";
import { IAnalyzerProvider } from "../../application/protocols/IAnalyzerProvider";

export class GeminiAnalyzerProvider implements IAnalyzerProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyze(imageBuffer: Buffer, mimeType: string, prompt: string): Promise<string> {
    const generateResponse = await this.ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const textResponse = generateResponse?.text;
    if (!textResponse) {
      throw new Error("O Gemini não retornou nenhum dado.");
    }

    return textResponse;
  }
}
