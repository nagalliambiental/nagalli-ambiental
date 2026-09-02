import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { catalogos } from "@/lib/mtr-ima";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(catalogos());
}
