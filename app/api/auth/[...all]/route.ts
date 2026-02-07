import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { isSiteClosed, SITE_CLOSED_MESSAGE } from "@/lib/site-utils";

const handler = toNextJsHandler(auth);

export async function GET(req: Request) {
	if (isSiteClosed()) {
		return NextResponse.json({ error: SITE_CLOSED_MESSAGE }, { status: 403 });
	}
	return handler.GET(req);
}

export async function POST(req: Request) {
	if (isSiteClosed()) {
		return NextResponse.json({ error: SITE_CLOSED_MESSAGE }, { status: 403 });
	}
	return handler.POST(req);
}
