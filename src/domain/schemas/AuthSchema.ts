import { z } from "zod";

export const RegisterUserSchema = z.object({
  body: z.object({
    tenantName: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres"),
    userName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    passwordRaw: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    document: z.string().optional(),
  }),
});

export const LoginUserSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido"),
    passwordRaw: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  }),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>["body"];
export type LoginUserInput = z.infer<typeof LoginUserSchema>["body"];

