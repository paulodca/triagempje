/**
 * Componente da barra compacta de métricas.
 */
export function renderizarBarraMetricas(container, estatisticas, clustersSeriais) {
  if (!container) return;

  const total = estatisticas.total || 0;
  const conhecimento = estatisticas.conhecimento || 0;
  const execucao = estatisticas.execucao || 0;
  const fazSemMpt = estatisticas.fazendaSemMpt || 0;
  const fisicos = estatisticas.processosFisicosMigrados || 0;
  const lotesSeriais = clustersSeriais ? clustersSeriais.totalClustersSeriais : 0;

  container.innerHTML = `
    <div class="grade-micro-kpis">
      <div class="card-micro-kpi" title="Total de processos na triagem">
        <span class="kpi-label">Total:</span>
        <strong class="kpi-valor">${total}</strong>
      </div>
      <div class="card-micro-kpi" title="Processos em fase de conhecimento">
        <span class="kpi-label">Conhecimento:</span>
        <strong class="kpi-valor">${conhecimento}</strong>
      </div>
      <div class="card-micro-kpi" title="Processos em fase de execução">
        <span class="kpi-label">Execução:</span>
        <strong class="kpi-valor">${execucao}</strong>
      </div>
      <div class="card-micro-kpi kpi-alerta-fazenda ${fazSemMpt > 0 ? 'tem-pendencia' : ''}" title="Processos com Fazenda Pública sem intervenção do MPT">
        <span class="kpi-label">Fazenda sem MPT:</span>
        <strong class="kpi-valor">${fazSemMpt}</strong>
      </div>
      <div class="card-micro-kpi kpi-destaque-semelhantes" title="Lotes identificados com petições/patronos semelhantes">
        <span class="kpi-label">Processos Semelhantes:</span>
        <strong class="kpi-valor">${lotesSeriais} lotes</strong>
      </div>
      <div class="card-micro-kpi" title="Processos originários do meio físico migrados para o PJe">
        <span class="kpi-label">Processos Físicos:</span>
        <strong class="kpi-valor">${fisicos}</strong>
      </div>
    </div>
  `;
}
