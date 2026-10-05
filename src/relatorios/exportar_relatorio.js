import { escapeHtml } from '../classificadores/utils_texto.js';

/**
 * Módulo de Exportação de Relatório Completo de Triagem para Impressão e PDF.
 * Gera documento com formatação institucional do TRT-2, sem expor nomes de advogados
 * e com eufemismo de processos semelhantes.
 *
 * Utiliza iframe oculto na própria página para impressão, eliminando o bloqueio de popups
 * e dispensando document.write / window.open.
 */

export function exportarRelatorioPdf({ processos = [], estatisticas = {}, clustersSeriais = {} }) {
  const dataHoje = new Date().toLocaleString('pt-BR');
  const lotesEscala = (clustersSeriais && clustersSeriais.clusters) || [];

  // 1. Agrupamento por Reclamada com extração de CNPJs reais
  const mapaReclamadas = new Map();
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
      
      const doc = r.documento || r.cnpj || (r.pessoaJuridica && r.pessoaJuridica.cnpj) || r.numeroDocumento || null;
      if (doc && (doc.includes('/') || (r.tipoDocumento && String(r.tipoDocumento).toUpperCase() === 'CNPJ'))) {
        reg.cnpjs.add(doc.trim());
      }
    }
  }

  const topReclamadas = Array.from(mapaReclamadas.values())
    .filter(r => r.total >= 2)
    .sort((a, b) => b.total - a.total);

  // 2. Fazenda sem MPT
  const fazendaSemMpt = processos.filter(p => p.pjs && p.pjs.temFazendaPublica && p.partes && !p.partes.mptPresente);

  // 3. Físicos
  const fisicosMigrados = processos.filter(p => p.temporalidade && p.temporalidade.ehProcessoFisicoMigrado);

  const htmlRelatorio = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Triagem Prévia — TRT-2</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 15mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
    }
    .header-institucional {
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-institucional h1 {
      font-size: 16pt;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-institucional .subtitulo {
      font-size: 10pt;
      color: #475569;
      margin: 0;
    }
    .quadro-metricas {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .card-metrica {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .card-metrica .label {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .card-metrica .valor {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    h2 {
      font-size: 12pt;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 16px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 8.5pt;
      text-transform: uppercase;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: 700;
    }
    .badge-alerta {
      background: #fee2e2;
      color: #b91c1c;
    }
    .badge-escala {
      background: #fef08a;
      color: #854d0e;
    }
    .badge-fisico {
      background: #ffedd5;
      color: #c2410c;
    }
    .btn-imprimir {
      padding: 8px 16px;
      background: #1e3a8a;
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 16px;
    }
    @media print {
      .btn-imprimir {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <button class="btn-imprimir" onclick="window.print()">Imprimir / Salvar como PDF</button>

  <div class="header-institucional">
    <h1>Tribunal Regional do Trabalho da 2ª Região</h1>
    <div class="subtitulo">Gabinete / Assessoria de Turma — Relatório Sintético de Triagem Prévia de Pauta</div>
    <div class="subtitulo">Emissão em: <strong>${dataHoje}</strong> | Volume Analisado: <strong>${processos.length} processos</strong></div>
  </div>

  <div class="quadro-metricas">
    <div class="card-metrica">
      <div class="label">Total Processos</div>
      <div class="valor">${processos.length}</div>
    </div>
    <div class="card-metrica">
      <div class="label">Fase de Conhecimento</div>
      <div class="valor">${estatisticas.conhecimento || 0}</div>
    </div>
    <div class="card-metrica">
      <div class="label">Fase de Execução</div>
      <div class="valor">${estatisticas.execucao || 0}</div>
    </div>
    <div class="card-metrica">
      <div class="label">Fazenda sem MPT</div>
      <div class="valor" style="color:#b91c1c;">${fazendaSemMpt.length}</div>
    </div>
    <div class="card-metrica">
      <div class="label">Processos Semelhantes</div>
      <div class="valor" style="color:#854d0e;">${lotesEscala.length} lotes</div>
    </div>
    <div class="card-metrica">
      <div class="label">Processos em Lotes</div>
      <div class="valor" style="color:#854d0e;">${clustersSeriais.totalProcessosEmLoteSerial || 0}</div>
    </div>
    <div class="card-metrica">
      <div class="label">Processos Físicos</div>
      <div class="valor" style="color:#c2410c;">${fisicosMigrados.length}</div>
    </div>
    <div class="card-metrica">
      <div class="label">Entidades Sindicais</div>
      <div class="valor" style="color:#0f766e;">${estatisticas.comSindicato || 0}</div>
    </div>
  </div>

  <h2>1. Processos Semelhantes Identificados (${lotesEscala.length})</h2>
  ${lotesEscala.length === 0 ? '<p>Nenhum lote com pedidos idênticos identificado.</p>' : `
    <table>
      <thead>
        <tr>
          <th style="width:25%;">Critério de Agrupamento</th>
          <th style="width:10%;">Qtd</th>
          <th style="width:25%;">Pedidos / Matérias</th>
          <th>Processos do Grupo (CNJ e Partes)</th>
        </tr>
      </thead>
      <tbody>
        ${lotesEscala.map(l => `
          <tr>
            <td><strong>${escapeHtml((l.razoes || ['mesmo cadastro de OAB', 'assuntos idênticos']).join(' • '))}</strong></td>
            <td><strong>${l.qtdProcessos} proc.</strong></td>
            <td>${escapeHtml(l.assuntosResumo)}</td>
            <td>
              <ul style="margin:0;padding-left:14px;font-size:8.5pt;">
                ${(l.processosRelacionados || []).map(pr => `
                  <li><span style="font-family:monospace;font-weight:600;">${escapeHtml(pr.cnj)}</span> [${escapeHtml(pr.siglaClasse)}] - ${escapeHtml(pr.tituloPartes)}</li>
                `).join('')}
              </ul>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `}

  <h2>2. Concentração por Reclamada (${topReclamadas.length} empresas com &ge; 2 processos)</h2>
  ${topReclamadas.length === 0 ? '<p>Sem concentração relevante de reclamadas no lote.</p>' : `
    <table>
      <thead>
        <tr>
          <th style="width:50%;">Reclamada</th>
          <th style="width:15%;">Processos</th>
          <th>CNPJs Vinculados</th>
        </tr>
      </thead>
      <tbody>
        ${topReclamadas.map(r => `
          <tr>
            <td><strong>${escapeHtml(r.nome)}</strong></td>
            <td><strong>${r.total} processos</strong></td>
            <td style="font-family:monospace;font-size:8.5pt;">${Array.from(r.cnpjs).join(', ') || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `}

  <h2>3. Alertas Críticos — Fazenda Pública com Necessidade de Inclusão do MPT (${fazendaSemMpt.length})</h2>
  ${fazendaSemMpt.length === 0 ? '<p>Nenhum processo com pendência de inclusão do Ministério Público do Trabalho.</p>' : `
    <table>
      <thead>
        <tr>
          <th style="width:25%;">Processo / Classe</th>
          <th style="width:40%;">Partes</th>
          <th>Providência Recomendada</th>
        </tr>
      </thead>
      <tbody>
        ${fazendaSemMpt.map(p => `
          <tr>
            <td><strong style="font-family:monospace;">${escapeHtml(p.cnj)}</strong><br><span class="badge" style="background:#f1f5f9;">${escapeHtml(p.classe.sigla)}</span></td>
            <td>${escapeHtml(p.partes.tituloPartes)}</td>
            <td><span class="badge badge-alerta">FAZENDA PÚBLICA — RETIFICAR AUTUAÇÃO PARA INCLUIR MPT</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `}

  <h2>4. Processos Físicos (${fisicosMigrados.length})</h2>
  ${fisicosMigrados.length === 0 ? '<p>Nenhum processo físico identificado.</p>' : `
    <table>
      <thead>
        <tr>
          <th style="width:25%;">Processo / Classe</th>
          <th style="width:50%;">Partes</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>
        ${fisicosMigrados.map(p => `
          <tr>
            <td><strong style="font-family:monospace;">${escapeHtml(p.cnj)}</strong><br><span class="badge" style="background:#f1f5f9;">${escapeHtml(p.classe.sigla)}</span></td>
            <td>${escapeHtml(p.partes.tituloPartes)}</td>
            <td><span class="badge badge-fisico">Processo físico</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `}

  </body>
</html>
`;

  // Impressão direta via iframe oculto na própria página
  let iframe = document.getElementById('iframe-impressao-relatorio');
  if (iframe) {
    iframe.remove();
  }
  iframe = document.createElement('iframe');
  iframe.id = 'iframe-impressao-relatorio';
  iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn('Erro ao disparar impressão via iframe:', err);
    }
  };
  iframe.srcdoc = htmlRelatorio;
}
