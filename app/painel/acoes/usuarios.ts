"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/painel/sessao";
import { registrar } from "@/lib/dados";

type R = { ok: true } | { ok: false; erro: string };
type Papel = "admin" | "comercial";
type Perfil = { user_id: string; email: string; nome: string; papel: Papel; ativo: boolean };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const papelValido = (p: unknown): p is Papel => p === "admin" || p === "comercial";

export async function criarUsuario(d: { nome: string; email: string; senha: string; papel: Papel }): Promise<R> {
  const u = await exigirAdmin();
  const nome = String(d?.nome ?? "").trim().slice(0, 80);
  const email = String(d?.email ?? "").trim().toLowerCase();
  const senha = String(d?.senha ?? "");
  if (nome.length < 2) return { ok: false, erro: "Preencha o nome." };
  if (!EMAIL.test(email) || email.length > 160) return { ok: false, erro: "E-mail inválido." };
  if (senha.length < 8) return { ok: false, erro: "A senha inicial precisa de pelo menos 8 caracteres." };
  if (senha.length > 72) return { ok: false, erro: "A senha pode ter no máximo 72 caracteres." };
  if (!papelValido(d?.papel)) return { ok: false, erro: "Escolha o papel." };

  const db = supabaseAdmin();
  const { data: existe } = await db.from("perfis").select("user_id").eq("email", email).maybeSingle();
  if (existe) return { ok: false, erro: "Já existe um usuário com esse e-mail. Reative ou troque o papel na lista." };

  let id: string;
  const { data: criado, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error || !criado?.user) {
    // Conta no Auth sem perfil (ex.: perfil apagado): reaproveita e troca a senha
    if (!error || !/already|registered|exists/i.test(error.message)) return { ok: false, erro: "Não foi possível criar o usuário agora. Tente de novo." };
    const { data: lista } = await db.auth.admin.listUsers({ perPage: 1000 });
    const achado = lista?.users.find((x) => x.email?.toLowerCase() === email);
    if (!achado) return { ok: false, erro: "Esse e-mail já está em uso no login, mas não foi encontrado." };
    const { error: e2 } = await db.auth.admin.updateUserById(achado.id, { password: senha, user_metadata: { nome } });
    if (e2) return { ok: false, erro: "Não foi possível criar o usuário agora. Tente de novo." };
    id = achado.id;
  } else id = criado.user.id;

  const { error: ep } = await db.from("perfis").upsert({ user_id: id, email, nome, papel: d.papel, ativo: true });
  if (ep) {
    if (criado?.user) await db.auth.admin.deleteUser(id);
    return { ok: false, erro: "Não foi possível salvar o perfil. Tente de novo." };
  }
  await registrar(null, "usuario_criado", { user_id: id, email, nome, papel: d.papel }, u.id);
  revalidatePath("/painel/ajustes");
  return { ok: true };
}

export async function alterarUsuario(userId: string, mudanca: { papel?: Papel; ativo?: boolean }): Promise<R> {
  const u = await exigirAdmin();
  if (!UUID.test(String(userId ?? ""))) return { ok: false, erro: "Usuário inválido." };
  const novoPapel = mudanca?.papel;
  const novoAtivo = mudanca?.ativo;
  if (novoPapel !== undefined && !papelValido(novoPapel)) return { ok: false, erro: "Papel inválido." };
  if (novoAtivo !== undefined && typeof novoAtivo !== "boolean") return { ok: false, erro: "Situação inválida." };
  if (novoPapel === undefined && novoAtivo === undefined) return { ok: true };

  if (userId === u.id) {
    if (novoAtivo === false) return { ok: false, erro: "Você não pode desativar a própria conta." };
    if (novoPapel === "comercial") return { ok: false, erro: "Você não pode tirar o próprio acesso de administrador." };
  }

  const db = supabaseAdmin();
  const { data: alvo } = await db.from("perfis").select("user_id, email, nome, papel, ativo").eq("user_id", userId).maybeSingle<Perfil>();
  if (!alvo) return { ok: false, erro: "Usuário não encontrado." };

  const depois = { papel: novoPapel ?? alvo.papel, ativo: novoAtivo ?? alvo.ativo };
  const eraAdminAtivo = alvo.papel === "admin" && alvo.ativo;
  const continuaAdminAtivo = depois.papel === "admin" && depois.ativo;
  if (eraAdminAtivo && !continuaAdminAtivo) {
    const { count } = await db.from("perfis").select("user_id", { count: "exact", head: true }).eq("papel", "admin").eq("ativo", true).neq("user_id", userId);
    if (!count) return { ok: false, erro: "Precisa ficar pelo menos um administrador ativo." };
  }

  const { error } = await db.from("perfis").update(depois).eq("user_id", userId);
  if (error) return { ok: false, erro: "Não foi possível salvar agora. Tente de novo." };
  await registrar(null, "usuario_alterado", { user_id: userId, email: alvo.email, antes: { papel: alvo.papel, ativo: alvo.ativo }, depois }, u.id);
  revalidatePath("/painel/ajustes");
  return { ok: true };
}
