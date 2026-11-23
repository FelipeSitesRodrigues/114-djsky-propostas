// Categorias aceitas pela tabela servicos (check no banco). Usado na página, nos formulários e
// na validação das ações.
export const CATEGORIAS = [
  ["show", "Show"],
  ["dj", "DJ"],
  ["ballet", "Ballet"],
  ["efeitos", "Efeitos"],
  ["banda", "Banda"],
  ["estrutura", "Estrutura"],
  ["outros", "Outros"],
] as const;

export type Categoria = (typeof CATEGORIAS)[number][0];

export function nomeCategoria(c: string) {
  return CATEGORIAS.find(([v]) => v === c)?.[1] ?? c;
}

export function categoriaValida(c: string): c is Categoria {
  return CATEGORIAS.some(([v]) => v === c);
}
