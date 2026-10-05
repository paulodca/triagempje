/**
 * Camada de persistência local baseada em IndexedDB.
 * Mantém os dados na origem do app no navegador, sem salvar arquivos soltos em pastas do sistema.
 */

const DB_NAME = 'TriagemPJeDB';
const DB_VERSION = 1;
const STORE_NAME = 'processos';

export function abrirDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado neste ambiente'));
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cnj' });
        store.createIndex('idProcesso', 'idProcesso', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function salvarLote(listaProcessos) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Substituição limpa de sessão: limpa registros antigos para evitar misturar lotes
    store.clear();

    for (const item of listaProcessos) {
      if (!item) continue;
      const cnj = (item.cnj || (item.processo && item.processo.numero) || String(item.idProcesso)).trim();
      store.put(Object.assign({}, item, { cnj }));
    }

    tx.oncomplete = () => resolve(listaProcessos.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function obterTodos() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function limparSessao() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function contarProcessos() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();

    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}
