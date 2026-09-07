import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, user } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const body = await req.json().catch(() => null);
	const newEmail = typeof body?.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
		return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
	}
	if (newEmail === session.user.email) {
		return NextResponse.json({ error: "Email is the same" }, { status: 400 });
	}

	const existing = await db()
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, newEmail))
		.limit(1);
	if (existing.length > 0) {
		return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
	}

	await db().update(user).set({ email: newEmail }).where(eq(user.id, session.user.id));

	return NextResponse.json({ success: true });
}