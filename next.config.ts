import type { NextConfig } from "next";

// Sem analytics nem script de terceiro. A página da proposta não manda a URL (que tem o código
// exclusivo) pra nenhum site de fora: Referrer-Policy no-referrer em tudo.
const seguranca = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { authInterrupts: true },
  async headers() {
    return [
      { source: "/:caminho*", headers: seguranca },
      { source: "/(p|painel)/:caminho*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
