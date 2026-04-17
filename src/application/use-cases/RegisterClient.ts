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
    // 1. Find existing client by phone within the same tenant
    let client = await this.clientRepository.findByPhone(input.tenantId, input.phone);

    if (client) {
      // 2. Update existing client info
      client.name = input.name;
      if (input.plate) {
        client.addVehicle(input.plate.toUpperCase(), input.carModel || "");
      }
      return await this.clientRepository.save(client);
    } else {
      // 3. Create new client
      const newClient = new Client({
        tenantId: input.tenantId,
        name: input.name,
        phone: input.phone,
        vehicles: input.plate ? [{ plate: input.plate.toUpperCase(), carModel: input.carModel || "" }] : [],
      });
      return await this.clientRepository.save(newClient);
    }
  }

}
