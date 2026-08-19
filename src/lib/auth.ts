import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logAuditoria } from "./audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
        });

        if (!usuario || !usuario.ativo) return null;

        const senhaCorreta = await bcrypt.compare(
          credentials.password as string,
          usuario.senha
        );

        if (!senhaCorreta) return null;

        return {
          id: String(usuario.id),
          email: usuario.email,
          name: usuario.nome,
          perfil: usuario.perfil,
          termosAceitosEm: usuario.termosAceitosEm ? usuario.termosAceitosEm.toISOString() : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.perfil = u.perfil as string;
        token.id = u.id as string;
        token.termosAceitosEm = u.termosAceitosEm ?? null;
      }
      if (trigger === "update") {
        const id = Number(token.id);
        if (id) {
          const u = await prisma.usuario.findUnique({ where: { id }, select: { termosAceitosEm: true } });
          token.termosAceitosEm = u?.termosAceitosEm ? u.termosAceitosEm.toISOString() : null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as unknown as Record<string, unknown>;
        user.perfil = token.perfil;
        user.id = token.id;
        user.termosAceitosEm = token.termosAceitosEm ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      const id = Number((user as { id?: string }).id);
      if (id) {
        await logAuditoria(
          "LOGIN",
          "Sessao",
          id,
          { email: user.email },
          id
        );
      }
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const id = Number((token as { id?: string } | null)?.id);
      if (id) {
        await logAuditoria(
          "LOGOUT",
          "Sessao",
          id,
          undefined,
          id
        );
      }
    },
  },
  session: {
    strategy: "jwt",
  },
});
