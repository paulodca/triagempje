/**
 * Componente: Painel de Abas com Revelação Progressiva.
 * Organiza a visualização em 4 abas para eliminar sobrecarga cognitiva:
 * - Processos (Grid de triagem com filtros)
 * - Concentração por Reclamada (Top empresas e CNPJs)
 * - Lotes Semelhantes (Contencioso em escala e pedidos idênticos)
 * - Métricas e Relatórios (KPIs consolidados e exportação)
 */

export function renderizarPainelAbas(container, abasConfig = [], abaAtivaInicial = 'processos', onAbaAlterada = null) {
  if (!container) return null;

  let abaAtiva = abaAtivaInicial;

  function render() {
    container.innerHTML = `
      <nav class="nav-painel-abas" aria-label="Navegação das Seções de Triagem" style="margin-bottom:16px;border-bottom:2px solid var(--border-subtle, #e2e8f0);background:#fff;border-radius:8px 8px 0 0;padding:6px 12px 0 12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex;gap:6px;align-items:flex-end;overflow-x:auto;">
          ${abasConfig.map(aba => {
            const ehAtiva = aba.id === abaAtiva;
            const badgeTxt = (aba.badge !== undefined && aba.badge !== null && aba.badge !== '') ? String(aba.badge) : '';
            return `
              <button type="button" 
                      class="btn-aba-tab ${ehAtiva ? 'btn-aba-ativa' : ''}" 
                      data-aba-id="${aba.id}"
                      role="tab"
                      aria-selected="${ehAtiva}"
                      style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:${ehAtiva ? '#fff' : 'transparent'};color:${ehAtiva ? 'var(--primary, #1e3a8a)' : '#64748b'};font-weight:${ehAtiva ? '700' : '600'};font-size:13px;border:none;border-bottom:${ehAtiva ? '3px solid var(--primary, #1e3a8a)' : '3px solid transparent'};border-radius:6px 6px 0 0;cursor:pointer;transition:all 0.15s ease;white-space:nowrap;user-select:none;">
                ${aba.iconeSvg || ''}
                <span>${aba.rotulo}</span>
                ${badgeTxt ? `
                  <span class="badge-aba-contador" style="background:${ehAtiva ? 'var(--primary-light, #eff6ff)' : '#f1f5f9'};color:${ehAtiva ? 'var(--primary, #1e3a8a)' : '#475569'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;border:1px solid ${ehAtiva ? '#bfdbfe' : '#e2e8f0'};">
                    ${badgeTxt}
                  </span>
                ` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </nav>
    `;

    // Event listeners
    container.querySelectorAll('.btn-aba-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-aba-id');
        if (id !== abaAtiva) {
          abaAtiva = id;
          render();
          if (typeof onAbaAlterada === 'function') {
            onAbaAlterada(abaAtiva);
          }
        }
      });
    });
  }

  render();

  return {
    obterAbaAtiva: () => abaAtiva,
    definirAbaAtiva: (id) => {
      abaAtiva = id;
      render();
      if (typeof onAbaAlterada === 'function') {
        onAbaAlterada(abaAtiva);
      }
    },
    atualizarBadges: (novasAbasConfig) => {
      abasConfig = novasAbasConfig;
      render();
    }
  };
}
