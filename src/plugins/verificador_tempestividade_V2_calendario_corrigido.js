/**
 * Plugin Independente para Verificação de Tempestividade de Recursos Trabalhistas.
 * Baseado no modelo de dados do PJe (documentos_lote) e na legislação processual:
 * - CLT art. 775 (dias úteis)
 * - Lei 11.419/2006 art. 4º §§ 3º e 4º (regras do DJEN: D -> D+1 publicação -> D+2 início)
 * - CPC art. 183 e 180 (prazo em dobro para Fazenda Pública e MPT)
 * - CPC art. 218 § 4º (tempestividade de recurso prematuro/antecipado)
 *
 * V2 (2026-09-17): calendário de suspensões TRT2 reconstruído a partir da agenda oficial
 * (ww2.trt2.jus.br/servicos/agenda/feriados-e-suspensoes-de-expediente), corrigindo o
 * calendário anterior que ora bloqueava dias úteis reais (01-06/jan a mais até 20/jan,
 * 11/ago, 08/dez em 2026) ora perdia suspensões reais (Carnaval, Semana Santa, pontes,
 * Data Magna, recesso de dezembro). Feriados como Dia do Advogado (11/ago), Dia do
 * Servidor Público (28/out) e Dia da Justiça (08/dez) são frequentemente antecipados ou
 * transferidos pelo TRT2 por ato próprio — por isso NÃO entram como recorrentes fixos,
 * só pela data exata que a agenda oficial confirmar ano a ano.
 */

// Feriados recorrentes fixos na jurisdição do TRT-2 (mês-dia) — datas que não costumam
// ser antecipadas/transferidas pelo TRT2.
const FERIADOS_RECORRENTES_TRT2 = new Set([
  '01-01', // Confraternização Universal
  '01-25', // Aniversário de São Paulo (Sede do TRT-2)
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalhador
  '07-09', // Data Magna do Estado de SP (Revolução Constitucionalista - Lei Estadual 9.497/97)
  '09-07', // Independência do Brasil
  '10-12', // N. Sra. Aparecida
  '11-01', // Todos os Santos (Lei 5.010/66 art. 62)
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia da Consciência Negra
  '12-25'  // Natal
]);

// Calendário Oficial de Suspensões e Feriados Móveis do TRT-2, ano a ano
// (Fonte: ww2.trt2.jus.br/servicos/agenda/feriados-e-suspensoes-de-expediente — conferido
// evento a evento em 2026-09-17 contra a agenda de 2026).
const SUSPENSOES_OFICIAIS_TRT2 = new Set([
  // 2026 - Recesso Forense (01-06/jan)
  '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06',
  // 2026 - Suspensão dos prazos processuais (21-23/jan, Ato TRT2) + aniversário sede SP (25/jan)
  '2026-01-21', '2026-01-22', '2026-01-23', '2026-01-25',
  // 2026 - Carnaval e Cinzas
  '2026-02-16', '2026-02-17', '2026-02-18',
  // 2026 - Semana Santa (Lei 5.010/66)
  '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',
  // 2026 - Suspensão de expediente (Ponte Tiradentes) e Tiradentes
  '2026-04-20', '2026-04-21',
  // 2026 - Dia do Trabalhador
  '2026-05-01',
  // 2026 - Corpus Christi e Suspensão de expediente (Ponte)
  '2026-06-04', '2026-06-05',
  // 2026 - Data Magna SP e Suspensão de expediente (Ponte)
  '2026-07-09', '2026-07-10',
  // 2026 - Instalação dos Cursos Jurídicos (Antecipação oficial no TRT2, dia único)
  '2026-08-10',
  // 2026 - Independência
  '2026-09-07',
  // 2026 - N. Sra. Aparecida e Transferência do Dia do Servidor Público
  '2026-10-12', '2026-10-30',
  // 2026 - Todos os Santos, Finados, Proclamação da República e Consciência Negra
  '2026-11-01', '2026-11-02', '2026-11-15', '2026-11-20',
  // 2026 - Dia da Justiça (Antecipação oficial, dia único) e Recesso Judiciário
  '2026-12-07',
  '2026-12-20', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
  '2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',

  // 2025 - Recesso e Feriados Móveis Históricos
  '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06',
  '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10', '2025-01-11', '2025-01-12',
  '2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18',
  '2025-01-19', '2025-01-20', '2025-01-25',
  '2025-03-03', '2025-03-04', '2025-03-05', // Carnaval 2025
  '2025-04-16', '2025-04-17', '2025-04-18', // Semana Santa 2025
  '2025-06-19', '2025-06-20',               // Corpus Christi 2025
  '2025-07-09',
  '2025-08-11',
  '2025-10-27', '2025-10-28',
  '2025-12-08',
  '2025-12-20', '2025-12-21', '2025-12-22', '2025-12-23', '2025-12-24', '2025-12-25',
  '2025-12-26', '2025-12-27', '2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31'
  // NOTA: a faixa de 2025-01-07 a 2025-01-20 não foi reconferida contra a agenda oficial
  // de 2025 (só tínhamos o HTML de 2026) — manter sob suspeita até checar.
]);

/**
 * Verifica se uma data é dia útil na jurisdição do TRT-2.
 * Considera finais de semana, feriados nacionais, estaduais de SP, municipais da Capital
 * e todas as suspensões regimentais do Tribunal.
 * @param {Date} data
 * @returns {boolean}
 */
export function ehDiaUtil(data) {
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false; // 0=Domingo, 6=Sábado

  const yyyy = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  const chaveCompleta = `${yyyy}-${mm}-${dd}`;
  const chaveMesDia = `${mm}-${dd}`;

  // 1. Checa suspensões e feriados específicos do TRT2
  if (SUSPENSOES_OFICIAIS_TRT2.has(chaveCompleta)) {
    return false;
  }

  // 2. Checa feriados recorrentes fixos
  if (FERIADOS_RECORRENTES_TRT2.has(chaveMesDia)) {
    return false;
  }

  return true;
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
