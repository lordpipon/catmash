import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BannedCheck } from "./components/BannedCheck";
import "./globals.css";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mash.catplay.org";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "Catmash",
		template: "%s | Catmash",
	},
	description:
		"Join timed matches and collaborate with dozens of players to create short, chaotic videos on a shared timeline. No skill required — just fun and creativity.",
	keywords: [
		"multiplayer video editor",
		"collaborative editing",
		"video game",
		"real-time editing",
		"group video creation",
		"social video",
		"chaotic editing",
		"timed matches",
		"creative chaos",
		"video collaboration",
		"catmash",
		"catplay",
	],
	authors: [{ name: "Catplay" }],
	creator: "Catplay",
	publisher: "Catplay",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: "/favicon-48x48.png",
		apple: "/apple-touch-icon.png",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: siteUrl,
		siteName: "Catmash",
		title: "Catmash",
		description:
			"Join timed matches and collaborate with dozens of players to create short, chaotic videos on a shared timeline. No skill required — just fun and creativity.",
	},
	twitter: {
		card: "summary",
		title: "Catmash",
		description:
			"Join timed matches and collaborate with dozens of players to create short, chaotic videos on a shared timeline. No skill required — just fun and creativity.",
	},
	applicationName: "Catmash",
	appleWebApp: {
		capable: true,
		title: "Catmash",
		statusBarStyle: "default",
	},
	formatDetection: {
		telephone: false,
	},
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#000000" },
		{ media: "(prefers-color-scheme: dark)", color: "#ffffff" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
			<head>
				{process.env.NODE_ENV === "development" && (
					<script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" />
				)}
			</head>
			<body className="antialiased">
				<BannedCheck>{children}</BannedCheck>
				<Toaster />
			</body>
		</html>
	);
}
