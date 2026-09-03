import { ITenantRepository } from "../../repositories/ITenantRepository";

interface ConfirmPaymentRequest {
  tenantId: string;
  externalCustomerId: string;
  externalSubscriptionId: string;
  variantId: string;
  currentPeriodEnd?: Date;
  status?: string;
}

export class ConfirmPayment {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(request: ConfirmPaymentRequest): Promise<void> {
    const { tenantId, externalCustomerId, externalSubscriptionId, variantId, currentPeriodEnd, status } = request;

    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new Error("Tenant não encontrado para confirmação de pagamento");
    }

    tenant.plan = "monthly";
    tenant.subscriptionStatus = (status as any) || "active";
    tenant.externalCustomerId = externalCustomerId;
    tenant.externalSubscriptionId = externalSubscriptionId;
    tenant.billingProvider = "stripe";
    tenant.variantId = variantId;
    
    if (currentPeriodEnd) {
      tenant.currentPeriodEnd = currentPeriodEnd;
    }

    await this.tenantRepository.save(tenant);
  }
}
