/**
 * Módulo de minimização de dados conforme LGPD (Lei nº 13.709/2018, art. 6º, III e art. 23).
 * Descarta dados pessoais desnecessários à triagem judicial (CPF, e-mails, telefones pessoais),
 * mantendo apenas o necessário à identificação das partes, patronos e enquadramento jurídico.
 */

export function sanitizarParteLGPD(parte) {
  if (!parte || typeof parte !== 'object') return parte;

  const clonada = Object.assign({}, parte);

  // Remove dados de contato pessoal e identificadores desnecessários de pessoa física
  delete clonada.emails;
  delete clonada.email;
  delete clonada.cpf;
  delete clonada.dddCelular;
  delete clonada.numeroCelular;

  if (clonada.tipoDocumento === 'CPF') {
    delete clonada.documento;
  }

  // Sanitiza dados aninhados de pessoa física
  if (clonada.pessoaFisica && typeof clonada.pessoaFisica === 'object') {
    const pf = Object.assign({}, clonada.pessoaFisica);
    delete pf.login;
    delete pf.cpf;
    delete pf.dataNascimento;
    delete pf.nomeGenitora;
    delete pf.nomeGenitor;
    clonada.pessoaFisica = pf;
  }

  // Sanitiza representantes (advogados)
  if (Array.isArray(clonada.representantes)) {
    clonada.representantes = clonada.representantes.map(r => {
      const rep = Object.assign({}, r);
      delete rep.cpf;
      delete rep.documento;
      delete rep.emails;
      delete rep.email;
      delete rep.dddCelular;
      delete rep.numeroCelular;
      return rep;
    });
  }

  return clonada;
}

export function sanitizarProcessoLGPD(registroBruto) {
  if (!registroBruto || typeof registroBruto !== 'object') return registroBruto;

  const clonado = Object.assign({}, registroBruto);

  if (clonado.partes && typeof clonado.partes === 'object') {
    const novasPartes = {};
    for (const polo of Object.keys(clonado.partes)) {
      const lista = clonado.partes[polo] || [];
      novasPartes[polo] = lista.map(sanitizarParteLGPD);
    }
    clonado.partes = novasPartes;
  }

  return clonado;
}
