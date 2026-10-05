import { processarLoteTriagem } from '../hub_triagem.js';
import { obterTodos, salvarLote, limparSessao } from '../persistencia/db.js';
import { renderizarPainelAbas } from './painel_abas.js';
import { renderizarBarraMetricas } from './barra_metricas.js';
import { renderizarTabela } from './tabela.js';
import { criarGerenciadorFiltros } from './filtros.js';
import { renderizarPainelAgrupamentos } from './painel_agrupamentos.js';
import { renderizarPainelLotesSemelhantes } from './painel_lotes_semelhantes.js';
import { renderizarAvisoPrivacidade } from './modal_privacidade.js';
import { renderizarCardTutorialBookmarklet } from './card_tutorial_bookmarklet.js';
import { exportarRelatorioPdf } from '../relatorios/exportar_relatorio.js';

/**
 * Ponto de entrada da aplicação de interface de triagem com Revelação Progressiva.
 */
export async function iniciarAppTriagem(containerPrincipal) {
  if (!containerPrincipal) return;

  const iconeUploadSvg = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`;

  containerPrincipal.innerHTML = `
    <header style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <h1 style="font-size:20px;font-weight:800;color:var(--text-primary, #0f172a);margin:0;letter-spacing:-0.5px;">TRIAGEM PJE</h1>
          <span style="font-size:11px;font-weight:700;color:#1e3a8a;background:#eff6ff;padding:2px 8px;border-radius:4px;border:1px solid #bfdbfe;text-transform:uppercase;">2º Grau TRT-2</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button type="button" id="btn-instalar-pwa" class="btn-instalar-app" style="display:none;" title="Instalar como aplicativo no computador">
            Instalar Aplicativo
          </button>
          <button type="button" id="btn-carregar-novo" style="display:none;background:#334155;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;" title="Carregar um novo arquivo .txt">
            Carregar Outro Arquivo (.txt)
          </button>
          <button type="button" id="btn-exportar-pdf" style="display:none;background:#1e3a8a;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">
            Exportar Relatório (PDF)
          </button>
        </div>
      </div>
    </header>

    <!-- Card Sanfona Retrátil Didático: Como Coletar Processos do PJe -->
    <div id="container-tutorial-bookmarklet"></div>

    <!-- Área de Upload de Arquivo -->
    <div id="area-upload" class="area-upload-dropzone">
      <div class="area-upload-conteudo">
        <span class="area-upload-icone">${iconeUploadSvg}</span>
        <div class="area-upload-texto">
          <div class="area-upload-titulo">Arraste e solte o arquivo <code>.txt</code> da triagem aqui</div>
          <div class="area-upload-subtitulo">Ou clique no botão abaixo para selecionar do seu computador</div>
        </div>
        <button type="button" id="btn-escolher-arquivo" class="btn-escolher-arquivo">
          Selecionar Arquivo (.txt)
        </button>
      </div>
      <input type="file" id="input-arquivo" accept=".txt,.json,.ndjson" style="display:none;">
    </div>

    <!-- Navegação por Abas (Revelação Progressiva) -->
    <div id="container-painel-abas" style="display:none;"></div>

    <main id="conteudo-principal">
      <!-- ABA 1: PROCESSOS (Tabela Principal) -->
      <section id="aba-conteudo-processos" class="secao-aba-conteudo">
        <div id="container-filtros"></div>

        <!-- Barra de Ações para Processos Selecionados -->
        <div id="barra-selecao" style="display:none;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1e293b;color:#f8fafc;border-radius:8px;margin-bottom:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span id="txt-qtd-selecionados" style="font-weight:700;font-size:13px;color:#38bdf8;">0 processos selecionados</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" id="btn-copiar-cnjs" style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
              Copiar CNJs
            </button>
            <button type="button" id="btn-copiar-com-partes" style="background:#334155;color:#fff;border:1px solid #475569;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
              Copiar com Partes
            </button>
            <button type="button" id="btn-limpar-selecao" style="background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;text-decoration:underline;">
              Desmarcar todos
            </button>
            <span id="msg-feedback-copia" style="font-size:12px;color:#4ade80;display:none;">Copiado!</span>
          </div>
        </div>

        <div id="container-tabela" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow-x:auto;"></div>
      </section>

      <!-- ABA 2: CONCENTRAÇÃO POR RECLAMADA -->
      <section id="aba-conteudo-reclamadas" class="secao-aba-conteudo" style="display:none;">
        <div id="container-agrupamentos"></div>
      </section>

      <!-- ABA 3: LOTES SEMELHANTES -->
      <section id="aba-conteudo-semelhantes" class="secao-aba-conteudo" style="display:none;">
        <div id="container-lotes-semelhantes"></div>
      </section>

      <!-- ABA 4: MÉTRICAS E RELATÓRIOS -->
      <section id="aba-conteudo-metricas" class="secao-aba-conteudo" style="display:none;">
        <div style="background:#fff;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;padding:20px;margin-bottom:16px;">
          <h2 style="font-size:16px;font-weight:700;color:var(--text-primary, #0f172a);margin:0 0 12px 0;">Painel Consolidado de Métricas</h2>
          <div id="container-metricas"></div>
        </div>
      </section>
    </main>

    <footer id="container-privacidade"></footer>
  `;

  const containerTutorial = containerPrincipal.querySelector('#container-tutorial-bookmarklet');
  const containerPainelAbas = containerPrincipal.querySelector('#container-painel-abas');
  const containerMetricas = containerPrincipal.querySelector('#container-metricas');
  const containerAgrupamentos = containerPrincipal.querySelector('#container-agrupamentos');
  const containerLotesSemelhantes = containerPrincipal.querySelector('#container-lotes-semelhantes');
  const containerFiltros = containerPrincipal.querySelector('#container-filtros');
  const containerTabela = containerPrincipal.querySelector('#container-tabela');
  const containerPrivacidade = containerPrincipal.querySelector('#container-privacidade');
  const areaUpload = containerPrincipal.querySelector('#area-upload');
  const inputArquivo = containerPrincipal.querySelector('#input-arquivo');
  const btnEscolherArquivo = containerPrincipal.querySelector('#btn-escolher-arquivo');
  const btnCarregarNovo = containerPrincipal.querySelector('#btn-carregar-novo');

  const abaProcessos = containerPrincipal.querySelector('#aba-conteudo-processos');
  const abaReclamadas = containerPrincipal.querySelector('#aba-conteudo-reclamadas');
  const abaSemelhantes = containerPrincipal.querySelector('#aba-conteudo-semelhantes');
  const abaMetricas = containerPrincipal.querySelector('#aba-conteudo-metricas');

  const btnInstalarPwa = containerPrincipal.querySelector('#btn-instalar-pwa');
  const btnExportarPdf = containerPrincipal.querySelector('#btn-exportar-pdf');
  const barraSelecao = containerPrincipal.querySelector('#barra-selecao');
  const txtQtdSelecionados = containerPrincipal.querySelector('#txt-qtd-selecionados');
  const btnCopiarCnjs = containerPrincipal.querySelector('#btn-copiar-cnjs');
  const btnCopiarComPartes = containerPrincipal.querySelector('#btn-copiar-com-partes');
  const btnLimparSelecao = containerPrincipal.querySelector('#btn-limpar-selecao');
  const msgFeedbackCopia = containerPrincipal.querySelector('#msg-feedback-copia');

  if (containerTutorial) {
    renderizarCardTutorialBookmarklet(containerTutorial);
  }

  let dadosProcessados = null;
  let gerenciadorFiltros = null;
  let gerenciadorAbas = null;
  let processosFiltradosAtuais = [];
  const cnjsSelecionados = new Set();

  function trocarAbaVisual(abaId) {
    abaProcessos.style.display = abaId === 'processos' ? 'block' : 'none';
    abaReclamadas.style.display = abaId === 'reclamadas' ? 'block' : 'none';
    abaSemelhantes.style.display = abaId === 'semelhantes' ? 'block' : 'none';
    abaMetricas.style.display = abaId === 'metricas' ? 'block' : 'none';

    // Se mudou para a aba de processos e existe Tabulator, redesenha
    if (abaId === 'processos' && containerTabela._tabulatorInstance) {
      setTimeout(() => {
        try {
          containerTabela._tabulatorInstance.redraw(true);
        } catch {
          // Ignora caso não precise de redraw
        }
      }, 50);
    }
  }

  if (btnExportarPdf) {
    btnExportarPdf.addEventListener('click', () => {
      if (dadosProcessados) {
        exportarRelatorioPdf(dadosProcessados);
      }
    });
  }

  function atualizarBarraSelecao() {
    const qtd = cnjsSelecionados.size;
    if (qtd > 0) {
      barraSelecao.style.display = 'flex';
      txtQtdSelecionados.textContent = `${qtd} processo${qtd > 1 ? 's' : ''} selecionado${qtd > 1 ? 's' : ''}`;
    } else {
      barraSelecao.style.display = 'none';
    }
  }

  function mostrarFeedbackCopia() {
    msgFeedbackCopia.style.display = 'inline';
    setTimeout(() => {
      msgFeedbackCopia.style.display = 'none';
    }, 2000);
  }

  btnCopiarCnjs.addEventListener('click', async () => {
    const lista = Array.from(cnjsSelecionados);
    if (lista.length === 0) return;
    const texto = lista.join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      mostrarFeedbackCopia();
    } catch {
      prompt('Copie os CNJs selecionados abaixo:', texto);
    }
  });

  btnCopiarComPartes.addEventListener('click', async () => {
    if (!dadosProcessados || cnjsSelecionados.size === 0) return;
    const mapaProcessos = new Map(dadosProcessados.processos.map(p => [p.cnj, p]));
    const linhas = [];
    for (const cnj of cnjsSelecionados) {
      const p = mapaProcessos.get(cnj);
      if (p) {
        const sigla = (p.classe && p.classe.sigla) || 'OUTROS';
        const partes = p.partes ? p.partes.tituloPartes : 'Partes não informadas';
        linhas.push(`${p.cnj} - [${sigla}] - ${partes}`);
      } else {
        linhas.push(cnj);
      }
    }
    const texto = linhas.join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      mostrarFeedbackCopia();
    } catch {
      prompt('Copie os dados selecionados abaixo:', texto);
    }
  });

  btnLimparSelecao.addEventListener('click', () => {
    cnjsSelecionados.clear();
    atualizarBarraSelecao();
    if (containerTabela._tabulatorInstance) {
      containerTabela._tabulatorInstance.deselectRow();
    }
  });

  function onSelecaoAlterada(novoSet) {
    atualizarBarraSelecao();
  }

  function atualizarVisualizacao(loteBruto) {
    dadosProcessados = processarLoteTriagem(loteBruto);
    const { processos, estatisticas, clustersSeriais } = dadosProcessados;

    if (processos.length > 0) {
      areaUpload.style.display = 'none';
      containerPainelAbas.style.display = 'block';
      if (btnExportarPdf) btnExportarPdf.style.display = 'inline-block';
      if (btnCarregarNovo) btnCarregarNovo.style.display = 'inline-block';

      // Configuração das abas com badges de contagem
      const totalLotes = (clustersSeriais && clustersSeriais.clusters && clustersSeriais.clusters.length) || 0;
      
      const abasConfig = [
        {
          id: 'processos',
          rotulo: 'Processos',
          badge: processos.length,
          iconeSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
        },
        {
          id: 'reclamadas',
          rotulo: 'Concentração por Reclamada',
          iconeSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="2"></line><line x1="8" y1="6" x2="8.01" y2="6"></line><line x1="16" y1="6" x2="16.01" y2="6"></line><line x1="16" y1="10" x2="16.01" y2="10"></line></svg>`
        },
        {
          id: 'semelhantes',
          rotulo: 'Lotes Semelhantes',
          badge: totalLotes > 0 ? totalLotes : '',
          iconeSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
        },
        {
          id: 'metricas',
          rotulo: 'Métricas e Relatórios',
          iconeSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
        }
      ];

      gerenciadorAbas = renderizarPainelAbas(containerPainelAbas, abasConfig, 'processos', (abaId) => {
        trocarAbaVisual(abaId);
      });

      // 1. Aba Métricas
      renderizarBarraMetricas(containerMetricas, estatisticas, clustersSeriais);

      // 2. Aba Concentração por Reclamada
      renderizarPainelAgrupamentos(containerAgrupamentos, processos, clustersSeriais, (agrupamento) => {
        if (gerenciadorFiltros) {
          gerenciadorFiltros.setAgrupamento(agrupamento, containerFiltros);
          if (gerenciadorAbas) {
            gerenciadorAbas.definirAbaAtiva('processos');
          }
        }
      });

      // 3. Aba Lotes Semelhantes
      renderizarPainelLotesSemelhantes(containerLotesSemelhantes, clustersSeriais, (agrupamento) => {
        if (gerenciadorFiltros) {
          gerenciadorFiltros.setAgrupamento(agrupamento, containerFiltros);
          if (gerenciadorAbas) {
            gerenciadorAbas.definirAbaAtiva('processos');
          }
        }
      });

      // 4. Aba Processos (Filtros + Tabulator)
      gerenciadorFiltros = criarGerenciadorFiltros(processos, (filtrados, estadoFiltros) => {
        processosFiltradosAtuais = filtrados;
        renderizarTabela(containerTabela, filtrados, cnjsSelecionados, onSelecaoAlterada, estadoFiltros);
      });
      gerenciadorFiltros.renderizar(containerFiltros);
      gerenciadorFiltros.aplicarFiltros();

      trocarAbaVisual('processos');
    } else {
      areaUpload.style.display = 'block';
      containerPainelAbas.style.display = 'none';
      if (btnExportarPdf) btnExportarPdf.style.display = 'none';
      if (btnCarregarNovo) btnCarregarNovo.style.display = 'none';
      containerAgrupamentos.innerHTML = '';
      containerLotesSemelhantes.innerHTML = '';
      containerFiltros.innerHTML = '';
      containerTabela.innerHTML = '';
      containerMetricas.innerHTML = '';
    }

    renderizarAvisoPrivacidade(containerPrivacidade, async () => {
      await limparSessao();
      cnjsSelecionados.clear();
      atualizarBarraSelecao();
      atualizarVisualizacao([]);
    });
  }

  // 1. Carrega dados prévios do IndexedDB
  try {
    const salvos = await obterTodos();
    if (salvos && salvos.length > 0) {
      atualizarVisualizacao(salvos);
    } else {
      atualizarVisualizacao([]);
    }
  } catch {
    atualizarVisualizacao([]);
  }

  // 2. Upload de Arquivo .txt (Botão de Seleção, Clique na Área e Drag & Drop)
  function abrirSeletorArquivo() {
    inputArquivo.value = '';
    inputArquivo.click();
  }

  if (btnEscolherArquivo) {
    btnEscolherArquivo.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirSeletorArquivo();
    });
  }

  if (btnCarregarNovo) {
    btnCarregarNovo.addEventListener('click', () => {
      abrirSeletorArquivo();
    });
  }

  areaUpload.addEventListener('click', () => {
    abrirSeletorArquivo();
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    areaUpload.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      areaUpload.classList.add('drag-over');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });
  });

  ['dragleave', 'dragend'].forEach((eventName) => {
    areaUpload.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      areaUpload.classList.remove('drag-over');
    });
  });

  areaUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    areaUpload.classList.remove('drag-over');
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      processarArquivo(dt.files[0]);
    }
  });

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  inputArquivo.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processarArquivo(file);
    }
  });

  async function processarArquivo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const texto = ev.target.result;
      if (!texto || typeof texto !== 'string') return;
      const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
      const lista = [];
      for (const l of linhas) {
        try {
          const obj = JSON.parse(l);
          if (!obj.erro) lista.push(obj);
        } catch {
          // Ignora linhas que não forem JSON
        }
      }
      if (lista.length === 0) {
        alert('Nenhum processo válido encontrado no arquivo selecionado. Certifique-se de selecionar o arquivo .txt gerado pelo bookmarklet da Triagem PJe.');
        return;
      }
      try {
        await salvarLote(lista);
      } catch (err) {
        console.warn('Erro ao persistir no IndexedDB:', err);
      }
      atualizarVisualizacao(lista);
    };
    reader.readAsText(file, 'utf-8');
  }

  // 4. Suporte a PWA (Instalação e Service Worker Offline)
  let promptInstalacao = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstalacao = e;
    if (btnInstalarPwa) {
      btnInstalarPwa.style.display = 'inline-flex';
    }
  });

  if (btnInstalarPwa) {
    btnInstalarPwa.addEventListener('click', async () => {
      if (!promptInstalacao) return;
      promptInstalacao.prompt();
      try {
        const { outcome } = await promptInstalacao.userChoice;
        if (outcome === 'accepted') {
          btnInstalarPwa.style.display = 'none';
        }
      } catch {
        // Ignora cancelamentos
      }
      promptInstalacao = null;
    });
  }

  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.debug('Service Worker não registrado:', err);
    });
  }
}
