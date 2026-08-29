import Stripe from "stripe";
import { loadEnv } from "../../../main/config/env";

interface CreateCheckoutRequest {
  tenantId: string;
  plan: "basic" | "pro";
  redirectUrl?: string;
}

interface CreateCheckoutResponse {
  checkoutUrl: string;
}

export class CreateCheckout {
  async execute(request: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
    const { tenantId, plan, redirectUrl } = request;
    const env = loadEnv();

    const secretKey = env.STRIPE_SECRET_KEY;
    const priceId = plan === "pro"
      ? env.STRIPE_PRICE_ID_PRO
      : env.STRIPE_PRICE_ID_BASIC;

    if (!secretKey) {
      console.error("[CreateCheckout] ERRO: STRIPE_SECRET_KEY não configurada.");
      throw new Error("Configuração de pagamento incompleta no servidor.");
    }

    const stripe = new Stripe(secretKey);

    if (!priceId) {
      console.error(`[CreateCheckout] ERRO: Price ID não configurado para o plano ${plan}.`);
      throw new Error("Configuração de pagamento incompleta no servidor.");
    }

    try {
      let finalSuccessUrl = "vipercar://success";
      let finalCancelUrl = "vipercar://cancel";

      if (redirectUrl) {
        const isDev = env.NODE_ENV !== "production";
        const isValidAppScheme = redirectUrl.startsWith("vipercar://");
        const isValidExpoScheme = isDev && (redirectUrl.startsWith("exp://") || redirectUrl.startsWith("http://localhost") || redirectUrl.startsWith("http://192.168."));

        if (isValidAppScheme || isValidExpoScheme) {
          finalSuccessUrl = redirectUrl;
          finalCancelUrl = redirectUrl.replace("success", "cancel");
        } else {
          console.warn(`[CreateCheckout] URL de redirecionamento rejeitada por segurança: ${redirectUrl}`);
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        allow_promotion_codes: true,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        // O Price possui opções BRL/USD/EUR. O Stripe Checkout escolhe a
        // moeda compatível com a localização do cliente automaticamente.
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        // Passamos o tenantId e o plano nos metadados para o webhook
        metadata: {
          tenantId,
          plan,
        },
        subscription_data: {
          metadata: {
            tenantId,
            plan,
          },
        },
      });

      if (!session.url) {
        throw new Error("Stripe não retornou a URL de checkout.");
      }

      return { checkoutUrl: session.url };
    } catch (error: any) {
      console.error("[CreateCheckout] Exceção:", error.message);
      throw error;
    }
  }
}
