import { escapeHtml } from '../classificadores/utils_texto.js';

/**
 * Painel Superior de Agrupamentos e Clusters Negociais:
 * - Concentração por Reclamada (com relação de CNPJs quando existentes)
 */

export function renderizarPainelAgrupamentos(container, processos, clustersSeriais = [], onFiltrar) {
  if (!container) return;

  // 1. Agrupamento por Reclamada (Polo Passivo)
  const mapaReclamadas = new Map(); // nomeNorm -> { nome, cnpjs: Set, total: 0 }
  for (const p of processos) {
    const passivos = (p.partes && p.partes.passivos) || [];
    for (const r of passivos) {
      const nome = (r.nome || '').trim();
      if (!nome) continue;
      const chave = nome.toUpperCase();
      if (!mapaReclamadas.has(chave)) {
        mapaReclamadas.set(chave, { nome, cnpjs: new Set(), total: 0 });
      }
      const reg = mapaReclamadas.get(chave);
      reg.total++;

      // Extrai documento real (documento, cnpj ou pessoaJuridica.cnpj)
      const doc = r.documento || r.cnpj || (r.pessoaJuridica && r.pessoaJuridica.cnpj) || r.numeroDocumento || null;
      if (doc && (doc.includes('/') || (r.tipoDocumento && String(r.tipoDocumento).toUpperCase() === 'CNPJ'))) {
        reg.cnpjs.add(doc.trim());
      }
    }
  }

  const topReclamadas = Array.from(mapaReclamadas.values())
    .filter(r => r.total >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  container.innerHTML = `
    <div class="painel-agrupamentos-grid painel-reclamadas-apenas">
      <!-- Card: Top Reclamadas -->
      <div class="card-agrupamento card-reclamadas-completo" style="background:#fff;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;padding:16px;">
        <div class="card-agrupamento-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
          <div>
            <span class="card-agrupamento-titulo" style="font-size:15px;font-weight:700;color:var(--text-primary, #0f172a);">Concentração por Reclamada</span>
            <div style="font-size:12px;color:var(--text-muted, #64748b);margin-top:2px;">Clique sobre qualquer empresa para filtrar seus processos na listagem</div>
          </div>
          <span class="card-agrupamento-badge" style="background:var(--primary-light, #eff6ff);color:var(--primary, #1e3a8a);font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;border:1px solid #bfdbfe;">
            ${topReclamadas.length} empresas com múltiplos processos
          </span>
        </div>
        <div class="card-agrupamento-corpo grade-reclamadas-chips" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:10px;">
          ${topReclamadas.length === 0 ? '<p class="texto-vazio-card" style="color:#64748b;font-size:13px;grid-column:1/-1;">Nenhuma repetição relevante de reclamada no lote.</p>' : ''}
          ${topReclamadas.map(r => {
            const nomeEscapado = escapeHtml(r.nome);
            const cnpjsStr = r.cnpjs.size > 0 ? Array.from(r.cnpjs).join(', ') : '';
            const cnpjsEscapado = escapeHtml(cnpjsStr);
            return `
              <div class="item-agrupamento-clicavel" data-tipo="reclamada" data-valor="${encodeURIComponent(r.nome)}" style="display:flex;flex-direction:column;justify-content:space-between;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;transition:all 0.15s ease;" title="Filtrar processos de ${nomeEscapado}">
                <div class="item-agrupamento-topo" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <span class="item-nome" style="font-size:13px;font-weight:600;color:#1e293b;word-break:break-word;">${nomeEscapado}</span>
                  <span class="item-qtd" style="background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap;">${r.total} proc.</span>
                </div>
                ${cnpjsEscapado ? `<div class="item-subinfo" style="font-size:11px;font-family:monospace;color:#64748b;margin-top:6px;" title="CNPJ(s): ${cnpjsEscapado}">CNPJ: ${cnpjsEscapado}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // Event listeners para cliques de agrupamento por reclamada
  const itensClicaveis = container.querySelectorAll('.item-agrupamento-clicavel');
  itensClicaveis.forEach(el => {
    el.addEventListener('click', () => {
      const tipo = el.getAttribute('data-tipo');
      const valor = decodeURIComponent(el.getAttribute('data-valor'));
      if (typeof onFiltrar === 'function') {
        onFiltrar({ tipo, valor });
      }
    });
  });
}
