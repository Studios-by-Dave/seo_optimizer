import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Password must be 8+ characters." }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const org = await prisma.organization.create({
    data: { name: name ? `${name}'s Agency` : "My Agency" },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? null,
      passwordHash: await hashPassword(password),
      organizationId: org.id,
    },
  });

  await createSession(user);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
