import { IWashRepository } from "../repositories/IWashRepository";

export interface ListServicesInput {
  tenantId: string;
  status?: string;
  date?: string;
  search?: string;
}

export class ListServices {
  constructor(private washRepository: IWashRepository) {}

  async execute({ tenantId, status, date, search }: ListServicesInput) {
    const serviceStatus = status || "pending";
    const filter: any = { tenantId };

    // If not searching for EVERYTHING, apply status filter
    // Default: exclude cancelled unless status is 'all'
    if (serviceStatus !== "all") {
      filter.status = serviceStatus;
    } else {
      // For History view, we might want to include everything or at least pending+completed
      // filter.status = { $ne: "cancelled" }; // Let's keep it matching current behavior unless user asks
    }

    // Only apply date filter if NOT searching
    if (date && !search) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.deliveryTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const result = await this.washRepository.findWithClientInfo(filter, search);
    return result;
  }
}
