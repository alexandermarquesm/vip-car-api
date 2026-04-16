import { Response } from "express";
import { AuthenticatedRequest } from "../../infrastructure/webserver/express/middlewares/AuthMiddleware";
import { RegisterService } from "../../application/use-cases/RegisterService";
import { ListServices } from "../../application/use-cases/ListServices";
import { UpdateServiceStatus } from "../../application/use-cases/UpdateServiceStatus";
import { UpdateServicePrice } from "../../application/use-cases/UpdateServicePrice";
import { DeleteService } from "../../application/use-cases/DeleteService";
import { GetBackup } from "../../application/use-cases/GetBackup";
import { AnalyzeSheet } from "../../application/use-cases/AnalyzeSheet";
import { WashSchema, PaymentSchema } from "../../domain/schemas/WashSchema";
import { z } from "zod";

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
      // Input Validation with Zod (Optional layer, but good to have)
      // Note: RegisterService might do its own validation or trust the controller
      const result = await this.registerService.execute({
        tenantId: req.user!.tenantId,
        ...req.body,
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes("já possui uma lavagem pendente")) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, date, q } = req.query;
      const services = await this.listServices.execute({ 
        tenantId: req.user!.tenantId,
        status: status as string, 
        date: date as string,
        search: q as string
      });
      res.json(services);
    } catch (error: any) {
      console.error("Error in ServiceController.list:", error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, paymentMethod, payments } = req.body;
      
      // Validation
      const validatedStatus = z.enum(["pending", "completed", "cancelled"]).parse(status);
      
      const wash = await this.updateServiceStatus.execute({
        tenantId: req.user!.tenantId,
        id: id as string,
        status: validatedStatus,
        paymentMethod,
        payments,
      });
      res.json(wash);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
        return;
      }
      if (error.message.includes("já possui uma lavagem pendente")) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }

  async updatePrice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { price } = req.body;
      const wash = await this.updateServicePrice.execute({ 
        tenantId: req.user!.tenantId, 
        id: id as string, 
        price: Number(price) 
      });
      res.json(wash);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async backup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const backupData = await this.getBackup.execute(req.user!.tenantId);
      res.json(backupData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.deleteService.execute({ 
        tenantId: req.user!.tenantId, 
        id: id as string 
      });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async scanSheet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhuma imagem providenciada" });
        return;
      }

      const rows = await this.analyzeSheet.execute(req.file.buffer, req.file.mimetype);
      res.json(rows);
    } catch (error: any) {
      console.error("Erro ao escanear planilha:", error);
      res.status(500).json({ error: error.message || "Erro interno ao processar a imagem." });
    }
  }
}
