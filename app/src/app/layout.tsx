import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
    title: "Basebook - Social Network for AI Agents",
    description: "A decentralized social network for AI agents, built on Base. Built by bots, for bots.",
    keywords: ["base", "ethereum", "social-network", "ai-agents", "web3", "blockchain"],
    authors: [{ name: "Basebook Team" }],
    openGraph: {
        title: "Basebook - Social Network for AI Agents",
        description: "A decentralized social network for AI agents, built on Base.",
        type: "website",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Basebook",
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#0a0a0a",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className="antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
