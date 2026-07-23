import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeSpace | Shared shopping lists for your AI",
  description: "Manage shared shopping lists across all your spaces with ChatGPT, Claude, and the AI agent you already use.",
  icons: {
    icon: "/homespace-logo.png",
    shortcut: "/homespace-logo.png",
    apple: "/homespace-logo.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
