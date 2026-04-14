import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./AuthMiddleware";
import { MongooseTenantRepository } from "../../../../interface/repositories/MongooseTenantRepository";

export const subscriptionMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Usuário não autenticado" });
    return;
  }

  try {
    const tenantRepository = new MongooseTenantRepository();
    const tenant = await tenantRepository.findById(req.user.tenantId);

    if (!tenant) {
      res.status(404).json({ error: "Estabelecimento não encontrado" });
      return;
    }

    const now = new Date();
    const isTrialActive = tenant.plan === "trial" && tenant.trialEndsAt > now;
    const isSubscriptionActive = tenant.subscriptionStatus === "active";

    if (!isTrialActive && !isSubscriptionActive) {
      res.status(403).json({
        error: "Assinatura necessária",
        code: "SUBSCRIPTION_REQUIRED",
        trialEndsAt: tenant.trialEndsAt,
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Erro ao validar assinatura" });
  }
};
