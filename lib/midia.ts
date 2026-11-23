// Biblioteca de fotos da proposta: fotos reais de show do Sky (vêm do site). A capa de cada tipo
// de evento sai daqui; no editor dá pra trocar.
export const FOTOS = [
  { id: "casamento", arquivo: "/img/galeria-casino-1260.webp", rotulo: "Pista com faíscas" },
  { id: "15-anos", arquivo: "/img/galeria-rq43-1260.webp", rotulo: "Ballet no palco" },
  { id: "formatura", arquivo: "/img/galeria-formatura-1260.webp", rotulo: "Formatura" },
  { id: "corporativo", arquivo: "/img/galeria-telao-1260.webp", rotulo: "Telão SKY" },
  { id: "festa", arquivo: "/img/galeria-bracos-1260.webp", rotulo: "Braços abertos pra pista" },
  { id: "festival", arquivo: "/img/palco-panorama-1400.webp", rotulo: "Festival, palco inteiro" },
  { id: "telao-verde", arquivo: "/img/palco-telao-1400.webp", rotulo: "Telão verde" },
  { id: "moto", arquivo: "/img/galeria-rq26-1260.webp", rotulo: "Moto no telão" },
  { id: "raio", arquivo: "/img/galeria-rq30-1260.webp", rotulo: "Raio magenta" },
  { id: "cabine", arquivo: "/img/galeria-rq7-1260.webp", rotulo: "Na cabine" },
  { id: "palco-azul", arquivo: "/img/galeria-rq4-1260.webp", rotulo: "Palco azul" },
  { id: "pre-caju", arquivo: "/img/galeria-rq47-1260.webp", rotulo: "Palco do festival" },
  { id: "multidao", arquivo: "/img/formato-casas-720.webp", rotulo: "De costas pra multidão" },
  { id: "sobre", arquivo: "/img/sobre-1000.webp", rotulo: "Cabine, apontando" },
] as const;

export function foto(id: string) {
  return FOTOS.find((f) => f.id === id) ?? FOTOS[5];
}
