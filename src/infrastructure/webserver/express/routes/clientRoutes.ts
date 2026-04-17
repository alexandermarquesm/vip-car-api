import { Router } from "express";
import { ClientController } from "../../../../interface/controllers/ClientController";
import { subscriptionMiddleware } from "../middlewares/SubscriptionMiddleware";
import { asyncHandler } from "../utils/AsyncHandler";
import { validate } from "../middlewares/ValidationMiddleware";
import { CreateClientSchema, UpdateClientSchema, DeleteClientSchema } from "../../../../domain/schemas/ClientSchema";

export const createClientRoutes = (clientController: ClientController): Router => {
  const router = Router();

  router.use(subscriptionMiddleware);

  router.get("/", asyncHandler((req: any, res: any) => clientController.list(req, res)));
  router.get("/search", asyncHandler((req: any, res: any) => clientController.search(req, res)));
  
  router.post(
    "/", 
    validate(CreateClientSchema), 
    asyncHandler((req: any, res: any) => clientController.register(req, res))
  );

  router.put(
    "/:id", 
    validate(UpdateClientSchema), 
    asyncHandler((req: any, res: any) => clientController.update(req, res))
  );

  router.delete(
    "/:id", 
    validate(DeleteClientSchema), 
    asyncHandler((req: any, res: any) => clientController.delete(req, res))
  );

  return router;
};

