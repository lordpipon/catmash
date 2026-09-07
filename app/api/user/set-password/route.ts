import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, account } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const userId = session.user.id;
	const body = await req.json().catch(() => null);
	const newPassword = body?.newPassword;
	if (!newPassword || typeof newPassword !== "string") {
		return NextResponse.json({ error: "New password is required" }, { status: 400 });
	}
	if (newPassword.length < 8) {
		return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
	}

	const [existing] = await db()
		.select({ id: account.id })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
		.limit(1);

	if (existing) {
		const [cred] = await db()
			.select({ hasPw: account.password })
			.from(account)
			.where(eq(account.id, existing.id))
			.limit(1);
		if (cred?.hasPw) {
			return NextResponse.json({ error: "Password already set" }, { status: 400 });
		}
	}

	const ctx = await auth.$context;
	const passwordHash = await ctx.password.hash(newPassword);

	if (existing) {
		await db().update(account).set({ password: passwordHash }).where(eq(account.id, existing.id));
	} else {
		await ctx.internalAdapter.linkAccount({
			userId,
			providerId: "credential",
			accountId: userId,
			password: passwordHash,
		});
	}

	return NextResponse.json({ success: true });
}