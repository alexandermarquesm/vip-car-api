import { IAnalyzerProvider } from "../protocols/IAnalyzerProvider";

export class AnalyzeSheet {
  constructor(private analyzerProvider: IAnalyzerProvider) {}

  async execute(imageBuffer: Buffer, mimeType: string): Promise<any[]> {
    const prompt = `Analise a tabela na imagem. Ela contém os dados de serviços de lavagem automotiva.
    
Para cada linha legível, extraia e retorne um objeto JSON com a chave "data" contendo um array de objetos com as seguintes chaves requeridas:
- "name": Nome do cliente (String)
- "phone": Número de telefone, ou string vazia se não existir (String)
- "plate": Placa do carro (String)
- "carModel": Modelo do carro (String)
- "date": Data que se encontra na linha. Importante: pegue exatamente como escrito (ex: 13/04/26) (String)
- "value": O preço. RETORNE COM DUAS CASAS DECIMAIS E PONTO (ex: se estiver 65 ou 65,00, retorne "65.00"). CUIDADO: o valor lógico de uma lavagem raramente passa de 150. Se a vírgula estiver fraca e parecer "6500" ou "650", corrija logicamente para "65.00". NUNCA retorne milhares. (String)
- "paymentMethod": D para dinheiro, P para pix, C para cartão (String)`;

    const textResponse = await this.analyzerProvider.analyze(imageBuffer, mimeType, prompt);
    
    if (!textResponse) {
      throw new Error("A IA não retornou nenhum dado");
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(textResponse);
    } catch (error) {
      const cleaned = textResponse.replace(/^```json\n?/g, '').replace(/```$/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    }

    const parsedData = Array.isArray(parsedResponse) ? parsedResponse : (parsedResponse.data || parsedResponse.services || []);

    if (!Array.isArray(parsedData)) {
      throw new Error("Formato inválido retornado pela IA.");
    }

    return parsedData.map((row: any, index: number) => ({
      id: index.toString(),
      name: row.name || "",
      phone: row.phone || "",
      plate: row.plate || "",
      carModel: row.carModel || "",
      date: row.date || "",
      value: row.value || "0.00",
      paymentMethod: row.paymentMethod || "P",
      status: "pending"
    }));
  }
}
