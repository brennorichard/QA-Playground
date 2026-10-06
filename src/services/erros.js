// Converte erros do Supabase (Auth e PostgREST) em mensagens em português.
// As funções RPC já lançam mensagens em português (código P0001); o resto é traduzido aqui.

export class ErroServico extends Error {
  constructor(mensagem, { codigo = null, original = null } = {}) {
    super(mensagem);
    this.name = 'ErroServico';
    this.codigo = codigo;
    this.original = original;
  }
}

const CONSTRAINTS = {
  herois_nome_unico: 'Já existe um herói com esse nome. Escolha outro.',
  herois_nome_check: 'O nome do herói precisa ter de 3 a 40 caracteres.',
  perfis_nome_exibicao_check: 'O nome de exibição precisa ter de 3 a 20 caracteres.',
  pontos_de_atributo_validos: 'A soma dos atributos precisa ser 20 (ou 22 para Humano).'
};

const AUTH = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme o seu e-mail antes de entrar. O link de confirmação foi enviado no cadastro.',
  user_already_exists: 'Já existe uma conta com esse e-mail. Entre ou use "Esqueci minha senha".',
  weak_password: 'A senha precisa ter pelo menos 6 caracteres.',
  over_email_send_rate_limit: 'O limite de e-mails foi atingido. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'
};

export function traduzirErro(erro, padrao = 'Algo deu errado. Tente de novo em instantes.') {
  if (!erro) return new ErroServico(padrao);
  if (erro instanceof ErroServico) return erro;
  const codigo = erro.code || null;
  const texto = `${erro.message || ''} ${erro.details || ''}`;

  // Falha de rede (fetch rejeitado)
  if (erro.name === 'TypeError' || /Failed to fetch|NetworkError|fetch failed/i.test(texto)) {
    return new ErroServico('Não foi possível falar com o servidor. Verifique a conexão e tente de novo.', { codigo: 'rede', original: erro });
  }
  // Auth
  if (erro.name === 'AuthApiError' || erro.__isAuthError) {
    return new ErroServico(AUTH[codigo] || (erro.status === 429 ? AUTH.over_request_rate_limit : padrao), { codigo, original: erro });
  }
  // PostgREST / Postgres
  if (codigo === 'P0001') return new ErroServico(erro.message, { codigo, original: erro });
  if (codigo === '23505' || codigo === '23514') {
    const chave = Object.keys(CONSTRAINTS).find(c => texto.includes(c));
    if (chave) return new ErroServico(CONSTRAINTS[chave], { codigo, original: erro });
    if (codigo === '23505') return new ErroServico('Esse valor já está em uso.', { codigo, original: erro });
  }
  if (codigo === '42501') return new ErroServico('Você não tem permissão para fazer isso.', { codigo, original: erro });
  return new ErroServico(padrao, { codigo, original: erro });
}

// Executa uma chamada do supabase-js e devolve data, ou lança ErroServico
export async function executar(promessa, padrao) {
  let resposta;
  try {
    resposta = await promessa;
  } catch (e) {
    throw traduzirErro(e, padrao);
  }
  if (resposta.error) throw traduzirErro(resposta.error, padrao);
  return resposta;
}
