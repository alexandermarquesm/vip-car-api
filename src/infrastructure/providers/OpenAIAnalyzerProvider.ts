import OpenAI from "openai";
import { IAnalyzerProvider } from "../../application/protocols/IAnalyzerProvider";

export class OpenAIAnalyzerProvider implements IAnalyzerProvider {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY não configurada.");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async analyze(imageBuffer: Buffer, mimeType: string, prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const textResponse = response.choices[0].message.content;
    if (!textResponse) {
      throw new Error("O OpenAI não retornou nenhum conteúdo.");
    }

    return textResponse;
  }
}
