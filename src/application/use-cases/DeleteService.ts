import { IWashRepository } from "../repositories/IWashRepository";

export interface DeleteServiceInput {
  tenantId: string;
  id: string;
}

export class DeleteService {
  constructor(private washRepository: IWashRepository) {}

  async execute(input: DeleteServiceInput): Promise<boolean> {
    if (!input.id) {
      throw new Error("O ID do serviço é obrigatório.");
    }

    const deleted = await this.washRepository.delete(input.tenantId, input.id);
    
    if (!deleted) {
      throw new Error("Serviço não encontrado ou você não tem permissão para excluí-lo.");
    }

    return true;
  }
}
