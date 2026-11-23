import type { Metadata } from "next";
import "./painel.css";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel SKY" },
  robots: { index: false, follow: false },
};

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return children;
}
