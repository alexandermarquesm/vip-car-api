import { Response } from "express";
import { AuthenticatedRequest } from "../../infrastructure/webserver/express/middlewares/AuthMiddleware";
import { RegisterService } from "../../application/use-cases/RegisterService";
import { ListServices } from "../../application/use-cases/ListServices";
import { UpdateServiceStatus } from "../../application/use-cases/UpdateServiceStatus";
import { UpdateServicePrice } from "../../application/use-cases/UpdateServicePrice";
import { DeleteService } from "../../application/use-cases/DeleteService";
import { GetBackup } from "../../application/use-cases/GetBackup";
import { AnalyzeSheet } from "../../application/use-cases/AnalyzeSheet";
import { AppError } from "../../infrastructure/errors/AppError";

export class ServiceController {
  constructor(
    private registerService: RegisterService,
    private listServices: ListServices,
    private updateServiceStatus: UpdateServiceStatus,
    private updateServicePrice: UpdateServicePrice,
    private deleteService: DeleteService,
    private getBackup: GetBackup,
    private analyzeSheet: AnalyzeSheet
  ) {}

  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await this.registerService.execute({
        tenantId: req.user!.tenantId,
        ...req.body,
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes("já possui uma lavagem pendente")) {
        throw new AppError(error.message, 409);
      }
      throw error;
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { status, date, q } = req.query;
    const services = await this.listServices.execute({ 
      tenantId: req.user!.tenantId,
      status: status as string, 
      date: date as string,
      search: q as string
    });
    res.json(services);
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, paymentMethod, payments } = req.body;
    
    try {
      const wash = await this.updateServiceStatus.execute({
        tenantId: req.user!.tenantId,
        id: id as string,
        status,
        paymentMethod,
        payments,
      });
      res.json(wash);
    } catch (error: any) {
      if (error.message.includes("já possui uma lavagem pendente")) {
        throw new AppError(error.message, 409);
      }
      throw error;
    }
  }

  async updatePrice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { price } = req.body;
    const wash = await this.updateServicePrice.execute({ 
      tenantId: req.user!.tenantId, 
      id: id as string, 
      price: Number(price) 
    });
    res.json(wash);
  }

  async backup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const backupData = await this.getBackup.execute(req.user!.tenantId);
    res.json(backupData);
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    await this.deleteService.execute({ 
      tenantId: req.user!.tenantId, 
      id: id as string 
    });
    res.status(204).send();
  }

  async scanSheet(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.file) {
      throw new AppError("Nenhuma imagem providenciada", 400);
    }

    const rows = await this.analyzeSheet.execute(req.file.buffer, req.file.mimetype);
    res.json(rows);
  }
}

