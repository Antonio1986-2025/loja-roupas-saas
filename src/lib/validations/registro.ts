import { z } from "zod";

export const registroSchema = z
  .object({
    nomeLoja: z
      .string()
      .min(2, "Nome da loja muito curto")
      .max(100, "Nome da loja muito longo"),
    nomeResponsavel: z
      .string()
      .min(2, "Nome do responsável muito curto")
      .max(200, "Nome muito longo"),
    email: z.string().email("Email inválido").max(200, "Email muito longo"),
    senha: z
      .string()
      .min(6, "A senha deve ter pelo menos 6 caracteres")
      .max(100, "Senha muito longa"),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

export type RegistroInput = z.infer<typeof registroSchema>;