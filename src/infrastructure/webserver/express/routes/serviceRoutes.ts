import { Router } from "express";
import { ServiceController } from "../../../../interface/controllers/ServiceController";
import { subscriptionMiddleware } from "../middlewares/SubscriptionMiddleware";
import { uploadMiddleware } from "../middlewares/UploadMiddleware";
import { asyncHandler } from "../utils/AsyncHandler";
import { validate } from "../middlewares/ValidationMiddleware";
import { 
  CreateWashSchema, 
  UpdateWashStatusSchema, 
  UpdateWashPriceSchema, 
  DeleteWashSchema 
} from "../../../../domain/schemas/WashSchema";

export const createServiceRoutes = (serviceController: ServiceController): Router => {
  const router = Router();

  router.use(subscriptionMiddleware);

  router.post(
    "/scan", 
    uploadMiddleware.single("image"), 
    asyncHandler((req: any, res: any) => serviceController.scanSheet(req, res))
  );

  router.post(
    "/", 
    validate(CreateWashSchema), 
    asyncHandler((req: any, res: any) => serviceController.register(req, res))
  );

  router.get("/", asyncHandler((req: any, res: any) => serviceController.list(req, res)));

  router.patch(
    "/:id/status", 
    validate(UpdateWashStatusSchema), 
    asyncHandler((req: any, res: any) => serviceController.updateStatus(req, res))
  );

  router.patch(
    "/:id/price", 
    validate(UpdateWashPriceSchema), 
    asyncHandler((req: any, res: any) => serviceController.updatePrice(req, res))
  );

  router.delete(
    "/:id", 
    validate(DeleteWashSchema), 
    asyncHandler((req: any, res: any) => serviceController.delete(req, res))
  );

  router.get("/backup", asyncHandler((req: any, res: any) => serviceController.backup(req, res)));
  
  return router;
};

