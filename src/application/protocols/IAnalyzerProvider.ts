export interface IAnalyzerProvider {
  analyze(imageBuffer: Buffer, mimeType: string, prompt: string): Promise<string>;
}
