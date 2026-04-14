import { IClientRepository } from "../repositories/IClientRepository";

export class SearchClients {
  constructor(private clientRepository: IClientRepository) {}

  async execute(tenantId: string, query: string) {
    if (!query || query.length < 3) return [];
    return await this.clientRepository.search(tenantId, query);
  }
}
