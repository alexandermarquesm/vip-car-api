import { Client } from "../../domain/entities/Client";
import { IClientRepository } from "../repositories/IClientRepository";

export interface RegisterClientInput {
  tenantId: string;
  name: string;
  phone: string;
  plate?: string;
  carModel?: string;
}

export class RegisterClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute(input: RegisterClientInput) {
    const sanitizedPhone = input.phone.replace(/\D/g, "");
    const sanitizedPlate = input.plate ? input.plate.trim().toUpperCase() : undefined;

    if (!input.name || !sanitizedPhone) {
      throw new Error("Nome e Telefone são obrigatórios.");
    }

    if (input.name.length > 60) {
      throw new Error("O nome do cliente deve ter no máximo 60 caracteres.");
    }

    // 1. Find existing client by phone within the same tenant
    let client = await this.clientRepository.findByPhone(input.tenantId, sanitizedPhone);

    if (client) {
      // 2. Update existing client info
      client.name = input.name;
      if (sanitizedPlate) {
        client.addVehicle(sanitizedPlate, input.carModel || "");
      }
      return await this.clientRepository.save(client);
    } else {
      // 3. Create new client
      const newClient = new Client({
        tenantId: input.tenantId,
        name: input.name,
        phone: sanitizedPhone,
        vehicles: sanitizedPlate ? [{ plate: sanitizedPlate, carModel: input.carModel || "" }] : [],
      });
      return await this.clientRepository.save(newClient);
    }
  }
}
