import { escapeHtml } from '../classificadores/utils_texto.js';

/**
 * Componente: Painel de Lotes Semelhantes (Contencioso Serial / Pedidos Idênticos).
 * Exibe a relação de grupos de processos agrupados por mesma OAB/assuntos/reclamada,
 * permitindo filtragem direta na tabela de triagem.
 */

export function renderizarPainelLotesSemelhantes(container, clustersSeriais = {}, onFiltrarLote = null) {
  if (!container) return;

  const lotes = (clustersSeriais && clustersSeriais.clusters) || [];
  const totalLotes = lotes.length;
  const totalProcessos = clustersSeriais.totalProcessosEmLoteSerial || 0;

  if (totalLotes === 0) {
    container.innerHTML = `
      <div style="background:#fff;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;padding:32px;text-align:center;">
        <h3 style="font-size:16px;color:#334155;margin:0 0 8px 0;">Nenhum Lote Serial Identificado</h3>
        <p style="font-size:13px;color:#64748b;margin:0;">Não foram identificados grupos expressivos de processos com pedidos idênticos e mesma representação jurídica no lote atual.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background:#fff;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
        <div>
          <h2 style="font-size:16px;font-weight:700;color:var(--text-primary, #0f172a);margin:0 0 4px 0;">Lotes de Processos Semelhantes</h2>
          <div style="font-size:12px;color:var(--text-muted, #64748b);">Processos correlacionados por identidade de pedidos e mesma representação jurídica (OAB)</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="background:#fef08a;color:#854d0e;font-size:12px;font-weight:700;padding:4px 10px;border-radius:12px;border:1px solid #fde047;">
            ${totalLotes} lotes (${totalProcessos} processos)
          </span>
          <button type="button" id="btn-filtrar-todos-semelhantes" style="background:#1e3a8a;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
            Ver Todos na Tabela
          </button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        ${lotes.map((lote, idx) => {
          const razoes = (lote.razoes || ['mesmo cadastro de OAB', 'assuntos idênticos']).map(r => escapeHtml(r)).join(' • ');
          const assuntos = escapeHtml(lote.assuntosResumo || 'Matérias em comum');
          const procs = (lote.processosRelacionados || []).slice(0, 10);
          const restantes = (lote.processosRelacionados || []).length - procs.length;

          return `
            <div class="card-lote-serial" style="border:1px solid #e2e8f0;border-left:5px solid #2563eb;border-radius:6px;padding:14px;background:#f8fafc;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">
                <div>
                  <div style="font-size:13px;font-weight:700;color:#1e293b;">
                    Lote #${idx + 1} — ${escapeHtml(lote.rotulo || 'Grupo Serial')}
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-top:2px;">
                    <strong>Critério:</strong> ${razoes}
                  </div>
                  <div style="font-size:11px;color:#0369a1;margin-top:2px;">
                    <strong>Matérias:</strong> ${assuntos}
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                  <span style="font-size:12px;font-weight:700;color:#334155;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #cbd5e1;">
                    ${lote.qtdProcessos} processos
                  </span>
                  <button type="button" class="btn-filtrar-este-lote" data-cluster-id="${escapeHtml(lote.idCluster)}" style="background:#2563eb;color:#fff;border:none;padding:5px 10px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">
                    Filtrar este Lote
                  </button>
                </div>
              </div>

              <!-- Lista de Processos do Lote -->
              <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e1;">
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${procs.map(p => `
                    <span style="font-family:monospace;font-size:11px;background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0;color:#1e293b;" title="${escapeHtml(p.tituloPartes || '')}">
                      ${escapeHtml(p.cnj)} [${escapeHtml(p.siglaClasse || '')}]
                    </span>
                  `).join('')}
                  ${restantes > 0 ? `<span style="font-size:11px;color:#64748b;padding:2px 4px;">(+ mais ${restantes})</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Event listeners
  const btnTodos = container.querySelector('#btn-filtrar-todos-semelhantes');
  if (btnTodos) {
    btnTodos.addEventListener('click', () => {
      if (typeof onFiltrarLote === 'function') {
        onFiltrarLote({ tipo: 'todos_escala', valor: 'Processos Semelhantes' });
      }
    });
  }

  container.querySelectorAll('.btn-filtrar-este-lote').forEach(btn => {
    btn.addEventListener('click', () => {
      const clusterId = btn.getAttribute('data-cluster-id');
      if (typeof onFiltrarLote === 'function') {
        onFiltrarLote({ tipo: 'escala', valor: clusterId });
      }
    });
  });
}
