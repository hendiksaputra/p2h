import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const dynamic = "force-dynamic";

/**
 * Tanpa Google Fonts: build/server tanpa egress ke fonts.googleapis.com
 * (mis. firewall IDCloudHost). Tetap isi --font-* untuk @theme di globals.css.
 */
const FONT_VARS: CSSProperties = {
  ["--font-geist-sans" as string]: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    '"Noto Sans"',
    "sans-serif",
  ].join(", "),
  ["--font-geist-mono" as string]: [
    "ui-monospace",
    "SFMono-Regular",
    '"SF Mono"',
    "Menlo",
    "Consolas",
    '"Liberation Mono"',
    "monospace",
  ].join(", "),
};

export const metadata: Metadata = {
  title: "P2H Kendaraan",
  description: "Pemeriksaan dan pemeliharaan harian unit kendaraan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" style={FONT_VARS}>
      <body className="min-h-dvh font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
