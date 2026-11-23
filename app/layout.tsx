import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SKY | Propostas", template: "%s | SKY" },
  description: "Propostas comerciais do DJ Sky.",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/favicon-32.png", apple: "/apple-touch-icon.png" },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#08070b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
