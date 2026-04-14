import { Router } from "express";
import { ClientController } from "../../../../interface/controllers/ClientController";
import { subscriptionMiddleware } from "../middlewares/SubscriptionMiddleware";

export const createClientRoutes = (clientController: ClientController): Router => {
  const router = Router();

  router.use(subscriptionMiddleware);

  router.get("/", (req, res) => clientController.list(req, res));
  router.post("/", (req, res) => clientController.register(req, res));
  router.get("/search", (req, res) => clientController.search(req, res));
  router.put("/:id", (req, res) => clientController.update(req, res));
  router.delete("/:id", (req, res) => clientController.delete(req, res));

  return router;
};
