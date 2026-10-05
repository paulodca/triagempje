/**
 * Aviso legal de privacidade e conformidade LGPD (Lei nº 13.709/2018).
 */
export function renderizarAvisoPrivacidade(container, onLimparSessao) {
  if (!container) return;

  container.innerHTML = `
    <div class="card-privacidade" style="font-size:12px;color:var(--text-muted, #64748b);line-height:1.5;padding:12px 16px;background:var(--bg-muted, #f8fafc);border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;margin-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
        <div>
          <strong style="color:var(--text-primary, #1e293b);">Tratamento de Dados no Gabinete (LGPD - Lei nº 13.709/2018, art. 7º, II c/c art. 23):</strong>
          <p style="margin:4px 0 0;">
            O processamento ocorre integralmente no navegador do usuário, sem transmissão para servidores externos.
            Campos desnecessários à triagem (CPF, e-mails e telefones pessoais) são descartados na extração.
            Os dados residem exclusivamente no armazenamento local da sessão. Mantenha os registros apenas pelo período estritamente necessário à triagem do lote.
          </p>
        </div>
        <button id="btn-limpar-dados" style="padding:6px 12px;font-size:12px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;white-space:nowrap;">
          Limpar dados desta sessão
        </button>
      </div>
    </div>
  `;

  const btn = container.querySelector('#btn-limpar-dados');
  if (btn && typeof onLimparSessao === 'function') {
    btn.addEventListener('click', () => {
      if (confirm('Deseja realmente limpar todos os processos armazenados nesta sessão?')) {
        onLimparSessao();
      }
    });
  }
}
