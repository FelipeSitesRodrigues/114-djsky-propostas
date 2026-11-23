export type Estado = { tipo: "parado" } | { tipo: "indo" } | { tipo: "ok" } | { tipo: "erro"; erro: string };

// Linha de retorno dos formulários de Ajustes: erro em vermelho, "Salvo." em verde
export function Retorno({ estado }: { estado: Estado }) {
  if (estado.tipo === "erro") return <p className="aviso aviso--erro" role="alert">{estado.erro}</p>;
  if (estado.tipo === "ok") return <p className="aviso aviso--ok" role="status">Salvo.</p>;
  return <span />;
}
