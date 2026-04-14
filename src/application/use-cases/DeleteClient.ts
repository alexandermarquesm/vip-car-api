import { IClientRepository } from "../repositories/IClientRepository";

export interface DeleteClientInput {
  tenantId: string;
  id: string;
}

export class DeleteClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute(input: DeleteClientInput): Promise<boolean> {
    if (!input.id) {
      throw new Error("O ID do cliente é obrigatório.");
    }

    const deleted = await this.clientRepository.delete(input.tenantId, input.id);
    
    if (!deleted) {
      throw new Error("Cliente não encontrado ou você não tem permissão para excluí-lo.");
    }

    return true;
  }
}
