import { Router } from "express";
import { AuthController } from "../../../../interface/controllers/AuthController";
import { asyncHandler } from "../utils/AsyncHandler";
import { validate } from "../middlewares/ValidationMiddleware";
import { 
  RegisterUserSchema, 
  LoginUserSchema,
  ForgotPasswordSchema,
  VerifyResetCodeSchema,
  ResetPasswordSchema
} from "../../../../domain/schemas/AuthSchema";

import { RequestHandler } from "express";

export const createAuthRoutes = (authController: AuthController, authMiddleware: any, authLimiter: RequestHandler): Router => {
  const router = Router();

  router.post(
    "/register", 
    authLimiter,
    validate(RegisterUserSchema), 
    asyncHandler((req: any, res: any) => authController.register(req, res))
  );

  router.post(
    "/invite/validate",
    authLimiter,
    asyncHandler((req: any, res: any) => authController.validateInvite(req, res))
  );

  router.post(
    "/login", 
    authLimiter,
    validate(LoginUserSchema), 
    asyncHandler((req: any, res: any) => authController.login(req, res))
  );

  router.post(
    "/verify-email",
    authLimiter,
    asyncHandler((req: any, res: any) => authController.verifyEmail(req, res))
  );

  router.post(
    "/resend-code",
    authLimiter,
    asyncHandler((req: any, res: any) => authController.resendCode(req, res))
  );

  router.post(
    "/forgot-password",
    authLimiter,
    validate(ForgotPasswordSchema),
    asyncHandler((req: any, res: any) => authController.forgotPassword(req, res))
  );

  router.post(
    "/verify-reset-code",
    authLimiter,
    validate(VerifyResetCodeSchema),
    asyncHandler((req: any, res: any) => authController.verifyResetCode(req, res))
  );

  router.post(
    "/reset-password",
    authLimiter,
    validate(ResetPasswordSchema),
    asyncHandler((req: any, res: any) => authController.resetPassword(req, res))
  );

  router.get(
    "/me",
    authMiddleware,
    asyncHandler((req: any, res: any) => authController.me(req, res))
  );

  router.patch(
    "/tenant/fees",
    authMiddleware,
    asyncHandler((req: any, res: any) => authController.updateTenantFees(req, res))
  );

  return router;
}
