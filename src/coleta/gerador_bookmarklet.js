/**
 * Gerador de Bookmarklet Universal do PJe:
 * - Sem hardcode de tribunal (opera dinamicamente sobre location.origin do PJe);
 * - Agrupamento nacional padronizado (12 = Triagem);
 * - Sanitização estrita de dados sensíveis na fonte (LGPD: remove CPFs e e-mails);
 * - Baixa automaticamente o arquivo .txt com os processos sanitizados para carregar no app.
 * 
 * @returns {string} Código javascript:... pronto para favoritos
 */
export function gerarCodigoBookmarkletUniversal() {
  const fnCorpo = `(function () {
  var AGRUPAMENTO = 12;
  var TAMANHO_PAGINA = 500;
  var CONCORRENCIA = 5;
  var API_BASE = location.origin + '/pje-comum-api/api';

  function getCookie(name) {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim();
      if (c.indexOf(name + '=') === 0) {
        return decodeURIComponent(c.substring(name.length + 1));
      }
    }
    return null;
  }

  function criarAviso() {
    var div = document.createElement('div');
    div.id = 'triagem-pje-aviso';
    div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999999;background:#0f172a;color:#ffffff;padding:16px 22px;border-radius:12px;font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.45);max-width:340px;border:1px solid #334155;';
    div.innerHTML = '<div style="font-weight:800;color:#facc15;margin-bottom:6px;display:flex;align-items:center;gap:6px;"><span>[AVISO]</span> NÃO FECHE ESTA ABA</div>' +
      '<div id="triagem-pje-msg" style="font-size:13px;opacity:0.95;margin-bottom:8px;">Conectando ao PJe...</div>' +
      '<div style="background:#1e293b;border-radius:6px;overflow:hidden;height:6px;"><div id="triagem-pje-bar" style="background:#38bdf8;width:0%;height:100%;transition:width 0.2s;"></div></div>';
    document.body.appendChild(div);
    return div;
  }

  function atualizarStatus(div, texto, pct) {
    var msg = div.querySelector('#triagem-pje-msg');
    var bar = div.querySelector('#triagem-pje-bar');
    if (msg) msg.textContent = texto;
    if (bar && typeof pct === 'number') bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }

  function sanitizarParte(p) {
    if (!p || typeof p !== 'object') return p;
    var c = Object.assign({}, p);
    delete c.emails;
    delete c.email;
    delete c.cpf;
    delete c.dddCelular;
    delete c.numeroCelular;
    if (c.tipoDocumento === 'CPF') delete c.documento;
    if (c.pessoaFisica) {
      var pf = Object.assign({}, c.pessoaFisica);
      delete pf.login;
      delete pf.cpf;
      delete pf.dataNascimento;
      delete pf.nomeGenitora;
      delete pf.nomeGenitor;
      c.pessoaFisica = pf;
    }
    if (Array.isArray(c.representantes)) {
      c.representantes = c.representantes.map(function (r) {
        var rep = Object.assign({}, r);
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
    var out = {};
    for (var polo in partesDict) {
      if (Object.prototype.hasOwnProperty.call(partesDict, polo)) {
        out[polo] = (partesDict[polo] || []).map(sanitizarParte);
      }
    }
    return out;
  }

  function baixarArquivoTxt(nomeArquivo, linhas) {
    var texto = linhas.map(function (o) { return JSON.stringify(o); }).join('\\n') + '\\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    a.download = nomeArquivo;
    a.click();
  }

  async function buscarPagina(pagina, xsrf) {
    var res = await fetch(API_BASE + '/agrupamentotarefas/' + AGRUPAMENTO + '/processos', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf },
      body: JSON.stringify({
        pagina: pagina,
        tamanhoPagina: TAMANHO_PAGINA,
        subCaixa: null, tipoAtividade: null, processos: null,
        nomeConclusoMagistrado: null, usuarioResponsavel: null,
        faseProcessualString: null, numeroProcesso: null,
        juizoDigital: false, filtroImpedimento: false,
        ordenacaoColuna: null, condicaoNegativaNosItensSelecionados: false,
        expedientesPreparados: false, ordenacaoCrescente: true,
        filtrarPorResponsavel: false
      })
    });
    if (!res.ok) throw new Error('Falha ao listar triagem: HTTP ' + res.status);
    return res.json();
  }

  async function getJson(path, xsrf) {
    var res = await fetch(API_BASE + path, {
      credentials: 'include',
      headers: { 'X-XSRF-TOKEN': xsrf }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' em ' + path);
    return res.json();
  }

  async function buscarDetalhes(idProc, xsrf) {
    var resultados = await Promise.all([
      getJson('/processos/id/' + idProc, xsrf),
      getJson('/processos/id/' + idProc + '/partes', xsrf),
      getJson('/processos/id/' + idProc + '/assuntos', xsrf)
    ]);
    return {
      processo: resultados[0],
      partes: sanitizarPartesDict(resultados[1]),
      assuntos: resultados[2]
    };
  }

  async function executarEmParalelo(itens, limite, workerFn) {
    var idx = 0;
    var total = itens.length;
    async function worker() {
      while (idx < total) {
        var cur = idx++;
        await workerFn(itens[cur], cur, total);
      }
    }
    var pool = [];
    for (var w = 0; w < Math.min(limite, total); w++) {
      pool.push(worker());
    }
    await Promise.all(pool);
  }

  async function iniciar() {
    var aviso = criarAviso();
    try {
      var xsrf = getCookie('Xsrf-Token');
      if (!xsrf) throw new Error('Cookie de sessão Xsrf-Token não encontrado. Verifique se está logado no PJe nesta aba.');

      atualizarStatus(aviso, 'Buscando tarefas do agrupamento de triagem...', 10);
      var pagina = 1;
      var listaProcessos = [];
      var primeira = await buscarPagina(pagina, xsrf);
      listaProcessos = listaProcessos.concat(primeira.resultado || []);

      while (pagina < (primeira.qtdPaginas || 1)) {
        pagina++;
        var prox = await buscarPagina(pagina, xsrf);
        listaProcessos = listaProcessos.concat(prox.resultado || []);
      }

      var pendentes = listaProcessos.filter(function (p) {
        return !p.idUsuarioResponsavelSecretaria;
      });

      if (pendentes.length === 0) {
        pendentes = listaProcessos;
      }

      var total = pendentes.length;
      var out = new Array(total);
      var concluidos = 0;

      atualizarStatus(aviso, 'Extraindo detalhes de ' + total + ' processos...', 20);

      await executarEmParalelo(pendentes, CONCORRENCIA, async function (p, i, tot) {
        try {
          var det = await buscarDetalhes(p.id, xsrf);
          out[i] = {
            cnj: p.numeroProcesso,
            idProcesso: p.id,
            listagem: p,
            processo: det.processo,
            partes: det.partes,
            assuntos: det.assuntos
          };
        } catch (e) {
          out[i] = {
            cnj: p.numeroProcesso,
            idProcesso: p.id,
            erro: String(e && e.message || e)
          };
        }
        concluidos++;
        var pct = 20 + Math.round((concluidos / tot) * 75);
        atualizarStatus(aviso, 'Baixando e sanitizando: ' + concluidos + '/' + tot + ' (' + Math.round((concluidos / tot) * 100) + '%)', pct);
      });

      var outValidos = out.filter(Boolean);
      var hoje = new Date().toISOString().slice(0, 10);
      var nomeArquivo = 'triagem_pje_' + hoje + '.txt';

      // Download direto do arquivo .txt contendo os processos sanitizados
      baixarArquivoTxt(nomeArquivo, outValidos);

      atualizarStatus(aviso, '[OK] Concluído! ' + outValidos.length + ' processos exportados. O arquivo ' + nomeArquivo + ' foi baixado.', 100);
      setTimeout(function () {
        if (aviso && aviso.parentNode) aviso.parentNode.removeChild(aviso);
      }, 7000);
    } catch (err) {
      atualizarStatus(aviso, '[ERRO] ' + (err.message || err), 0);
      setTimeout(function () {
        if (aviso && aviso.parentNode) aviso.parentNode.removeChild(aviso);
      }, 12000);
    }
  }

  iniciar();
})();`;

  return 'javascript:' + encodeURIComponent(fnCorpo);
}
