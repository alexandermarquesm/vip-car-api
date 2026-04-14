import { Response } from "express";
import { AuthenticatedRequest } from "../../infrastructure/webserver/express/middlewares/AuthMiddleware";
import { SearchClients } from "../../application/use-cases/SearchClients";
import { UpdateClient } from "../../application/use-cases/UpdateClient";
import { RegisterClient } from "../../application/use-cases/RegisterClient";
import { DeleteClient } from "../../application/use-cases/DeleteClient";
import { IClientRepository } from "../../application/repositories/IClientRepository";

export class ClientController {
  constructor(
    private searchClients: SearchClients,
    private updateClient: UpdateClient,
    private registerClient: RegisterClient,
    private deleteClient: DeleteClient,
    private clientRepository: IClientRepository
  ) {}

  async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      const clients = await this.searchClients.execute(req.user!.tenantId, q as string);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clients = await this.clientRepository.findAll(req.user!.tenantId);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.updateClient.execute({ tenantId: req.user!.tenantId, id, ...req.body });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await this.registerClient.execute({
        tenantId: req.user!.tenantId,
        ...req.body
      });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.deleteClient.execute({
        tenantId: req.user!.tenantId,
        id: id as string
      });
      res.json({ success: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
