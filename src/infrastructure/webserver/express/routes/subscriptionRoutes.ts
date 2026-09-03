import { Router } from "express";
import { SubscriptionController } from "../../../../interface/controllers/SubscriptionController";
import { asyncHandler } from "../utils/AsyncHandler";

export const createSubscriptionRoutes = (subscriptionController: SubscriptionController): Router => {
  const router = Router();

  router.post("/checkout", asyncHandler((req: any, res: any) => subscriptionController.checkout(req, res)));
  router.post("/portal", asyncHandler((req: any, res: any) => subscriptionController.portal(req, res)));
  router.post("/google-play/verify", asyncHandler((req: any, res: any) => subscriptionController.verifyGooglePlayPurchase(req, res)));

  return router;
};
