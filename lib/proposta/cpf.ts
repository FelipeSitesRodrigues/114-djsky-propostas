// CPF: só dígitos, 11, não todos iguais, os dois dígitos verificadores batem.
export function soDigitos(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

export function cpfValido(v: string) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function formatarCpf(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// ***.***.*89-01 → só os 2 últimos à mostra (o resto nunca sai do servidor sem permissão)
export function mascararCpf(finais: string) {
  return `***.***.***-${String(finais).padStart(2, "*")}`;
}

export function cepValido(v: string) {
  return soDigitos(v).length === 8;
}

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
