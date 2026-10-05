/**
 * Módulo de filtros e facetas da interface com Revelação Progressiva.
 * Mantém busca e seleção de fases visíveis na barra primária,
 * e agrupa classes e facetas em uma gaveta retrátil de Filtros Avançados.
 */

export function criarGerenciadorFiltros(processos, onFiltrosAlterados) {
  const estado = {
    buscaTexto: '',
    rota: 'TODAS',
    classesSelecionadas: new Set(), // Set de siglas selecionadas (vazio = todas)
    apenasFazendaSemMpt: false,
    apenasRecuperacaoJudicial: false,
    apenasMassaFalida: false,
    apenasSindicato: false,
    apenasContenciosoEscala: false,
    apenasFisicosMigrados: false,
    agrupamentoAtivo: null, // { tipo: 'reclamada'|'patrono'|'assunto'|'escala'|'todos_escala', valor: string }
    gavetaAberta: false
  };

  function contarFiltrosAvancadosAtivos() {
    let cont = 0;
    if (estado.classesSelecionadas.size > 0) cont += estado.classesSelecionadas.size;
    if (estado.apenasFazendaSemMpt) cont++;
    if (estado.apenasRecuperacaoJudicial) cont++;
    if (estado.apenasMassaFalida) cont++;
    if (estado.apenasSindicato) cont++;
    if (estado.apenasContenciosoEscala) cont++;
    if (estado.apenasFisicosMigrados) cont++;
    return cont;
  }

  function aplicarFiltros() {
    let filtrados = processos.slice();

    // 1. Busca textual (CNJ, partes, patronos, assuntos)
    if (estado.buscaTexto) {
      const q = estado.buscaTexto.toLowerCase();
      filtrados = filtrados.filter(p => {
        const cnj = (p.cnj || '').toLowerCase();
        const partes = (p.partes && p.partes.tituloPartes || '').toLowerCase();
        const patronos = (p.partes && p.partes.patronos && p.partes.patronos.map(pat => (pat.nome || '') + ' ' + (pat.numeroOab || '')).join(' ') || '').toLowerCase();
        const assuntos = (p.assuntos && p.assuntos.itens && p.assuntos.itens.map(a => a.nome).join(' ') || '').toLowerCase();
        return cnj.includes(q) || partes.includes(q) || patronos.includes(q) || assuntos.includes(q);
      });
    }

    // 2. Filtro de Rota
    if (estado.rota !== 'TODAS') {
      filtrados = filtrados.filter(p => p.classe && p.classe.rota === estado.rota);
    }

    // 3. Filtro de Classes Múltiplas (Checkboxes)
    if (estado.classesSelecionadas.size > 0) {
      filtrados = filtrados.filter(p => p.classe && estado.classesSelecionadas.has(p.classe.sigla));
    }

    // 4. Facetas booleanas
    if (estado.apenasFazendaSemMpt) {
      filtrados = filtrados.filter(p => p.pjs && p.pjs.temFazendaPublica && p.partes && !p.partes.mptPresente);
    }
    if (estado.apenasRecuperacaoJudicial) {
      filtrados = filtrados.filter(p => p.pjs && p.pjs.temRecuperacaoJudicial);
    }
    if (estado.apenasMassaFalida) {
      filtrados = filtrados.filter(p => p.pjs && p.pjs.temMassaFalida);
    }
    if (estado.apenasSindicato) {
      filtrados = filtrados.filter(p => p.sindicatos && p.sindicatos.temSindicato);
    }
    if (estado.apenasContenciosoEscala) {
      filtrados = filtrados.filter(p => p.ehContenciosoEmEscala);
    }
    if (estado.apenasFisicosMigrados) {
      filtrados = filtrados.filter(p => p.temporalidade && p.temporalidade.ehProcessoFisicoMigrado);
    }

    // 5. Agrupamento ativo via clique no painel superior
    if (estado.agrupamentoAtivo) {
      const { tipo, valor } = estado.agrupamentoAtivo;
      if (tipo === 'reclamada') {
        const alvo = valor.toUpperCase();
        filtrados = filtrados.filter(p => {
          const passivos = (p.partes && p.partes.passivos) || [];
          return passivos.some(r => (r.nome || '').toUpperCase().includes(alvo));
        });
      } else if (tipo === 'patrono') {
        filtrados = filtrados.filter(p => {
          const pats = (p.partes && p.partes.patronos) || [];
          return pats.some(pat => (pat.nome || '').includes(valor) || (pat.numeroOab || '').includes(valor));
        });
      } else if (tipo === 'assunto') {
        filtrados = filtrados.filter(p => {
          const itens = (p.assuntos && p.assuntos.itens) || [];
          return itens.some(a => (a.nome || '').includes(valor));
        });
      } else if (tipo === 'escala') {
        filtrados = filtrados.filter(p => p.clusterEscala && p.clusterEscala.idCluster === valor);
      } else if (tipo === 'todos_escala') {
        filtrados = filtrados.filter(p => p.ehContenciosoEmEscala);
      }
    }

    if (typeof onFiltrosAlterados === 'function') {
      onFiltrosAlterados(filtrados, estado);
    }
  }

  function renderizar(container) {
    if (!container) return;

    // Extrai classes dinamicamente
    const classesDisponiveis = Array.from(new Set(processos.map(p => (p.classe && p.classe.sigla) || 'OUTROS'))).sort();
    const qtdAvancados = contarFiltrosAvancadosAtivos();

    const iconeSlidersSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`;

    container.innerHTML = `
      <div class="painel-filtros-progressivo" style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;background:var(--bg-surface, #fff);border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        
        <!-- BARRA PRIMÁRIA: Sempre visível -->
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
          <div style="flex:1;min-width:260px;">
            <input type="text" id="filtro-busca" value="${estado.buscaTexto}" placeholder="Buscar por CNJ, Parte, Advogado, OAB ou Assunto..." style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;box-sizing:border-box;">
          </div>

          <!-- Segmento Rápido de Rotas -->
          <div class="grupo-segmento-rotas" style="display:inline-flex;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#f8fafc;">
            <button type="button" class="btn-segmento-rota ${estado.rota === 'TODAS' ? 'ativo' : ''}" data-rota="TODAS" style="padding:7px 12px;font-size:12px;font-weight:600;border:none;background:${estado.rota === 'TODAS' ? '#1e3a8a' : 'transparent'};color:${estado.rota === 'TODAS' ? '#fff' : '#475569'};cursor:pointer;">
              Todas as Fases
            </button>
            <button type="button" class="btn-segmento-rota ${estado.rota === 'CONHECIMENTO' ? 'ativo' : ''}" data-rota="CONHECIMENTO" style="padding:7px 12px;font-size:12px;font-weight:600;border:none;border-left:1px solid #cbd5e1;background:${estado.rota === 'CONHECIMENTO' ? '#1e3a8a' : 'transparent'};color:${estado.rota === 'CONHECIMENTO' ? '#fff' : '#475569'};cursor:pointer;">
              Conhecimento (RO)
            </button>
            <button type="button" class="btn-segmento-rota ${estado.rota === 'EXECUCAO' ? 'ativo' : ''}" data-rota="EXECUCAO" style="padding:7px 12px;font-size:12px;font-weight:600;border:none;border-left:1px solid #cbd5e1;background:${estado.rota === 'EXECUCAO' ? '#1e3a8a' : 'transparent'};color:${estado.rota === 'EXECUCAO' ? '#fff' : '#475569'};cursor:pointer;">
              Execução (AP)
            </button>
          </div>

          <!-- Botão Toggle da Gaveta de Filtros Avançados -->
          <button type="button" id="btn-toggle-gaveta" class="btn-toggle-filtros-avancados" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;background:${estado.gavetaAberta ? '#eff6ff' : '#f8fafc'};border:1px solid ${estado.gavetaAberta ? '#93c5fd' : '#cbd5e1'};border-radius:6px;font-size:12px;font-weight:700;color:${estado.gavetaAberta ? '#1e3a8a' : '#334155'};cursor:pointer;user-select:none;">
            ${iconeSlidersSvg}
            <span>Filtros Avançados</span>
            ${qtdAvancados > 0 ? `
              <span style="background:#1e3a8a;color:#fff;padding:1px 6px;border-radius:10px;font-size:11px;font-weight:700;">${qtdAvancados}</span>
            ` : ''}
            <span style="font-size:10px;color:#64748b;">${estado.gavetaAberta ? '▲' : '▼'}</span>
          </button>

          ${estado.agrupamentoAtivo ? `
            <div id="badge-agrupamento-ativo" style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;background:#e0e7ff;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;font-weight:600;color:#3730a3;">
              <span>Filtro Ativo: ${estado.agrupamentoAtivo.tipo === 'todos_escala' ? 'Processos Semelhantes' : estado.agrupamentoAtivo.valor}</span>
              <button type="button" id="btn-remover-agrupamento" title="Remover filtro de agrupamento" style="background:none;border:none;color:#4338ca;cursor:pointer;font-weight:700;padding:0 2px;">&times;</button>
            </div>
          ` : ''}
        </div>

        <!-- GAVETA RETRÁTIL: Filtros Avançados -->
        <div id="gaveta-filtros-avancados" style="display:${estado.gavetaAberta ? 'block' : 'none'};padding-top:10px;border-top:1px dashed #cbd5e1;margin-top:4px;">
          
          <!-- Seção de Classes Processuais -->
          <div style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Classes Processuais:</span>
              ${estado.classesSelecionadas.size > 0 ? `
                <button type="button" id="btn-limpar-classes" style="background:none;border:none;color:#2563eb;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;">Limpar seleção de classes</button>
              ` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${classesDisponiveis.map(sigla => {
                const checked = estado.classesSelecionadas.has(sigla) ? 'checked' : '';
                return `
                  <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;padding:4px 8px;background:${checked ? '#eff6ff' : '#f8fafc'};border:1px solid ${checked ? '#93c5fd' : '#e2e8f0'};border-radius:4px;user-select:none;">
                    <input type="checkbox" class="chk-filtro-classe" data-sigla="${sigla}" ${checked}> ${sigla}
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Seção de Facetas e Alertas Específicos -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Enquadramento &amp; Alertas Especiais:</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;user-select:none;">
                <input type="checkbox" id="chk-fazenda-sem-mpt" ${estado.apenasFazendaSemMpt ? 'checked' : ''}> Fazenda sem MPT
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;user-select:none;">
                <input type="checkbox" id="chk-rec-judicial" ${estado.apenasRecuperacaoJudicial ? 'checked' : ''}> Recuperação Judicial
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;user-select:none;">
                <input type="checkbox" id="chk-massa-falida" ${estado.apenasMassaFalida ? 'checked' : ''}> Massa Falida
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;user-select:none;">
                <input type="checkbox" id="chk-sindicato" ${estado.apenasSindicato ? 'checked' : ''}> Entidade Sindical
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 9px;background:#fef08a;border:1px solid #fde047;border-radius:6px;font-weight:600;color:#854d0e;user-select:none;">
                <input type="checkbox" id="chk-contencioso-escala" ${estado.apenasContenciosoEscala ? 'checked' : ''}> Processos semelhantes
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 9px;background:#ffedd5;border:1px solid #fed7aa;border-radius:6px;font-weight:600;color:#c2410c;user-select:none;">
                <input type="checkbox" id="chk-fisico-migrado" ${estado.apenasFisicosMigrados ? 'checked' : ''}> Processo físico migrado
              </label>
            </div>
          </div>

        </div>
      </div>
    `;

    // Event listeners
    const inputBusca = container.querySelector('#filtro-busca');
    inputBusca.addEventListener('input', (e) => {
      estado.buscaTexto = e.target.value.trim();
      aplicarFiltros();
    });

    // Segmentos de rota
    container.querySelectorAll('.btn-segmento-rota').forEach(btn => {
      btn.addEventListener('click', () => {
        const rota = btn.getAttribute('data-rota');
        estado.rota = rota;
        aplicarFiltros();
        renderizar(container);
      });
    });

    // Toggle da gaveta retrátil
    const btnToggle = container.querySelector('#btn-toggle-gaveta');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        estado.gavetaAberta = !estado.gavetaAberta;
        renderizar(container);
      });
    }

    // Checkboxes múltiplos de classe
    container.querySelectorAll('.chk-filtro-classe').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const sigla = e.target.getAttribute('data-sigla');
        if (e.target.checked) {
          estado.classesSelecionadas.add(sigla);
        } else {
          estado.classesSelecionadas.delete(sigla);
        }
        aplicarFiltros();
        renderizar(container);
      });
    });

    const btnLimparClasses = container.querySelector('#btn-limpar-classes');
    if (btnLimparClasses) {
      btnLimparClasses.addEventListener('click', () => {
        estado.classesSelecionadas.clear();
        aplicarFiltros();
        renderizar(container);
      });
    }

    const chkFazenda = container.querySelector('#chk-fazenda-sem-mpt');
    if (chkFazenda) {
      chkFazenda.addEventListener('change', (e) => {
        estado.apenasFazendaSemMpt = e.target.checked;
        aplicarFiltros();
      });
    }

    const chkRecJudicial = container.querySelector('#chk-rec-judicial');
    if (chkRecJudicial) {
      chkRecJudicial.addEventListener('change', (e) => {
        estado.apenasRecuperacaoJudicial = e.target.checked;
        aplicarFiltros();
      });
    }

    const chkMassaFalida = container.querySelector('#chk-massa-falida');
    if (chkMassaFalida) {
      chkMassaFalida.addEventListener('change', (e) => {
        estado.apenasMassaFalida = e.target.checked;
        aplicarFiltros();
      });
    }

    const chkSindicato = container.querySelector('#chk-sindicato');
    if (chkSindicato) {
      chkSindicato.addEventListener('change', (e) => {
        estado.apenasSindicato = e.target.checked;
        aplicarFiltros();
      });
    }

    const chkEscala = container.querySelector('#chk-contencioso-escala');
    if (chkEscala) {
      chkEscala.addEventListener('change', (e) => {
        estado.apenasContenciosoEscala = e.target.checked;
        aplicarFiltros();
      });
    }

    const chkFisico = container.querySelector('#chk-fisico-migrado');
    if (chkFisico) {
      chkFisico.addEventListener('change', (e) => {
        estado.apenasFisicosMigrados = e.target.checked;
        aplicarFiltros();
      });
    }

    const btnRemoverAgrupamento = container.querySelector('#btn-remover-agrupamento');
    if (btnRemoverAgrupamento) {
      btnRemoverAgrupamento.addEventListener('click', () => {
        estado.agrupamentoAtivo = null;
        aplicarFiltros();
        renderizar(container);
      });
    }
  }

  return {
    renderizar,
    aplicarFiltros,
    setAgrupamento: (agrupamento, container) => {
      estado.agrupamentoAtivo = agrupamento;
      aplicarFiltros();
      if (container) renderizar(container);
    },
    setEstado: (novoEstado) => {
      Object.assign(estado, novoEstado);
      aplicarFiltros();
    }
  };
}
