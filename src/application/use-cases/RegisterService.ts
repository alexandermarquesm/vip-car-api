import { Client } from "../../domain/entities/Client";
import { Wash } from "../../domain/entities/Wash";
import { PriceCalculator } from "../../domain/services/PriceCalculator";
import { IClientRepository } from "../repositories/IClientRepository";
import { IWashRepository } from "../repositories/IWashRepository";
import { ClientSchema } from "../../domain/schemas/ClientSchema";
import { WashSchema } from "../../domain/schemas/WashSchema";
import crypto from "crypto";

export interface RegisterServiceInput {
  tenantId: string;
  name: string;
  phone: string; // Já vem limpo (apenas dígitos) pela validação Zod
  plate: string; // Já vem limpo (UpperCase, sem símbolos) pela validação Zod
  carModel: string;
  washPrice: number; // Agora é obrigatoriamente um number
  deliveryTime: string | Date;
  paymentMethod?: string;
}

export class RegisterService {
  constructor(
    private clientRepository: IClientRepository,
    private washRepository: IWashRepository
  ) {}

  async execute(input: RegisterServiceInput) {
    const sanitizedPlate = input.plate.toUpperCase();
    
    // Check for duplicate pending wash
    const existingWash = await this.washRepository.findPendingByPlate(input.tenantId, sanitizedPlate);
    if (existingWash) {
      throw new Error(
        `O veículo ${sanitizedPlate} já possui uma lavagem pendente na fila.`
      );
    }

    // 2. Find or Create Client
    let client = await this.clientRepository.findByPhone(input.tenantId, input.phone);

    if (client) {
      client.name = input.name;
      client.addVehicle(sanitizedPlate, input.carModel);
      await this.clientRepository.save(client);
    } else {
      const newClient = new Client({
        tenantId: input.tenantId,
        name: input.name,
        phone: input.phone,
        vehicles: [{ plate: sanitizedPlate, carModel: input.carModel }],
      });
      client = await this.clientRepository.save(newClient);
    }

    // 3. Create Wash Record
    const netPrice = PriceCalculator.calculateNetPrice(input.washPrice, input.paymentMethod);

    const wash = new Wash({
      tenantId: input.tenantId,
      clientId: client.id,
      plate: sanitizedPlate,
      carModel: input.carModel,
      price: input.washPrice,
      netPrice,
      deliveryTime: new Date(input.deliveryTime),
      paymentMethod: input.paymentMethod,
      status: "pending",
    });

    // Final security check before saving
    WashSchema.parse({
      ...wash,
      deliveryTime: wash.deliveryTime.toISOString()
    });

    const savedWash = await this.washRepository.save(wash);

    return {
      success: true,
      client,
      wash: savedWash,
    };
  }
}

