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
  phone: string;
  plate: string;
  carModel: string;
  washPrice: string | number;
  deliveryTime: string | Date;
  paymentMethod?: string;
}

export class RegisterService {
  constructor(
    private clientRepository: IClientRepository,
    private washRepository: IWashRepository
  ) {}

  async execute(input: RegisterServiceInput) {
    // Validate and sanitize input via Zod
    // Note: for partial inputs or slightly different shapes, we can use specific schemas
    // but here we'll use the core WashSchema rules.
    const sanitizedPlate = input.plate ? input.plate.trim().toUpperCase() : "";
    const sanitizedPhone = input.phone ? input.phone.replace(/\D/g, "") : "";

    // 1. Validations via Schema (Manual parse for specific fields if needed)
    // Plate regex is already in schema
    
    if (input.carModel && input.carModel.length > 30) {
      throw new Error("O modelo do carro deve ter no máximo 30 caracteres.");
    }

    // Check for duplicate pending wash
    const existingWash = await this.washRepository.findPendingByPlate(input.tenantId, sanitizedPlate);
    if (existingWash) {
      throw new Error(
        `O veículo ${sanitizedPlate} já possui uma lavagem pendente na fila.`
      );
    }

    // 2. Find or Create Client
    let client = null;
    if (sanitizedPhone) {
      client = await this.clientRepository.findByPhone(input.tenantId, sanitizedPhone);
    }

    if (client) {
      client.name = input.name;
      if (input.plate) {
        client.addVehicle(sanitizedPlate, input.carModel);
      }
      await this.clientRepository.save(client);
    } else {
      const newClient = new Client({
        tenantId: input.tenantId,
        name: input.name,
        phone: sanitizedPhone,
        vehicles: input.plate ? [{ plate: sanitizedPlate, carModel: input.carModel }] : [],
      });
      client = await this.clientRepository.save(newClient);
    }

    // 3. Create Wash Record
    const numericPrice = this._parsePrice(input.washPrice);
    const netPrice = PriceCalculator.calculateNetPrice(numericPrice, input.paymentMethod);

    const wash = new Wash({
      tenantId: input.tenantId,
      clientId: client.id,
      plate: sanitizedPlate,
      carModel: input.carModel,
      price: numericPrice,
      netPrice,
      deliveryTime: new Date(input.deliveryTime),
      paymentMethod: input.paymentMethod,
      status: "pending",
    });

    // Final security check before saving
    WashSchema.parse({
      ...wash,
      deliveryTime: wash.deliveryTime.toISOString() // Zod expects string or Date depending on schema
    });

    const savedWash = await this.washRepository.save(wash);

    return {
      success: true,
      client,
      wash: savedWash,
    };
  }

  private _parsePrice(price: string | number): number {
    if (typeof price === "number") return price;
    if (!price) return 0;
    
    return parseFloat(
      price.replace("R$", "").replace(".", "").replace(",", ".")
    ) || 0;
  }
}
