import { Request, Response } from "express";
import Stripe from "stripe";
import { ConfirmPayment } from "../../application/use-cases/Subscription/ConfirmPayment";
import { loadEnv } from "../../main/config/env";
import WebhookEventModel from "../../infrastructure/database/mongoose-models/WebhookEventModel";

export class WebhookController {
  constructor(private confirmPayment: ConfirmPayment) {}

  async handleStripe(req: Request, res: Response): Promise<void> {
    const env = loadEnv();
    const secret = env.STRIPE_SECRET_KEY;
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!secret || !webhookSecret) {
      console.error("[Webhook Stripe] ERRO: STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET não configurados.");
      res.status(500).json({ error: "Webhook secret não configurado" });
      return;
    }

    const stripe = new Stripe(secret);
    const signature = req.get("stripe-signature") || "";

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err: any) {
      console.error("[Webhook Stripe] Assinatura inválida:", err.message);
      res.status(401).json({ error: "Assinatura inválida" });
      return;
    }

    // Idempotência — evita processar o mesmo evento duas vezes
    const alreadyProcessed = await WebhookEventModel.findOne({ eventId: event.id });
    if (alreadyProcessed) {
      console.log(`[Webhook Stripe] Evento já processado: ${event.id}`);
      res.status(200).send("OK");
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Record<string, any>;
        const tenantId = session.metadata?.tenantId as string | undefined;
        const plan = (session.metadata?.plan as "basic" | "pro") || "basic";

        if (!tenantId) {
          console.error("[Webhook Stripe] tenantId não encontrado nos metadados.");
          res.status(400).json({ error: "tenantId ausente nos metadados" });
          return;
        }

        await this.confirmPayment.execute({
          tenantId,
          externalCustomerId: String(session.customer),
          externalSubscriptionId: String(session.subscription),
          variantId: plan,
          status: "active",
        });

        console.log(`[Webhook Stripe] Assinatura ativada | Tenant: ${tenantId} | Plano: ${plan}`);

      } else if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Record<string, any>;
        const tenantId = subscription.metadata?.tenantId as string | undefined;

        if (tenantId) {
          await this.confirmPayment.execute({
            tenantId,
            externalCustomerId: String(subscription.customer),
            externalSubscriptionId: subscription.id,
            variantId: subscription.metadata?.plan || "basic",
            status: "cancelled",
          });
          console.log(`[Webhook Stripe] Assinatura cancelada | Tenant: ${tenantId}`);
        }

      } else if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Record<string, any>;
        const tenantId = subscription.metadata?.tenantId as string | undefined;
        const status = subscription.status as string;

        if (tenantId) {
          const currentPeriodEnd = subscription.current_period_end
            ? new Date((subscription.current_period_end as number) * 1000)
            : undefined;

          await this.confirmPayment.execute({
            tenantId,
            externalCustomerId: String(subscription.customer),
            externalSubscriptionId: subscription.id,
            variantId: subscription.metadata?.plan || "basic",
            status,
            currentPeriodEnd,
          });
          console.log(`[Webhook Stripe] Assinatura atualizada | Tenant: ${tenantId} | Status: ${status}`);
        }
      }

      await WebhookEventModel.create({ eventId: event.id });
      res.status(200).send("OK");
    } catch (error: any) {
      console.error(`[Webhook Stripe] Erro ao processar evento: ${error.message}`);
      res.status(500).json({ error: "Erro ao processar evento" });
      return;
    }

  }
}
