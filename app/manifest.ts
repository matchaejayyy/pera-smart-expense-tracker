import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pera — Smart Expense & Budget Tracker",
    short_name: "Pera",
    description: "Track spending, accounts, savings, budgets, and recurring payments.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f4f5ed",
    theme_color: "#121311",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/pera-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pera-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pera-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/pera-icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}
