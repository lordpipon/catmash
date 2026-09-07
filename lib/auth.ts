import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "./db";
import { user as userTable } from "./db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { uploadFile } from "./fileStorage";

async function uploadAvatarToStorage(googleImageUrl: string, userId: string): Promise<string | null> {
	try {
		const highResUrl = googleImageUrl.replace(/=s\d+-c$/, "=s256-c");

		const response = await fetch(highResUrl);
		if (!response.ok) {
			console.error("Failed to fetch Google avatar:", response.statusText);
			return null;
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		const contentType = response.headers.get("content-type") || "image/jpeg";
		const extension = contentType.includes("png") ? "png" : "jpg";
		const fileName = `avatars/${userId}.${extension}`;

		const uploadResult = await uploadFile(buffer, fileName, contentType);

		if (!uploadResult || !uploadResult.fileId || !uploadResult.fileName) {
			console.error("Upload to file storage failed: invalid upload result");
			return null;
		}

		return `/api/media/${fileName}`;
	} catch (error) {
		console.error("Failed to upload avatar to file storage:", error);
		return null;
	}
}

export const auth = betterAuth({
	database: drizzleAdapter(getDb(), {
		provider: "pg",
	}),

	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
	},

	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			prompt: "select_account",
		},
	},

	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
	},

	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					if (user.image && user.image.includes("googleusercontent.com")) {
						const storageUrl = await uploadAvatarToStorage(user.image, user.id);
						if (storageUrl) {
							const database = getDb();
							await database.update(userTable).set({ image: storageUrl }).where(eq(userTable.id, user.id));
						}
					}
				},
			},
		},
	},

	rateLimit: {
		window: 60,
		max: 100,
	},

	plugins: [nextCookies()],

	trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") || [],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

export async function getServerSession() {
	return auth.api.getSession({
		headers: await headers(),
	});
}

export async function requireAuth() {
	const session = await getServerSession();
	if (!session) {
		throw new Error("Unauthorized");
	}
	return session;
}
