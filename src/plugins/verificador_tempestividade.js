/**
 * Plugin Independente para Verificação de Tempestividade de Recursos Trabalhistas.
 * Baseado no modelo de dados do PJe (documentos_lote) e na legislação processual:
 * - CLT art. 775 (dias úteis)
 * - Lei 11.419/2006 art. 4º §§ 3º e 4º (regras do DJEN: D -> D+1 publicação -> D+2 início)
 * - CPC art. 183 e 180 (prazo em dobro para Fazenda Pública e MPT)
 * - CPC art. 218 § 4º (tempestividade de recurso prematuro/antecipado)
 */

// Feriados nacionais fixos (mês-dia)
const FERIADOS_NACIONAIS_FIXOS = new Set([
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // N. Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia da Consciência Negra
  '12-25'  // Natal
]);

/**
 * Verifica se uma data é dia útil.
 * @param {Date} data
 * @returns {boolean}
 */
export function ehDiaUtil(data) {
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false; // 0=Domingo, 6=Sábado

  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  const chave = `${mm}-${dd}`;

  return !FERIADOS_NACIONAIS_FIXOS.has(chave);
}

/**
 * Adiciona N dias úteis a uma data inicial.
 * @param {Date} dataInicial
 * @param {number} diasUteis
 * @returns {Date}
 */
export function adicionarDiasUteis(dataInicial, diasUteis) {
  let cur = new Date(dataInicial.getTime());
  let contagem = 0;

  while (contagem < diasUteis) {
    cur.setDate(cur.getDate() + 1);
    if (ehDiaUtil(cur)) {
      contagem++;
    }
  }

  return cur;
}

/**
 * Calcula a quantidade de dias úteis entre duas datas (exclusivo inicio, inclusivo fim).
 * @param {Date} dataInicio
 * @param {Date} dataFim
 * @returns {number}
 */
export function contarDiasUteisEntre(dataInicio, dataFim) {
  let cur = new Date(dataInicio.getTime());
  let contagem = 0;

  while (cur < dataFim) {
    cur.setDate(cur.getDate() + 1);
    if (cur > dataFim) break;
    if (ehDiaUtil(cur)) {
      contagem++;
    }
  }

  return contagem;
}

/**
 * A partir de um documento de recurso, localiza o ato decisório (Sentença/Decisão/Despacho/
 * Acórdão) imediatamente anterior a ele e a certidão de publicação no DJEN dentro do
 * intervalo (ato recorrido, protocolo do recurso]. Em execução o ato agravável costuma vir
 * tipado como Despacho (cod 7003) no PJe, não Sentença/Decisão; em 2º grau o ato é Acórdão
 * (cod 7000) — os quatro tipos entram na busca do ato recorrido. Restringir a certidão a
 * essa janela evita ancorar a contagem do prazo numa publicação de uma fase completamente
 * diferente do processo.
 */
function _localizarAtoRecorridoECertidao(docRecurso, docsOrdenados) {
  const dtProtocoloRecurso = new Date(docRecurso.juntadoEm || docRecurso.criadoEm);

  let docSentenca = null;
  for (let i = docsOrdenados.length - 1; i >= 0; i--) {
    const d = docsOrdenados[i];
    if (d === docRecurso) continue;
    const dt = new Date(d.juntadoEm || d.criadoEm);
    if (dt > dtProtocoloRecurso) continue;

    const cod = String(d.codigoTipoDocumento || '');
    const tipo = (d.tipo || '').toUpperCase();

    if (cod === '7007' || cod === '7001' || cod === '7003' || cod === '7000' || tipo === 'SENTENÇA' || tipo === 'DECISÃO' || tipo === 'DESPACHO' || tipo === 'ACÓRDÃO') {
      docSentenca = d;
      break;
    }
  }

  if (!docSentenca) {
    return { docSentenca: null, docCertidaoDjen: null };
  }

  const dtSentenca = new Date(docSentenca.juntadoEm || docSentenca.criadoEm);

  let docCertidaoDjen = null;
  for (let i = docsOrdenados.length - 1; i >= 0; i--) {
    const d = docsOrdenados[i];
    const dt = new Date(d.juntadoEm || d.criadoEm);
    if (dt > dtProtocoloRecurso) continue;
    if (dt < dtSentenca) break;

    const cod = String(d.codigoTipoDocumento || '');
    const titulo = (d.titulo || '').toUpperCase();
    const signatario = (d.signatario || '').toUpperCase();

    if (
      (cod === '7323' && titulo.includes('DJEN')) ||
      titulo.includes('PUBLICAÇÃO NO DJEN') ||
      titulo.includes('PUBLICACAO NO DJEN') ||
      (cod === '7323' && signatario.includes('PROCEDIMENTO AUTOMATIZADO - PJE'))
    ) {
      docCertidaoDjen = d;
      break;
    }
  }

  return { docSentenca, docCertidaoDjen };
}

/**
 * Avalia a tempestividade de um único recurso da timeline contra o ato que ele
 * efetivamente impugna (achado por _localizarAtoRecorridoECertidao).
 */
function _avaliarRecurso(docRecurso, docsOrdenados, ehFazendaPublica) {
  const dtProtocoloRecurso = new Date(docRecurso.juntadoEm || docRecurso.criadoEm);
  const tipoRecurso = docRecurso.tipo || docRecurso.titulo || 'Recurso Trabalhista';

  const { docSentenca, docCertidaoDjen } = _localizarAtoRecorridoECertidao(docRecurso, docsOrdenados);

  if (!docSentenca) {
    return {
      status: 'SENTENCA_NAO_ENCONTRADA',
      tempestivo: null,
      tipoRecurso,
      dataProtocolo: dtProtocoloRecurso.toISOString(),
      detalhes: 'Não foi possível identificar o ato decisório recorrido imediatamente anterior a este recurso.'
    };
  }

  const dtSentenca = new Date(docSentenca.juntadoEm || docSentenca.criadoEm);

  // Definição do prazo legal (CLT art. 775 / CPC art. 183): ED tem 5 dias, RO/AP têm 8.
  // Usa `tipo` (campo estruturado), não `titulo` (texto livre) — mesmo motivo do filtro em
  // docsRecurso: título livre classifica errado cópias/anexos que citam "embargos" no nome.
  const cod = String(docRecurso.codigoTipoDocumento || '');
  const tipoDoc = (docRecurso.tipo || '').toUpperCase();
  const ehEmbargos = cod === '49' || tipoDoc.includes('EMBARGOS DE DECLARAÇÃO') || tipoDoc.includes('EMBARGOS DE DECLARACAO');
  const prazoBase = ehEmbargos ? 5 : 8;
  const prazoMaximoDias = ehFazendaPublica ? prazoBase * 2 : prazoBase;

  // Se o recurso foi protocolado ANTES da certidão do DJEN ou mesmo no dia da sentença
  // Conforme CPC art. 218, § 4º: recurso interposto antes do início do prazo é tempestivo
  if (!docCertidaoDjen || dtProtocoloRecurso <= new Date(docCertidaoDjen.juntadoEm || docCertidaoDjen.criadoEm)) {
    return {
      status: 'TEMPESTIVO',
      tempestivo: true,
      prematuro: true,
      prazoMaximoDias,
      tipoRecurso,
      dataAtoRecorrido: dtSentenca.toISOString(),
      dataDisponibilizacaoDJEN: docCertidaoDjen ? new Date(docCertidaoDjen.juntadoEm).toISOString() : null,
      termoInicial: 'Imediato (pré-publicação / ciência inequívoca)',
      termoFinal: 'Art. 218, § 4º, CPC',
      dataProtocolo: dtProtocoloRecurso.toISOString(),
      diasUteisDecorridos: 0,
      ehFazendaPublica,
      detalhes: `Recurso interposto antes ou no momento da publicação oficial no DJEN (CPC, art. 218, § 4º). Tempestivo.`
    };
  }

  // Cálculo do DJEN segundo Lei 11.419/2006: D = Data de Disponibilização (juntadoEm da certidão)
  const dtDisponibilizacao = new Date(docCertidaoDjen.juntadoEm || docCertidaoDjen.criadoEm);

  // Data de Publicação = 1º dia útil após disponibilização
  let dtPublicacao = new Date(dtDisponibilizacao.getTime());
  do {
    dtPublicacao.setDate(dtPublicacao.getDate() + 1);
  } while (!ehDiaUtil(dtPublicacao));

  // Termo Inicial (Dia 1 do prazo) = 1º dia útil após a publicação
  let dtTermoInicial = new Date(dtPublicacao.getTime());
  do {
    dtTermoInicial.setDate(dtTermoInicial.getDate() + 1);
  } while (!ehDiaUtil(dtTermoInicial));

  // Termo Final = Termo Inicial + (prazoMaximoDias - 1) dias úteis
  const dtTermoFinal = adicionarDiasUteis(dtTermoInicial, prazoMaximoDias - 1);
  dtTermoFinal.setHours(23, 59, 59, 999);

  // Contagem de dias úteis decorridos do termo inicial até o protocolo
  let diasDecorridos = 0;
  if (dtProtocoloRecurso < dtTermoInicial) {
    diasDecorridos = 0;
  } else {
    // Conta os dias úteis entre dtTermoInicial e dtProtocoloRecurso inclusive
    diasDecorridos = contarDiasUteisEntre(new Date(dtTermoInicial.getTime() - 86400000), dtProtocoloRecurso);
  }

  const tempestivo = dtProtocoloRecurso <= dtTermoFinal;

  return {
    status: tempestivo ? 'TEMPESTIVO' : 'INTEMPESTIVO',
    tempestivo,
    prematuro: false,
    prazoMaximoDias,
    tipoRecurso,
    dataAtoRecorrido: dtSentenca.toISOString(),
    dataDisponibilizacaoDJEN: dtDisponibilizacao.toISOString(),
    dataPublicacaoDJEN: dtPublicacao.toISOString(),
    termoInicial: dtTermoInicial.toISOString(),
    termoFinal: dtTermoFinal.toISOString(),
    dataProtocolo: dtProtocoloRecurso.toISOString(),
    diasUteisDecorridos: diasDecorridos,
    ehFazendaPublica,
    detalhes: tempestivo
      ? `Protocolado em ${diasDecorridos}º dia útil (prazo de ${prazoMaximoDias} dias úteis${ehFazendaPublica ? ' - em dobro' : ''}). Tempestivo.`
      : `Protocolado após o vencimento do ${prazoMaximoDias}º dia útil. Excedeu em ${diasDecorridos - prazoMaximoDias} dias úteis.`
  };
}

/**
 * Analisa a tempestividade de TODOS os recursos (RO/AP/ED) constantes na lista de
 * documentos de um processo. Um processo de execução com histórico longo pode ter várias
 * fases recursais, cada uma contra um ato diferente — analisar só "o" recurso, escolhido
 * por posição na timeline, pareia errado sempre que há mais de um.
 * @param {Array<Object>} documentos - Array de documentos retornados pela API do PJe
 * @param {boolean} ehFazendaPublica - Flag indicando se a parte recorrente goza de prerrogativa fazendária
 * @returns {Object} Parecer de tempestividade do pior recurso (ou do mais recente, se nenhum
 *   for intempestivo), com o array `recursos` trazendo o parecer individual de cada um.
 */
export function analisarTempestividadeProcesso(documentos = [], ehFazendaPublica = false) {
  if (!Array.isArray(documentos) || documentos.length === 0) {
    return {
      status: 'SEM_DOCUMENTOS',
      tempestivo: null,
      detalhes: 'Nenhum documento disponível para análise.'
    };
  }

  // Ordena documentos cronologicamente (juntadoEm ASC)
  const docsOrdenados = documentos.slice().sort((a, b) => {
    const da = new Date(a.juntadoEm || a.criadoEm || 0);
    const db = new Date(b.juntadoEm || b.criadoEm || 0);
    return da.getTime() - db.getTime();
  });

  // Localiza TODOS os recursos da timeline (RO, AP, ED)
  // Códigos TPU: 69 (Recurso Ordinário), 7154 (Agravo de Petição), 49 (Embargos de Declaração)
  const docsRecurso = [];
  for (const d of docsOrdenados) {
    const cod = String(d.codigoTipoDocumento || '');

    // Sentença/Decisão/Despacho/Acórdão (7007/7001/7003/7000) são sempre atos do juízo,
    // nunca petição de parte — mesmo quando o título é "Sentença/Decisão - Embargos de
    // Declaração" (o juízo RESOLVENDO embargos, não a parte interpondo). Excluir antes do
    // match evita que essas decisões entrem como se fossem o próprio recurso.
    if (cod === '7007' || cod === '7001' || cod === '7003' || cod === '7000') continue;

    const tipo = (d.tipo || '').toUpperCase();

    // O fallback de texto usa `tipo` (campo estruturado/classificado pelo PJe), nunca
    // `titulo` (texto livre digitado por quem junta o documento). Um "Documento Diverso"
    // pode ter título "Embargos de Declaração" só porque é uma CÓPIA de embargos de outro
    // processo anexada como prova — visto na prática num lote de anexos numerados
    // ("5 embargos de declaração ID ...", "6 decisão dos embargos ID ...") juntados de uma
    // vez com o mesmo timestamp. `tipo` desse tipo de anexo continua "Documento Diverso".
    if (
      cod === '69' || tipo.includes('RECURSO ORDINÁRIO') || tipo.includes('RECURSO ORDINARIO') ||
      cod === '7154' || tipo.includes('AGRAVO DE PETIÇÃO') || tipo.includes('AGRAVO DE PETICAO') ||
      cod === '49' || tipo.includes('EMBARGOS DE DECLARAÇÃO') || tipo.includes('EMBARGOS DE DECLARACAO')
    ) {
      docsRecurso.push(d);
    }
  }

  if (docsRecurso.length === 0) {
    return {
      status: 'RECURSO_NAO_IDENTIFICADO',
      tempestivo: null,
      detalhes: 'Nenhuma petição de recurso (RO, AP ou ED) foi localizada na timeline dos autos.'
    };
  }

  const recursos = docsRecurso.map(d => ({
    idDocumento: d.id,
    ..._avaliarRecurso(d, docsOrdenados, ehFazendaPublica)
  }));

  // Verdito do processo: intempestivo se QUALQUER recurso da timeline foi. Entre vários
  // intempestivos, expõe no topo o de maior atraso; sem nenhum, expõe o mais recente
  // (mantém o formato de retorno compatível com timelines de um único recurso).
  const intempestivos = recursos.filter(r => r.status === 'INTEMPESTIVO');
  const principal = intempestivos.length > 0
    ? intempestivos.reduce((pior, r) =>
        (r.diasUteisDecorridos - r.prazoMaximoDias) > (pior.diasUteisDecorridos - pior.prazoMaximoDias) ? r : pior)
    : recursos[recursos.length - 1];

  return { ...principal, recursos };
}
