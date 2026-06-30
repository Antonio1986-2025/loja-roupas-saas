import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

const EMAIL = "jaquelinepalma0501@gmail.com";
const NOVA_SENHA = "California@2026";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.log(`❌ Usuário ${EMAIL} não encontrado`);
    return;
  }

  const hash = await bcrypt.hash(NOVA_SENHA, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  });

  console.log(`✅ Senha redefinida com sucesso!\n`);
  console.log(`  Email: ${EMAIL}`);
  console.log(`  Nova senha: ${NOVA_SENHA}\n`);
  console.log(`  → Faça login em: https://loja-roupas-saas-production.up.railway.app`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
