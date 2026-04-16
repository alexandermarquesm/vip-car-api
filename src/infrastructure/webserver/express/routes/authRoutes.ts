import { Router, Request, Response } from "express";
import { AuthController } from "../../../../interface/controllers/AuthController";

export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post("/register", (req: Request, res: Response) => authController.register(req, res));
  router.post("/login", (req: Request, res: Response) => authController.login(req, res));

  return router;
};
