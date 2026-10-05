import { TabulatorFull as Tabulator } from '../../lib/tabulator_esm.min.js';
import { obterRotulosPolosContextuais } from '../classificadores/partes_representantes.js';
import { escapeHtml } from '../classificadores/utils_texto.js';

/**
 * Renderizador da tabela de processos da triagem utilizando Tabulator ESM v6.
 * Suporta seleção nativa de linhas, ordenação real, paginação e virtualização.
 */

// Paleta de cores suaves para diferenciação de grupos de processos semelhantes
const CORES_LOTES_SEMELHANTES = [
  '#2563eb', // Azul
  '#d97706', // Âmbar
  '#059669', // Esmeralda
  '#7c3aed', // Roxo
  '#db2777', // Rosa
  '#0891b2'  // Ciano
];

export function formatarDataDesde(dataIso) {
  if (!dataIso) return '—';
  try {
    const d = new Date(dataIso);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const aaaa = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${aaaa} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

export function obterDataDesdeRaw(p) {
  return (p.raw && p.raw.listagem && p.raw.listagem.dataEntradaTarefa) ||
         (p.raw && p.raw.processo && p.raw.processo.dataInicio) ||
         (p.temporalidade && p.temporalidade.emTriagemDesde) || null;
}

export function obterTimestampDesde(p) {
  const raw = obterDataDesdeRaw(p);
  return raw ? new Date(raw).getTime() : 0;
}

function formatarListaPartesPolo(listaPartes, rotuloPolo, cnjId) {
  if (!listaPartes || listaPartes.length === 0) return '';
  const visiveis = listaPartes.slice(0, 3);
  const restantes = listaPartes.slice(3);
  const idUnico = `polo-${rotuloPolo.toLowerCase()}-${cnjId.replace(/[^a-zA-Z0-9]/g, '')}`;

  let html = `<div class="bloco-polo" style="margin-bottom:4px;">`;
  html += `<span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(rotuloPolo)}:</span> `;
  
  const partesTxt = visiveis.map(p => {
    const nome = escapeHtml(p.nome || 'Parte sem nome');
    const doc = p.documento || p.cnpj || p.cpf || (p.pessoaJuridica && p.pessoaJuridica.cnpj) || p.numeroDocumento || null;
    const docStr = (doc && (doc.includes('/') || (p.tipoDocumento && String(p.tipoDocumento).toUpperCase() === 'CNPJ')))
      ? ` <span style="font-size:10px;color:#0369a1;font-weight:600;">(CNPJ ${escapeHtml(doc)})</span>`
      : '';
    return `<span style="font-size:12px;font-weight:500;color:#1e293b;">${nome}${docStr}</span>`;
  }).join(' <span style="color:#cbd5e1;">|</span> ');

  html += partesTxt;

  if (restantes.length > 0) {
    const restantesTxt = restantes.map(p => {
      const nome = escapeHtml(p.nome || 'Parte sem nome');
      const doc = p.documento || p.cnpj || p.cpf || (p.pessoaJuridica && p.pessoaJuridica.cnpj) || p.numeroDocumento || null;
      const docStr = (doc && (doc.includes('/') || (p.tipoDocumento && String(p.tipoDocumento).toUpperCase() === 'CNPJ')))
        ? ` <span style="font-size:10px;color:#0369a1;font-weight:600;">(CNPJ ${escapeHtml(doc)})</span>`
        : '';
      return `<div style="font-size:11px;color:#475569;padding:2px 0;">• ${nome}${docStr}</div>`;
    }).join('');

    html += `
      <button type="button" class="btn-ver-mais-partes" data-target="${idUnico}" style="background:none;border:none;color:#2563eb;font-size:11px;cursor:pointer;padding:0 4px;text-decoration:underline;">
        + ${restantes.length} partes (ver todas)
      </button>
      <div id="${idUnico}" class="container-partes-ocultas" style="display:none;margin-top:4px;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;">
        ${restantesTxt}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

export function renderizarTabela(container, listaProcessos, selecionadosSet = new Set(), onSelecaoChange = null, estadoFiltros = {}) {
  if (!container) return;

  if (!listaProcessos || listaProcessos.length === 0) {
    if (container._handlerTecladoTabela) {
      document.removeEventListener('keydown', container._handlerTecladoTabela);
      container._handlerTecladoTabela = null;
    }
    if (container._tabulatorInstance) {
      container._tabulatorInstance.destroy();
      container._tabulatorInstance = null;
    }
    container.innerHTML = `
      <div style="padding:48px 24px;text-align:center;color:var(--text-muted, #64748b);font-size:14px;background:#fff;border-radius:8px;">
        Nenhum processo encontrado para os filtros selecionados.
      </div>
    `;
    return;
  }

  const filtroSemelhantesAtivo = !!(
    estadoFiltros.apenasContenciosoEscala ||
    (estadoFiltros.agrupamentoAtivo && (estadoFiltros.agrupamentoAtivo.tipo === 'escala' || estadoFiltros.agrupamentoAtivo.tipo === 'todos_escala'))
  );

  // Mapeamento de cores para lotes de processos semelhantes
  const mapaCoresCluster = new Map();
  let indiceCor = 0;
  for (const p of listaProcessos) {
    if (p.clusterEscala && !mapaCoresCluster.has(p.clusterEscala.idCluster)) {
      mapaCoresCluster.set(p.clusterEscala.idCluster, CORES_LOTES_SEMELHANTES[indiceCor % CORES_LOTES_SEMELHANTES.length]);
      indiceCor++;
    }
  }

  // Prepara dados com campos pré-calculados para ordenação rápida
  const dadosTabela = listaProcessos.map(p => {
    return Object.assign({}, p, {
      timestampDesde: obterTimestampDesde(p),
      dataDesdeFormatada: formatarDataDesde(obterDataDesdeRaw(p)),
      siglaClasse: (p.classe && p.classe.sigla) || 'OUTROS',
      rotaClasse: (p.classe && p.classe.rota) || '',
      tituloPartes: (p.partes && p.partes.tituloPartes) || ''
    });
  });

  // Se já existe uma instância do Tabulator no container, apenas atualiza os dados
  if (container._tabulatorInstance) {
    const table = container._tabulatorInstance;
    table._syncEmAndamento = true;
    table.setData(dadosTabela).then(() => {
      table.deselectRow();
      const cnjs = Array.from(selecionadosSet);
      if (cnjs.length > 0) {
        table.selectRow(cnjs);
      }
      table._syncEmAndamento = false;
    });
    return;
  }

  // Cria estrutura DOM limpa para o Tabulator
  container.innerHTML = `<div id="grid-tabulator-processos" class="grid-tabulator-container" style="width:100%;"></div>`;
  const elTabela = container.querySelector('#grid-tabulator-processos');

  const colunas = [
    // 1. Coluna de Seleção Nativa com Checkbox Master
    {
      formatter: 'rowSelection',
      titleFormatter: 'rowSelection',
      titleFormatterParams: {
        rowRange: 'active'
      },
      hozAlign: 'center',
      headerHozAlign: 'center',
      headerSort: false,
      width: 44,
      cellClick: function(e, cell) {
        cell.getRow().toggleSelect();
      }
    },
    // 2. Processo / Classe
    {
      title: 'Processo / Classe',
      field: 'cnj',
      widthGrow: 2,
      minWidth: 190,
      sorter: 'string',
      formatter: function(cell) {
        const p = cell.getData();
        const cnj = escapeHtml(p.cnj || '');
        const sigla = escapeHtml(p.siglaClasse);
        const rota = escapeHtml(p.rotaClasse);
        return `
          <div class="col-processo-bloco">
            <div class="processo-cnj-texto" title="Clique para copiar" style="font-family:monospace;font-size:13px;font-weight:600;user-select:all;cursor:text;color:var(--gray-900, #0f172a);">${cnj}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
              <span style="background:var(--gray-100, #f1f5f9);color:var(--gray-700, #334155);padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;border:1px solid var(--gray-300, #cbd5e1);">${sigla}</span>
              <span style="font-size:11px;color:var(--gray-500, #64748b);">${rota}</span>
            </div>
          </div>
        `;
      }
    },
    // 3. Tempo na Tarefa
    {
      title: 'Desde',
      field: 'timestampDesde',
      width: 125,
      sorter: 'number',
      formatter: function(cell) {
        const p = cell.getData();
        return `
          <div style="font-size:12px;color:var(--gray-700, #334155);line-height:1.3;">
            <div style="font-weight:600;">${p.dataDesdeFormatada}</div>
            <div style="font-size:10px;color:var(--gray-400, #94a3b8);">Na tarefa</div>
          </div>
        `;
      }
    },
    // 4. Partes & Enquadramento
    {
      title: 'Partes & Enquadramento',
      field: 'tituloPartes',
      widthGrow: 4,
      minWidth: 260,
      headerSort: false,
      formatter: function(cell) {
        const p = cell.getData();
        const rotulosPolos = obterRotulosPolosContextuais(p.classe.sigla, p.classe.rota);
        const ativos = (p.partes && p.partes.ativos) || [];
        const passivos = (p.partes && p.partes.passivos) || [];
        const htmlAtivos = formatarListaPartesPolo(ativos, rotulosPolos.poloAtivoRotulo, p.cnj);
        const htmlPassivos = formatarListaPartesPolo(passivos, rotulosPolos.poloPassivoRotulo, p.cnj);

        let badgesPj = '';
        if (p.pjs && p.pjs.temFazendaPublica) {
          badgesPj += `<span class="badge badge-fazenda" style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">FAZENDA PÚBLICA</span>`;
        }
        if (p.pjs && p.pjs.temRecuperacaoJudicial) {
          badgesPj += `<span class="badge badge-rj" style="background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">REC. JUDICIAL</span>`;
        }
        if (p.pjs && p.pjs.temMassaFalida) {
          badgesPj += `<span class="badge badge-falida" style="background:#f3e8ff;color:#7e22ce;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">MASSA FALIDA</span>`;
        }
        if (p.sindicatos && p.sindicatos.temSindicato) {
          badgesPj += `<span class="badge badge-sindicato" style="background:#ccfbf1;color:#0f766e;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">SINDICATO</span>`;
        }

        return `
          <div style="padding:2px 0;">
            ${htmlAtivos}
            ${htmlPassivos}
            ${badgesPj ? `<div style="margin-top:4px;">${badgesPj}</div>` : ''}
          </div>
        `;
      }
    },
    // 5. Assuntos
    {
      title: 'Assuntos',
      field: 'assuntos',
      widthGrow: 2,
      minWidth: 200,
      headerSort: false,
      formatter: function(cell) {
        const p = cell.getData();
        const assuntosItens = (p.assuntos && p.assuntos.itens) || [];
        let assuntosHtml = escapeHtml(assuntosItens.slice(0, 3).map(a => a.nome).join('; '));
        if (assuntosItens.length > 3) {
          assuntosHtml += ` <em style="color:var(--gray-500, #64748b);font-size:11px;">(+ ${assuntosItens.length - 3})</em>`;
        }
        return `<div style="font-size:12px;line-height:1.4;color:var(--gray-700, #334155);">${assuntosHtml || '—'}</div>`;
      }
    },
    // 6. Alertas
    {
      title: 'Alertas',
      field: 'alertas',
      widthGrow: 2,
      minWidth: 190,
      headerSort: false,
      formatter: function(cell) {
        const p = cell.getData();
        const alertasBadges = [];

        if (p.pjs && p.pjs.temFazendaPublica && p.partes && !p.partes.mptPresente) {
          alertasBadges.push(`<span class="badge badge-mpt-alerta" style="background:#fee2e2;color:#b91c1c;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:2px;">Fazenda sem MPT</span>`);
        }

        if (p.temporalidade && p.temporalidade.ehProcessoFisicoMigrado) {
          alertasBadges.push(`<span class="badge badge-fisico" style="background:#ffedd5;color:#c2410c;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:2px;" title="${escapeHtml(p.temporalidade.alertaAutos)}">Processo físico</span>`);
        }

        if (p.ehContenciosoEmEscala && p.clusterEscala) {
          const rotuloEscala = escapeHtml(p.clusterEscala.rotulo || 'Processos semelhantes');
          alertasBadges.push(`
            <span class="badge badge-escala" style="background:#fef08a;color:#854d0e;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:2px;" title="${rotuloEscala}">
              Semelhantes (${p.clusterEscala.qtdProcessos || 2})
            </span>
          `);
        }

        if (p.triagem && p.triagem.prevencao && p.triagem.prevencao.vinculaTurma) {
          alertasBadges.push(`<span class="badge badge-prevencao" style="background:#e0e7ff;color:#4338ca;padding:3px 6px;border-radius:4px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:2px;" title="${escapeHtml(p.triagem.prevencao.descricao)}">Prevenção</span>`);
        }

        return `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">${alertasBadges.join('')}</div>`;
      }
    }
  ];

  // Instanciação oficial do Tabulator
  const table = new Tabulator(elTabela, {
    data: dadosTabela,
    index: 'cnj',
    columns: colunas,
    layout: 'fitColumns',
    responsiveLayout: false,
    pagination: true,
    paginationSize: 50,
    paginationSizeSelector: [25, 50, 100, 200],
    paginationCounter: 'rows',
    locale: 'pt-br',
    langs: {
      'pt-br': {
        pagination: {
          page_size: 'Linhas por página:',
          first: 'Primeira',
          first_title: 'Primeira página',
          last: 'Última',
          last_title: 'Última página',
          prev: 'Anterior',
          prev_title: 'Página anterior',
          next: 'Próxima',
          next_title: 'Próxima página',
          counter: {
            showing: 'Exibindo',
            of: 'de',
            rows: 'processos',
            pages: 'páginas'
          }
        }
      }
    },
    initialSort: [
      { column: 'timestampDesde', dir: 'asc' }
    ],
    rowFormatter: function(row) {
      const p = row.getData();
      const el = row.getElement();
      if (filtroSemelhantesAtivo && p.clusterEscala && mapaCoresCluster.has(p.clusterEscala.idCluster)) {
        const cor = mapaCoresCluster.get(p.clusterEscala.idCluster);
        el.style.borderLeft = `5px solid ${cor}`;
      } else {
        el.style.borderLeft = '';
      }
    }
  });

  container._tabulatorInstance = table;

  // Sincronização da seleção nativa com selecionadosSet
  table.on('tableBuilt', () => {
    table._syncEmAndamento = true;
    const cnjs = Array.from(selecionadosSet);
    if (cnjs.length > 0) {
      table.selectRow(cnjs);
    }
    table._syncEmAndamento = false;
  });

  table.on('rowSelectionChanged', (data) => {
    if (table._syncEmAndamento) return;
    selecionadosSet.clear();
    for (const item of data) {
      if (item && item.cnj) {
        selecionadosSet.add(item.cnj);
      }
    }
    if (typeof onSelecaoChange === 'function') {
      onSelecaoChange(selecionadosSet);
    }
  });

  // Delegação de evento para expandir partes extras (+ X partes)
  elTabela.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-ver-mais-partes');
    if (btn) {
      const targetId = btn.getAttribute('data-target');
      const box = document.getElementById(targetId);
      if (box) {
        const estaAberto = box.style.display !== 'none';
        box.style.display = estaAberto ? 'none' : 'block';
        btn.textContent = estaAberto ? btn.textContent.replace('ocultar', 'ver todas') : 'ocultar partes extras';
      }
    }
  });

  // Micro-toast de feedback para atalhos de teclado
  function mostrarMicroToast(msg) {
    let t = document.getElementById('toast-tabela-triagem');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast-tabela-triagem';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }

  // Atalho de Teclado Global: C para copiar CNJs selecionados
  if (container._handlerTecladoTabela) {
    document.removeEventListener('keydown', container._handlerTecladoTabela);
  }

  container._handlerTecladoTabela = (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && document.activeElement.type !== 'checkbox') {
      return;
    }

    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const selecionados = Array.from(selecionadosSet);
      if (selecionados.length > 0) {
        navigator.clipboard.writeText(selecionados.join('\n')).then(() => {
          mostrarMicroToast(`${selecionados.length} CNJ(s) copiado(s) para a área de transferência!`);
        });
      }
    }
  };

  document.addEventListener('keydown', container._handlerTecladoTabela);
}
