import { z } from "zod";

export const ClientSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
  phone: z.string().min(10, "Telefone inválido").max(15).regex(/^\d+$/, "Apenas números no telefone"),
  vehicles: z.array(z.object({
    plate: z.string().regex(/^[A-Z]{3}\d[A-Z\d]\d{2}$/, "Formato de placa inválido"),
    carModel: z.string().max(30, "Modelo muito longo")
  })).optional().default([])
});



export const CreateClientSchema = z.object({
  body: z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
    phone: z.string().min(10, "Telefone inválido").max(15).regex(/^\d+$/, "Apenas números no telefone"),
    plate: z.string().regex(/^[A-Z]{3}\d[A-Z\d]\d{2}$/, "Formato de placa inválido").optional(),
    carModel: z.string().max(30, "Modelo muito longo").optional(),
  })
});



export const UpdateClientSchema = z.object({
  params: z.object({
    id: z.string().min(20, "ID inválido")
  }),
  body: ClientSchema.partial()

});

export const DeleteClientSchema = z.object({
  params: z.object({
    id: z.string().min(20, "ID inválido")
  })
});

export type ClientInput = z.infer<typeof ClientSchema>;



