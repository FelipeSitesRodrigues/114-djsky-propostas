import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Só no painel: renova a sessão do Supabase (cookies) e manda pro login quem não tem sessão.
// A checagem de verdade (perfil ativo, papel) fica no servidor, em exigirUsuario().
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  const livre = caminho.startsWith("/painel/entrar") || caminho.startsWith("/painel/senha");
  if (!data?.claims && !livre) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel/entrar";
    url.search = caminho === "/painel" ? "" : `?volta=${encodeURIComponent(caminho + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return resposta;
}

export const config = { matcher: ["/painel/:path*"] };
