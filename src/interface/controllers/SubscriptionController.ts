import { Response } from "express";
import { AuthenticatedRequest } from "../../infrastructure/webserver/express/middlewares/AuthMiddleware";
import { CreateCheckout } from "../../application/use-cases/Subscription/CreateCheckout";
import { CreateCustomerPortal } from "../../application/use-cases/Subscription/CreateCustomerPortal";
import {
  GooglePlayBilling,
  GooglePlayBillingError,
} from "../../application/use-cases/Subscription/GooglePlayBilling";

export class SubscriptionController {
  constructor(
    private createCheckout: CreateCheckout,
    private createCustomerPortal: CreateCustomerPortal,
    private googlePlayBilling: GooglePlayBilling,
  ) {}

  async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: "Usuário não autenticado ou sem tenantId." });
      return;
    }

    const plan = req.body?.plan === "pro" ? "pro" : "basic";
    try {
      const { checkoutUrl } = await this.createCheckout.execute({
        tenantId: req.user.tenantId,
        plan,
      });

      res.status(200).json({ url: checkoutUrl });
    } catch (error: any) {
      console.error("[SubscriptionController] Erro ao gerar checkout:", error.message);
      res.status(500).json({ error: "Não foi possível gerar a sessão de checkout no momento. Verifique se o servidor está configurado corretamente." });
    }
  }

  async verifyGooglePlayPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.tenantId) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const purchaseToken = typeof req.body?.purchaseToken === "string"
      ? req.body.purchaseToken.trim()
      : "";

    try {
      const result = await this.googlePlayBilling.verifyForTenant({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        role: req.user.role,
        productId,
        purchaseToken,
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (error instanceof GooglePlayBillingError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("[GooglePlay] Falha inesperada ao validar compra:", error);
      res.status(500).json({ error: "Não foi possível validar a compra no momento." });
    }
  }

  async portal(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: "Usuário não autenticado ou sem tenantId." });
      return;
    }

    try {
      const { portalUrl } = await this.createCustomerPortal.execute({
        tenantId: req.user.tenantId,
      });

      res.status(200).json({ url: portalUrl });
    } catch (error: any) {
      console.error("[SubscriptionController] Erro ao gerar portal:", error.message);
      res.status(400).json({ error: error.message || "Não foi possível gerar a sessão do portal no momento." });
    }
  }
}
