import { salvarLote } from './db.js';
import { sanitizarProcessoLGPD } from '../coleta/sanitizacao_lgpd.js';

/**
 * Módulo de transporte de dados via window.postMessage.
 * Valida origens autorizadas (PJe TRT e mesma origem) e evita envio irrestrito para wildcard (*).
 */

/**
 * Valida se a origem da mensagem provém de tribunal oficial (.jus.br), da mesma origem ou de localhost.
 * @param {string} origem
 * @returns {boolean}
 */
export function ehOrigemValida(origem) {
  if (!origem || typeof origem !== 'string') return false;
  if (typeof location !== 'undefined' && origem === location.origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)) return true;
  try {
    const url = new URL(origem);
    return url.hostname.endsWith('.jus.br');
  } catch {
    return false;
  }
}

export function iniciarReceptorPostMessage(onDadosRecebidos) {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', async (event) => {
    // Validação estrita de segurança de origem
    if (!ehOrigemValida(event.origin)) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Handshake: responde ao ping do bookmarklet direcionado à origem emissora
    if (data.tipo === 'TRIAGEM_PING') {
      if (event.source && typeof event.source.postMessage === 'function') {
        event.source.postMessage({ tipo: 'TRIAGEM_PONG', app: 'TRIAGEM_PJE' }, event.origin);
      }
      return;
    }

    // Carga de lote de processos
    if (data.tipo === 'TRIAGEM_PAYLOAD' && Array.isArray(data.dados)) {
      try {
        const sanitizados = data.dados.map(sanitizarProcessoLGPD);
        await salvarLote(sanitizados);
        if (typeof onDadosRecebidos === 'function') {
          onDadosRecebidos(sanitizados);
        }

        // Confirma recebimento direcionado à origem emissora
        if (event.source && typeof event.source.postMessage === 'function') {
          event.source.postMessage({ tipo: 'TRIAGEM_CONFIRMADO', total: sanitizados.length }, event.origin);
        }
      } catch (err) {
        console.error('Erro ao processar lote via postMessage:', err);
      }
    }
  });

  // Avisa a janela de origem se aberta pelo PJe
  if (window.opener && typeof window.opener.postMessage === 'function') {
    const targetOrigin = (document.referrer && ehOrigemValida(new URL(document.referrer).origin))
      ? new URL(document.referrer).origin
      : 'https://pje.trt2.jus.br';
    window.opener.postMessage({ tipo: 'TRIAGEM_PRONTA' }, targetOrigin);
  }
}
