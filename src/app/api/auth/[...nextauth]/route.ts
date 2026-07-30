import { handlers } from "@/lib/auth";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { nextauth: ["signin"] },
    { nextauth: ["callback"] },
    { nextauth: ["session"] },
    { nextauth: ["csrf"] },
    { nextauth: ["providers"] },
    { nextauth: ["signout"] },
    { nextauth: ["verify-request"] },
    { nextauth: ["error"] },
  ];
}

export const { GET, POST } = handlers;
