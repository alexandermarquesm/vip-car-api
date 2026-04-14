import { z } from "zod";

export const PaymentSchema = z.object({
  method: z.enum(["money", "card", "pix", "convenio", "credit_card", "debit_card"]),
  amount: z.number().positive("O valor deve ser positivo")
});

export const WashSchema = z.object({
  clientId: z.string().uuid("ID do cliente inválido"),
  plate: z.string().regex(/^[A-Z]{3}-?\d[A-Z\d]\d{2}$/, "Placa inválida"),
  carModel: z.string().max(30),
  price: z.number().min(0),
  netPrice: z.number().min(0).optional(),
  deliveryTime: z.date().or(z.string().transform((val) => new Date(val))),
  status: z.enum(["pending", "completed", "cancelled"]).optional().default("pending"),
  paymentMethod: z.string().optional(),
  payments: z.array(PaymentSchema).optional().default([])
});

export type WashInput = z.infer<typeof WashSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;
