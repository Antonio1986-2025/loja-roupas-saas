import { z } from "zod";

export const createCategoriaSchema = z.object({
  nome: z.string().min(1, "Nome e obrigatorio").max(100, "Nome muito longo (maximo 100 caracteres)"),
});

export const updateCategoriaSchema = createCategoriaSchema;

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;