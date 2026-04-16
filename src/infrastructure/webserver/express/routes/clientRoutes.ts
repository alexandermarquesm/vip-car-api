import { Router, Response } from "express";
import { ClientController } from "../../../../interface/controllers/ClientController";
import { subscriptionMiddleware } from "../middlewares/SubscriptionMiddleware";
import { AuthenticatedRequest } from "../middlewares/AuthMiddleware";

export const createClientRoutes = (clientController: ClientController): Router => {
  const router = Router();

  router.use(subscriptionMiddleware);

  router.get("/", (req: AuthenticatedRequest, res: Response) => clientController.list(req, res));
  router.post("/", (req: AuthenticatedRequest, res: Response) => clientController.register(req, res));
  router.get("/search", (req: AuthenticatedRequest, res: Response) => clientController.search(req, res));
  router.put("/:id", (req: AuthenticatedRequest, res: Response) => clientController.update(req, res));
  router.delete("/:id", (req: AuthenticatedRequest, res: Response) => clientController.delete(req, res));

  return router;
};
