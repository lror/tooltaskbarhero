/**
 * [FEAT-1103] IndexedDB para Histórico Local e Gráficos de Progressão
 */
const DB_NAME = 'TTBH_HistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

let dbInstance = null;

const HistoryDB = {
    async init() {
        if (dbInstance) return dbInstance;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
                }
            };
            request.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async saveSnapshot(parsedData) {
        await this.init();
        try {
            // Extrair resumo para evitar esgotar quota de armazenamento
            const tier7Count = (parsedData.storage || []).filter(i => i.tier >= 7).length;
            const snapshot = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                currentStage: parsedData.account?.currentStage || 0,
                gold: parsedData.currencies?.gold || 0,
                tier7ItemsCount: tier7Count,
                heroCount: (parsedData.heroes || []).length
            };
            
            return new Promise((resolve, reject) => {
                const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.put(snapshot);
                request.onsuccess = () => resolve(snapshot);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (err) {
            console.warn('[HistoryDB] Falha ao salvar snapshot:', err);
        }
    },

    async getProgressionData() {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = dbInstance.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = (e) => {
                // Ordenar por timestamp crescente para gráficos de progressão
                const data = e.target.result.sort((a, b) => a.timestamp - b.timestamp);
                resolve(data);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

window.TTBH_HistoryDB = HistoryDB;
