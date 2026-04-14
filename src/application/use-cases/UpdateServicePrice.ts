import { Wash } from "../../domain/entities/Wash";
import { PriceCalculator } from "../../domain/services/PriceCalculator";
import { IWashRepository } from "../repositories/IWashRepository";

export interface UpdateServicePriceInput {
  tenantId: string;
  id: string;
  price: number;
}

export class UpdateServicePrice {
  constructor(private washRepository: IWashRepository) {}

  async execute({ tenantId, id, price }: UpdateServicePriceInput) {
    const finalPrice = price || 0;

    const wash = await this.washRepository.findById(tenantId, id);
    if (!wash) {
      throw new Error("Serviço não encontrado");
    }

    const updateData: Partial<Wash> = {
      price: finalPrice,
      netPrice: wash.paymentMethod
        ? PriceCalculator.calculateNetPrice(finalPrice, wash.paymentMethod)
        : finalPrice,
    };

    if (
      wash.payments &&
      wash.payments.length > 0 &&
      wash.status === "completed"
    ) {
      const feeRatio = wash.netPrice / wash.price;
      updateData.netPrice = Number((finalPrice * feeRatio).toFixed(2));
    }

    return await this.washRepository.update(tenantId, id, updateData);
  }
}
