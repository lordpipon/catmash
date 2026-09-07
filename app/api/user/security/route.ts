import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, account } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const userId = session.user.id;
	const accounts = await db()
		.select({ providerId: account.providerId, hasPassword: account.password })
		.from(account)
		.where(eq(account.userId, userId));

	const hasPassword = accounts.some((a) => a.providerId === "credential" && !!a.hasPassword);
	const googleLinked = accounts.some((a) => a.providerId === "google");

	return NextResponse.json({
		hasPassword,
		googleLinked,
		canUnlinkGoogle: googleLinked && (hasPassword || accounts.length > 1),
	});
}