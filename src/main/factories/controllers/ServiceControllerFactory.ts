import { MongooseClientRepository } from "../../../interface/repositories/MongooseClientRepository";
import { MongooseWashRepository } from "../../../interface/repositories/MongooseWashRepository";
import { RegisterService } from "../../../application/use-cases/RegisterService";
import { ListServices } from "../../../application/use-cases/ListServices";
import { UpdateServiceStatus } from "../../../application/use-cases/UpdateServiceStatus";
import { UpdateServicePrice } from "../../../application/use-cases/UpdateServicePrice";
import { DeleteService } from "../../../application/use-cases/DeleteService";
import { GetBackup } from "../../../application/use-cases/GetBackup";
import { AnalyzeSheet } from "../../../application/use-cases/AnalyzeSheet";
import { ServiceController } from "../../../interface/controllers/ServiceController";
import { GeminiAnalyzerProvider } from "../../../infrastructure/providers/GeminiAnalyzerProvider";
import { OpenAIAnalyzerProvider } from "../../../infrastructure/providers/OpenAIAnalyzerProvider";

export const makeServiceController = (env: any): ServiceController => {
  const clientRepository = new MongooseClientRepository();
  const washRepository = new MongooseWashRepository();

  const registerService = new RegisterService(clientRepository, washRepository);
  const listServices = new ListServices(washRepository);
  const updateServiceStatus = new UpdateServiceStatus(washRepository);
  const updateServicePrice = new UpdateServicePrice(washRepository);
  const deleteService = new DeleteService(washRepository);
  const getBackup = new GetBackup(clientRepository, washRepository);

  // Decisão do provedor de análise via variável de ambiente
  const analyzerProvider = env.ANALYZE_PROVIDER === "openai"
    ? new OpenAIAnalyzerProvider(env.OPENAI_API_KEY)
    : new GeminiAnalyzerProvider(env.GEMINI_API_KEY);

  const analyzeSheet = new AnalyzeSheet(analyzerProvider);

  return new ServiceController(
    registerService,
    listServices,
    updateServiceStatus,
    updateServicePrice,
    deleteService,
    getBackup,
    analyzeSheet
  );
};
