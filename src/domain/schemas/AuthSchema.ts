import { z } from "zod";

export const RegisterUserSchema = z.object({
  body: z.object({
    tenantName: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres").optional(),
    userName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    passwordRaw: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    document: z.string().optional(),
    role: z.enum(["owner", "worker"]).optional().default("owner"),
    inviteCode: z.string().optional(),
    inviteToken: z.string()
      .min(32, "Token de convite inválido")
      .max(128, "Token de convite inválido")
      .regex(/^[A-Za-z0-9_-]+$/, "Token de convite inválido")
      .optional(),
  }).refine((data) => {
    if (data.role === "worker") {
      return (!!data.inviteToken && data.inviteToken.trim().length > 0) ||
        (!!data.inviteCode && data.inviteCode.trim().length > 0);
    }
    return !!data.tenantName && data.tenantName.trim().length > 0;
  }, {
    message: "Convite é obrigatório para colaboradores, e Nome da Empresa é obrigatório para proprietários.",
    path: ["inviteCode"],
  }),
});

export const LoginUserSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido"),
    passwordRaw: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  }),
});

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido"),
  }),
});

export const VerifyResetCodeSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido"),
    code: z.string().length(6, "O código deve ter 6 dígitos"),
  }),
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido"),
    code: z.string().length(6, "O código deve ter 6 dígitos"),
    passwordRaw: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  }),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>["body"];
export type LoginUserInput = z.infer<typeof LoginUserSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>["body"];
export type VerifyResetCodeInput = z.infer<typeof VerifyResetCodeSchema>["body"];
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>["body"];

