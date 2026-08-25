import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#121311",
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "Pera — Smart Expense & Budget Tracker";
  const description = "Track every penny, plan better budgets, and grow your savings with intelligent insights.";

  return {
    metadataBase,
    title,
    description,
    applicationName: "Pera",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/pera-icon-192.png", apple: "/pera-icon-180.png" },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Pera" },
    openGraph: { title, description, type: "website", images: [{ url: new URL("/og.png", metadataBase), width: 1672, height: 941, alt: "Pera smart expense and budget tracker" }] },
    twitter: { card: "summary_large_image", title, description, images: [new URL("/og.png", metadataBase)] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
