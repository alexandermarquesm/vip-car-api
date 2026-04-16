import { Router, Response } from "express";
import { ServiceController } from "../../../../interface/controllers/ServiceController";
import { subscriptionMiddleware } from "../middlewares/SubscriptionMiddleware";
import { uploadMiddleware } from "../middlewares/UploadMiddleware";
import { AuthenticatedRequest } from "../middlewares/AuthMiddleware";

export const createServiceRoutes = (serviceController: ServiceController): Router => {
  const router = Router();

  router.use(subscriptionMiddleware);

  router.post("/scan", uploadMiddleware.single("image"), (req: AuthenticatedRequest, res: Response) => serviceController.scanSheet(req, res));
  router.post("/", (req: AuthenticatedRequest, res: Response) => serviceController.register(req, res));
  router.get("/", (req: AuthenticatedRequest, res: Response) => serviceController.list(req, res));
  router.patch("/:id/status", (req: AuthenticatedRequest, res: Response) => serviceController.updateStatus(req, res));
  router.patch("/:id/price", (req: AuthenticatedRequest, res: Response) => serviceController.updatePrice(req, res));
  router.delete("/:id", (req: AuthenticatedRequest, res: Response) => serviceController.delete(req, res));
  router.get("/backup", (req: AuthenticatedRequest, res: Response) => serviceController.backup(req, res));
  
  return router;
};
