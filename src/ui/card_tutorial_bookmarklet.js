import { gerarCodigoBookmarkletUniversal } from '../coleta/gerador_bookmarklet.js';

/**
 * Componente: Card Retrátil (Sanfona Didática) com Tutorial do Bookmarklet para Leigos.
 * Permite arrastar o botão para a barra de favoritos, copiar o código e recolher/expandir.
 */
export function renderizarCardTutorialBookmarklet(container) {
  if (!container) return;

  const urlBookmarklet = gerarCodigoBookmarkletUniversal();
  const CHAVE_STORAGE = 'triagem_tutorial_bookmarklet_recolhido';
  const estaRecolhidoInicial = localStorage.getItem(CHAVE_STORAGE) === 'true';

  const iconeAjudaSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;color:var(--primary, #1e3a8a);"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  const iconeEstrelaSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" style="vertical-align:middle;margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

  container.innerHTML = `
    <div class="card-sanfona-bookmarklet">
      <button type="button" id="btn-toggle-sanfona" class="btn-sanfona-header" aria-expanded="${!estaRecolhidoInicial}">
        <div class="sanfona-header-info">
          <span class="sanfona-icone">${iconeAjudaSvg}</span>
          <div>
            <div class="sanfona-titulo">Como Coletar Processos do PJe (Bookmarklet Automático)</div>
            <div class="sanfona-subtitulo">Guia simples em 3 passos para exportar os processos do tribunal e analisar aqui</div>
          </div>
        </div>
        <span id="icone-seta-sanfona" class="sanfona-seta">${estaRecolhidoInicial ? '▼' : '▲'}</span>
      </button>

      <div id="corpo-sanfona" class="sanfona-corpo" style="display: ${estaRecolhidoInicial ? 'none' : 'block'};">
        <div class="passos-bookmarklet-grid">
          <!-- Passo 1 -->
          <div class="card-passo">
            <div class="passo-numero">Passo 1</div>
            <div class="passo-titulo">Instale o Favorito</div>
            <p class="passo-desc">
              Arraste o botão verde abaixo para a <strong>barra de favoritos</strong> do seu navegador.
            </p>
            <div class="passo-acao">
              <a href="${urlBookmarklet}" id="link-bookmarklet-arrastar" class="btn-arrastar-bookmarklet" title="Clique e arraste este botão para sua barra de favoritos">
                ${iconeEstrelaSvg} Coletar Triagem PJe
              </a>
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;align-items:center;">
              <button type="button" id="btn-copiar-codigo-bm" class="btn-copiar-codigo-bm">Copiar Código</button>
              <span id="msg-copiado-bm" class="msg-copiado-bm" style="display:none;">Copiado!</span>
            </div>
            <div class="passo-dica">
              <strong>Dica:</strong> Se a barra de favoritos não estiver visível, pressione <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd>.
            </div>
          </div>

          <!-- Passo 2 -->
          <div class="card-passo">
            <div class="passo-numero">Passo 2</div>
            <div class="passo-titulo">Execute no PJe</div>
            <p class="passo-desc">
              No <strong>PJe</strong> (qualquer TRT), abra a tarefa de <strong>Triagem</strong> (Agrupamento 12) e clique no favorito <strong>"Coletar Triagem PJe"</strong>.
            </p>
            <div class="passo-dica" style="border-left-color: #0284c7; background: #f0f9ff; color: #0369a1;">
              O robô coletará os processos com sanitização LGPD e baixará automaticamente o arquivo <code>triagem_pje_DATA.txt</code>.
            </div>
          </div>

          <!-- Passo 3 -->
          <div class="card-passo">
            <div class="passo-numero">Passo 3</div>
            <div class="passo-titulo">Carregue o Arquivo Aqui</div>
            <p class="passo-desc">
              Arraste o arquivo <code>.txt</code> baixado para a caixa de upload abaixo ou clique em <strong>"Selecionar Arquivo (.txt)"</strong>.
            </p>
            <div class="passo-dica" style="border-left-color: #16a34a; background: #f0fdf4; color: #15803d;">
              A análise, filtros, identificação de Fazenda Pública e relatórios serão carregados instantaneamente!
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Interatividade da sanfona (recolher / expandir)
  const btnToggle = container.querySelector('#btn-toggle-sanfona');
  const corpoSanfona = container.querySelector('#corpo-sanfona');
  const iconeSeta = container.querySelector('#icone-seta-sanfona');

  if (btnToggle && corpoSanfona) {
    btnToggle.addEventListener('click', () => {
      const estaFechado = corpoSanfona.style.display === 'none';
      corpoSanfona.style.display = estaFechado ? 'block' : 'none';
      iconeSeta.textContent = estaFechado ? '▲' : '▼';
      btnToggle.setAttribute('aria-expanded', String(estaFechado));
      localStorage.setItem(CHAVE_STORAGE, String(!estaFechado));
    });
  }

  // Interatividade do botão copiar código
  const btnCopiar = container.querySelector('#btn-copiar-codigo-bm');
  const msgCopiado = container.querySelector('#msg-copiado-bm');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(urlBookmarklet);
        if (msgCopiado) {
          msgCopiado.style.display = 'inline-block';
          setTimeout(() => { msgCopiado.style.display = 'none'; }, 3000);
        }
      } catch (err) {
        alert('Não foi possível copiar automaticamente. Arraste o botão verde para a barra de favoritos.');
      }
    });
  }
}
