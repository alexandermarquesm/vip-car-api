import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../infrastructure/webserver/express/middlewares/AuthMiddleware";
import { CreateCheckout } from "../../application/use-cases/Subscription/CreateCheckout";
import { CreateCustomerPortal } from "../../application/use-cases/Subscription/CreateCustomerPortal";

export class SubscriptionController {
  constructor(
    private createCheckout: CreateCheckout,
    private createCustomerPortal: CreateCustomerPortal
  ) {}

  async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: "Usuário não autenticado ou sem tenantId." });
      return;
    }

    const plan = req.body?.plan === "pro" ? "pro" : "basic";
    const redirectUrl = req.body?.redirectUrl;

    try {
      const { checkoutUrl } = await this.createCheckout.execute({
        tenantId: req.user.tenantId,
        plan,
        redirectUrl,
      });

      res.status(200).json({ url: checkoutUrl });
    } catch (error: any) {
      console.error("[SubscriptionController] Erro ao gerar checkout:", error.message);
      res.status(500).json({ error: "Não foi possível gerar a sessão de checkout no momento. Verifique se o servidor está configurado corretamente." });
    }
  }

  async successPage(req: Request, res: Response): Promise<void> {
    const redirectTarget = (req.query.redirect as string) || "vipercar://success";
    const isCancelled = req.query.cancelled === "true";

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isCancelled ? "Pagamento Cancelado" : "Pagamento Confirmado"} | Viper Car</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }
    .icon-container {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px auto;
    }
    .icon-success {
      background: #10B981;
      color: #FFFFFF;
    }
    .icon-cancelled {
      background: #EF4444;
      color: #FFFFFF;
    }
    .icon {
      font-size: 36px;
      font-weight: bold;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 12px;
      color: #FFFFFF;
    }
    p {
      color: #94A3B8;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      background: #3B82F6;
      color: #FFFFFF;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      display: block;
      transition: background-color 0.2s, transform 0.1s;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
    }
    .btn:hover {
      background: #2563EB;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .btn-cancelled {
      background: #64748B;
    }
    .btn-cancelled:hover {
      background: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container ${isCancelled ? "icon-cancelled" : "icon-success"}">
      <span class="icon">${isCancelled ? "✕" : "✓"}</span>
    </div>
    <h1>${isCancelled ? "Pagamento Cancelado" : "Assinatura Ativada! 🎉"}</h1>
    <p>${isCancelled ? "O processo de pagamento foi cancelado. Você pode tentar novamente a qualquer momento." : "Seu pagamento foi confirmado com sucesso e todos os recursos do Viper Car já estão liberados."}</p>
    
    <a class="btn ${isCancelled ? "btn-cancelled" : ""}" href="${redirectTarget}">
      Voltar para o Aplicativo
    </a>
  </div>

  <script>
    // Tenta redirecionar automaticamente após 1.5s
    setTimeout(function() {
      window.location.href = "${redirectTarget}";
    }, 1500);
  </script>
</body>
</html>
    `);
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
