import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.usuario.updateMany({
    data: { termosAceitosEm: null },
  });
  console.log(`Termos resetados para ${result.count} usuário(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
