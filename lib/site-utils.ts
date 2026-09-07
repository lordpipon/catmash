import { NextResponse } from "next/server";

export function isSiteClosed(): boolean {
	return process.env.NEXT_PUBLIC_CLOSE_SITE === "true";
}

export const SITE_CLOSED_MESSAGE = "Catmash is no longer active. The site is in read-only archive mode.";

export function siteClosedResponse() {
	return NextResponse.json({ error: SITE_CLOSED_MESSAGE }, { status: 403 });
}
