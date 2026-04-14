import { Router } from "express";
import { ServiceController } from "../../../../interface/controllers/ServiceController";
import { subscriptionMiddleware } from "../middlewares/SubscriptionMiddleware";

export const createServiceRoutes = (serviceController: ServiceController): Router => {
  const router = Router();

  router.use(subscriptionMiddleware);

  router.post("/", (req, res) => serviceController.register(req, res));
  router.get("/", (req, res) => serviceController.list(req, res));
  router.patch("/:id/status", (req, res) => serviceController.updateStatus(req, res));
  router.patch("/:id/price", (req, res) => serviceController.updatePrice(req, res));
  router.delete("/:id", (req, res) => serviceController.delete(req, res));
  router.get("/backup", (req, res) => serviceController.backup(req, res));
  
  return router;
};
