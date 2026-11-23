import { redirect } from "next/navigation";

// A raiz do domínio de propostas não mostra nada: quem é da equipe vai pro painel.
export default function Inicio() {
  redirect("/painel");
}
