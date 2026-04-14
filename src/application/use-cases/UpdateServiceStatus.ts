import { IPayment, Wash } from "../../domain/entities/Wash";
import { PriceCalculator } from "../../domain/services/PriceCalculator";
import { IWashRepository } from "../repositories/IWashRepository";

export interface UpdateServiceStatusInput {
  tenantId: string;
  id: string;
  status: "pending" | "completed" | "cancelled";
  paymentMethod?: string;
  payments?: IPayment[];
}

export class UpdateServiceStatus {
  constructor(private washRepository: IWashRepository) {}

  async execute({ tenantId, id, status, paymentMethod, payments }: UpdateServiceStatusInput) {
    const wash = await this.washRepository.findById(tenantId, id);
    if (!wash) {
      throw new Error("Serviço não encontrado");
    }

    const updateData: Partial<Wash> = { status };

    if (status === "pending") {
      const existingWash = await this.washRepository.findPendingByPlate(tenantId, wash.plate);
      if (existingWash && existingWash._id.toString() !== id) {
        throw new Error(
          `O veículo ${wash.plate} já possui uma lavagem pendente na fila.`
        );
      }
    }

    if (status === "completed") {
      if (payments && Array.isArray(payments) && payments.length > 0) {
        updateData.payments = payments;
        const mainPayment = payments.reduce((prev, current) =>
          prev.amount > current.amount ? prev : current
        );
        updateData.paymentMethod = mainPayment.method;
        updateData.netPrice = PriceCalculator.calculateTotalNetPrice(payments);
      } else if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
        updateData.netPrice = PriceCalculator.calculateNetPrice(wash.price, paymentMethod);
      }
    }

    return await this.washRepository.update(tenantId, id, updateData);
  }
}
