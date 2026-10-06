import { supabase } from '../lib/supabase';
import { executar } from './erros';

// Endereço de retorno dos links de e-mail (confirmação e redefinição de senha)
const urlDoApp = rota => `${window.location.origin}${import.meta.env.BASE_URL}#${rota}`;

export async function obterSessao() {
  const { data } = await executar(supabase.auth.getSession());
  return data.session;
}

export function aoMudarSessao(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => callback(sessao));
  return () => data.subscription.unsubscribe();
}

export async function entrar(email, senha) {
  const { data } = await executar(supabase.auth.signInWithPassword({ email: email.trim(), password: senha }));
  return data.session;
}

// Devolve a sessão quando a confirmação de e-mail está desligada; senão, null
export async function criarConta({ nome, email, senha }) {
  const { data } = await executar(supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: { data: { nome_exibicao: nome.trim() }, emailRedirectTo: urlDoApp('/heroi') }
  }));
  return data.session;
}

export async function enviarRedefinicaoSenha(email) {
  await executar(supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: urlDoApp('/configuracoes') }));
}

export async function sair() {
  await executar(supabase.auth.signOut());
}
