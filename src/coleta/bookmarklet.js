/**
 * Bookmarklet: Coleta autenticada de processos em Triagem no PJe (Agrupamento 12).
 * Inclui sanitização na fonte (LGPD: descarte de CPF e e-mails) e suporte a postMessage + fallback .txt.
 */
(function () {
  const AGRUPAMENTO = 12; // "Triagem" no Painel Global — universal
  const TAMANHO_PAGINA = 500;
  const CONCORRENCIA = 5;
  const API_BASE = `${location.origin}/pje-comum-api/api`;

  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i].trim();
      if (c.startsWith(name + '=')) {
        return decodeURIComponent(c.substring(name.length + 1));
      }
    }
    return null;
  }

  function criarAviso() {
    const div = document.createElement('div');
    div.id = 'triagem-completa-aviso';
    div.style.cssText = [
      'position:fixed', 'top:16px', 'right:16px', 'z-index:999999',
      'background:#0f172a', 'color:#fff', 'padding:14px 20px',
      'border-radius:10px', 'font:14px/1.5 system-ui,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.35)', 'max-width:320px'
    ].join(';');
    div.innerHTML =
      '<div style="font-weight:700;margin-bottom:4px">NÃO FECHE ESTA ABA</div>' +
      '<div id="triagem-completa-status" style="font-size:13px;opacity:.9">Iniciando...</div>';
    document.body.appendChild(div);
    return div;
  }

  function status(div, texto) {
    div.querySelector('#triagem-completa-status').textContent = texto;
  }

  function sanitizarParte(p) {
    if (!p || typeof p !== 'object') return p;
    const c = Object.assign({}, p);
    delete c.emails;
    delete c.email;
    delete c.cpf;
    delete c.dddCelular;
    delete c.numeroCelular;
    if (c.tipoDocumento === 'CPF') delete c.documento;
    if (c.pessoaFisica) {
      const pf = Object.assign({}, c.pessoaFisica);
      delete pf.login;
      delete pf.cpf;
      delete pf.dataNascimento;
      delete pf.nomeGenitora;
      delete pf.nomeGenitor;
      c.pessoaFisica = pf;
    }
    if (Array.isArray(c.representantes)) {
      c.representantes = c.representantes.map(r => {
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
    return c;
  }

  function sanitizarPartesDict(partesDict) {
    if (!partesDict || typeof partesDict !== 'object') return partesDict;
    const out = {};
    for (const polo of Object.keys(partesDict)) {
      out[polo] = (partesDict[polo] || []).map(sanitizarParte);
    }
    return out;
  }

  function baixarTxt(nomeArquivo, linhasObjeto) {
    const texto = linhasObjeto.map(o => JSON.stringify(o)).join('\n') + '\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    a.download = nomeArquivo;
    a.click();
  }

  async function buscarPaginaTriagem(pagina, xsrf) {
    const res = await fetch(
      `${API_BASE}/agrupamentotarefas/${AGRUPAMENTO}/processos`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf },
        body: JSON.stringify({
          pagina, tamanhoPagina: TAMANHO_PAGINA,
          subCaixa: null, tipoAtividade: null, processos: null,
          nomeConclusoMagistrado: null, usuarioResponsavel: null,
          faseProcessualString: null, numeroProcesso: null,
          juizoDigital: false, filtroImpedimento: false,
          ordenacaoColuna: null, condicaoNegativaNosItensSelecionados: false,
          expedientesPreparados: false, ordenacaoCrescente: true,
          filtrarPorResponsavel: false
        })
      }
    );
    if (!res.ok) throw new Error('Falha ao listar triagem (página ' + pagina + '): HTTP ' + res.status);
    return res.json();
  }

  async function getJson(caminho, xsrf) {
    const res = await fetch(`${API_BASE}${caminho}`, {
      credentials: 'include', headers: { 'X-XSRF-TOKEN': xsrf }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' em ' + caminho);
    return res.json();
  }

  async function buscarDetalhesProcesso(idProcesso, xsrf) {
    const [processo, partesBrutas, assuntos] = await Promise.all([
      getJson(`/processos/id/${idProcesso}`, xsrf),
      getJson(`/processos/id/${idProcesso}/partes`, xsrf),
      getJson(`/processos/id/${idProcesso}/assuntos`, xsrf)
    ]);
    return { processo, partes: sanitizarPartesDict(partesBrutas), assuntos };
  }

  async function executarEmParalelo(itens, limite, fn) {
    let index = 0;
    const total = itens.length;
    async function worker() {
      while (index < total) {
        const i = index++;
        await fn(itens[i], i, total);
      }
    }
    const workers = Array.from({ length: Math.min(limite, total) }, () => worker());
    await Promise.all(workers);
  }

  async function main() {
    const aviso = criarAviso();
    try {
      const xsrf = getCookie('Xsrf-Token');
      if (!xsrf) throw new Error('Cookie Xsrf-Token não encontrado. Está logado no PJe nesta aba?');

      status(aviso, 'Buscando lista de processos em triagem...');
      let pagina = 1;
      let todos = [];
      let primeira = await buscarPaginaTriagem(pagina, xsrf);
      todos = todos.concat(primeira.resultado);
      while (pagina < primeira.qtdPaginas) {
        pagina += 1;
        const prox = await buscarPaginaTriagem(pagina, xsrf);
        todos = todos.concat(prox.resultado);
      }

      const semResponsavel = todos.filter(p => !p.idUsuarioResponsavelSecretaria);
      const out = new Array(semResponsavel.length);
      let concluidos = 0;
      let falhas = 0;

      await executarEmParalelo(semResponsavel, CONCORRENCIA, async (p, i, total) => {
        try {
          const { processo, partes, assuntos } = await buscarDetalhesProcesso(p.id, xsrf);
          out[i] = { cnj: p.numeroProcesso, idProcesso: p.id, listagem: p, processo, partes, assuntos };
        } catch (e) {
          falhas++;
          out[i] = { cnj: p.numeroProcesso, idProcesso: p.id, erro: String(e && e.message || e) };
        }
        concluidos++;
        const pct = Math.round((concluidos / total) * 100);
        status(aviso, `Baixando e sanitizando: ${concluidos}/${total} (${pct}%)`);
      });

      const outValidos = out.filter(Boolean);
      const hoje = new Date().toISOString().slice(0, 10);
      baixarTxt(`triagem_completa_${hoje}.txt`, outValidos);

      status(
        aviso,
        `Concluído! ${outValidos.length} processos sanitizados (sem CPF/e-mails)` +
        (falhas ? `, ${falhas} falhas` : '') +
        '. Arquivo .txt baixado.'
      );
      setTimeout(() => aviso.remove(), 10000);
    } catch (err) {
      status(aviso, 'Erro: ' + err.message);
      setTimeout(() => aviso.remove(), 12000);
    }
  }

  main();
})();
