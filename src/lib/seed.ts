import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

async function seed() {
  const senha = await bcrypt.hash("123456", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@nagalliambiental.com.br" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@nagalliambiental.com.br",
      senha,
      perfil: "socio",
    },
  });

  const tecnico = await prisma.usuario.upsert({
    where: { email: "tecnico@nagalliambiental.com.br" },
    update: {},
    create: {
      nome: "Técnico",
      email: "tecnico@nagalliambiental.com.br",
      senha,
      perfil: "tecnico",
    },
  });

  const orgao = await prisma.orgao.upsert({
    where: { sigla: "IAP" },
    update: {},
    create: { nome: "Instituto Água e Terra", sigla: "IAP" },
  });

  const orgao2 = await prisma.orgao.upsert({
    where: { sigla: "IBAMA" },
    update: {},
    create: { nome: "Instituto Brasileiro do Meio Ambiente", sigla: "IBAMA" },
  });

  const orgao3 = await prisma.orgao.upsert({
    where: { sigla: "SEMA" },
    update: {},
    create: { nome: "Secretaria do Meio Ambiente", sigla: "SEMA" },
  });

  const cliente = await prisma.cliente.upsert({
    where: { cnpj: "00.000.000/0001-91" },
    update: {},
    create: {
      apelido: "Construtora XYZ",
      razaoSocial: "Construtora XYZ Ltda",
      cnpj: "00.000.000/0001-91",
      telefone: "(41) 99999-9999",
      email: "contato@construtoraxyz.com.br",
      respLegal: "João Silva",
    },
  });

  const emp = await prisma.empreendimento.upsert({
    where: { id: 1 },
    update: {},
    create: {
      apelido: "Residencial Verde",
      endereco: "Rua das Flores, 123 - Curitiba/PR",
      descricao: "Residencial com 4 torres",
      latitude: -25.4284,
      longitude: -49.2733,
      clienteId: cliente.id,
    },
  });

  const legislacao = await prisma.legislacao.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: "Lei 12.651/2012",
      descricao: "Código Florestal Brasileiro",
      tipo: "federal",
      numero: "12.651/2012",
      data: new Date("2012-05-25"),
    },
  });

  const legislacao2 = await prisma.legislacao.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nome: "Resolução CONAMA 237/97",
      descricao: "Licenciamento Ambiental",
      tipo: "federal",
      numero: "237/97",
      data: new Date("1997-12-19"),
    },
  });

  const processo = await prisma.processo.create({
    data: {
      tipo: "Licença Prévia",
      orgaoId: orgao.id,
      sistema: "SGA",
      numProtocolo: "2025/00001",
      status: "em_andamento",
      validade: new Date("2026-12-31"),
      empreendimentoId: emp.id,
      observacoes: "Processo de licenciamento ambiental",
    },
  });

  await prisma.timelineProcesso.create({
    data: {
      status: "protocolado",
      descricao: "Processo protocolado no órgão ambiental",
      processoId: processo.id,
      usuarioId: admin.id,
    },
  });

  await prisma.timelineProcesso.create({
    data: {
      status: "em_andamento",
      descricao: "Em análise técnica",
      processoId: processo.id,
      usuarioId: admin.id,
    },
  });

  await prisma.exigencia.create({
    data: {
      descricao: "Apresentar levantamento florístico da área",
      prazo: new Date("2026-09-15"),
      antecedenciaDias: 15,
      processoId: processo.id,
    },
  });

  await prisma.responsavel.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: "Maria Oliveira",
      email: "maria@nagalliambiental.com.br",
      telefone: "(41) 98888-8888",
      funcao: "Engenheira Ambiental",
      cargaHoras: 40,
      usuarioId: tecnico.id,
    },
  });

  console.log("Seed concluído com sucesso!");
  console.log(`Admin: admin@nagalliambiental.com.br / 123456`);
  console.log(`Técnico: tecnico@nagalliambiental.com.br / 123456`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
