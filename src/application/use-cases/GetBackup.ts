import { IClientRepository } from "../repositories/IClientRepository";
import { IWashRepository } from "../repositories/IWashRepository";

export class GetBackup {
  constructor(
    private clientRepository: IClientRepository,
    private washRepository: IWashRepository
  ) {}

  async execute(tenantId: string) {
    const clients = await this.clientRepository.findAll(tenantId);
    const washes = await (this.washRepository.findAll ? this.washRepository.findAll(tenantId) : Promise.resolve([]));

    return {
      timestamp: new Date().toISOString(),
      counts: {
        clients: clients.length,
        washes: washes.length,
      },
      data: {
        clients,
        washes,
      },
    };
  }
}
