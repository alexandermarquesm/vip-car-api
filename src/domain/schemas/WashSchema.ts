import { z } from "zod";

export const PaymentSchema = z.object({
  method: z.enum(["money", "card", "pix", "convenio", "credit_card", "debit_card"]),
  amount: z.number().positive("O valor deve ser positivo")
});

// Entity validation schema
export const WashSchema = z.object({
  clientId: z.string().min(20, "ID do cliente inválido").or(z.any()), // Permissivo para entidades em memória
  plate: z.string().regex(/^[A-Z]{3}\d[A-Z\d]\d{2}$/, "Placa inválida"),
  carModel: z.string().max(30),
  price: z.number().min(0),
  deliveryTime: z.any(),
  status: z.enum(["pending", "completed", "cancelled"]).optional().default("pending"),
  paymentMethod: z.string().optional(),
  payments: z.array(PaymentSchema).optional().default([])
});

// Request validation schemas
export const CreateWashSchema = z.object({
  body: z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    phone: z.string().min(10, "Telefone inválido").max(15).regex(/^\d+$/, "Apenas números no telefone"),
    plate: z.string().regex(/^[A-Z]{3}\d[A-Z\d]\d{2}$/, "Placa inválida"),
    carModel: z.string().max(30),
    washPrice: z.number().min(0),
    deliveryTime: z.string().or(z.date()),
    paymentMethod: z.string().optional(),
  })
});


export const UpdateWashStatusSchema = z.object({
  params: z.object({
    id: z.string().min(20, "ID inválido")
  }),
  body: z.object({
    status: z.enum(["pending", "completed", "cancelled"]),
    paymentMethod: z.string().optional(),
    payments: z.array(PaymentSchema).optional()
  })
});

export const UpdateWashPriceSchema = z.object({
  params: z.object({
    id: z.string().min(20, "ID inválido")
  }),
  body: z.object({
    price: z.number().min(0)
  })
});

export const DeleteWashSchema = z.object({
  params: z.object({
    id: z.string().min(20, "ID inválido")
  })
});


export type WashInput = z.infer<typeof WashSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;


