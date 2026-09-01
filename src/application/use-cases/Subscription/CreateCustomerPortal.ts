import Stripe from "stripe";
import { loadEnv } from "../../../main/config/env";
import { ITenantRepository } from "../../repositories/ITenantRepository";

interface CreateCustomerPortalRequest {
  tenantId: string;
}

interface CreateCustomerPortalResponse {
  portalUrl: string;
}

export class CreateCustomerPortal {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(request: CreateCustomerPortalRequest): Promise<CreateCustomerPortalResponse> {
    const { tenantId } = request;
    const env = loadEnv();

    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error("[CreateCustomerPortal] ERRO: STRIPE_SECRET_KEY não configurada.");
      throw new Error("Configuração de pagamento incompleta no servidor.");
    }

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new Error("Tenant não encontrado.");
    }

    if (!tenant.externalCustomerId) {
      throw new Error("Você possui uma assinatura ativa manualmente (ou de cortesia) que não está vinculada ao Stripe.");
    }

    const stripe = new Stripe(secretKey);

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.externalCustomerId,
        return_url: "vipercar://success", // Redireciona de volta para o app
      });

      if (!session.url) {
        throw new Error("Stripe não retornou a URL do portal.");
      }

      return { portalUrl: session.url };
    } catch (error: any) {
      console.error("[CreateCustomerPortal] Exceção:", error.message);

      // Clientes criados no ambiente de testes da Stripe não existem no
      // ambiente ativo (e vice-versa). Não exponha a mensagem técnica nem o
      // identificador do cliente ao aplicativo.
      if (error?.code === "resource_missing" && error?.param === "customer") {
        throw new Error(
          "Esta conta possui uma assinatura criada no ambiente de teste. O gerenciamento ficará disponível após uma assinatura ativa ser criada na versão de produção.",
        );
      }

      throw error;
    }
  }
}
