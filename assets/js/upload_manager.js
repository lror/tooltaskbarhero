/**
 * [V1.1.0] Upload Manager Unificado
 * Processa .es3, .bak, .log, .dat simultaneamente via Web Workers
 */
class UnifiedUploadManager {
    constructor() {
        try {
            this.cryptoWorker = new Worker('/assets/js/workers/crypto_worker.js');
            this.cryptoWorker.onmessage = this.handleCryptoResult.bind(this);
            this.cryptoWorker.onerror = this.handleCryptoError.bind(this);
        } catch (e) {
            console.warn('[UploadManager] Web Worker não suportado ou erro ao inicializar:', e);
            this.cryptoWorker = null;
        }

        this.results = {
            saves: [],      // .es3 e .bak processados
            logs: [],       // .log parseados
            backends: [],   // .dat parseados
            errors: []
        };
    }

    async processFiles(fileList) {
        this.results = { saves: [], logs: [], backends: [], errors: [] };
        const files = Array.from(fileList);
        
        console.log(`[UploadManager] Processando ${files.length} arquivos...`);
        
        // Classificar arquivos por tipo
        const saves = files.filter(f => f.name.endsWith('.es3') || f.name.includes('.bak'));
        const logs = files.filter(f => f.name.endsWith('.log'));
        const backends = files.filter(f => f.name.endsWith('.dat'));
        
        // Processar em paralelo
        const promises = [];
        
        // 1. Saves via Crypto Worker
        for (const file of saves) {
            promises.push(this.processSave(file));
        }
        
        // 2. Logs via Log Parser
        for (const file of logs) {
            promises.push(this.processLog(file));
        }
        
        // 3. Backend.dat via Backend Parser
        for (const file of backends) {
            promises.push(this.processBackend(file));
        }
        
        await Promise.all(promises);
        
        console.log('[UploadManager] Processamento completo:', this.results);
        
        // Disparar evento global
        window.dispatchEvent(new CustomEvent('ttbh:unifiedUploadComplete', {
            detail: this.results
        }));
        
        return this.results;
    }

    async processSave(file) {
        const buffer = await file.arrayBuffer();
        const password = window.TTBH_CRYPTO_KEY || window.TTBH_DEFAULT_CRYPTO_KEY;
        
        if (this.cryptoWorker) {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (e.data.fileName === file.name) {
                        this.cryptoWorker.removeEventListener('message', handler);
                        
                        if (e.data.status === 'success') {
                            this.results.saves.push({
                                fileName: file.name,
                                parsedData: e.data.parsedData,
                                timestamp: file.lastModified
                            });
                        } else {
                            this.results.errors.push({
                                fileName: file.name,
                                error: e.data.error
                            });
                        }
                        resolve();
                    }
                };
                
                this.cryptoWorker.addEventListener('message', handler);
                this.cryptoWorker.postMessage({ fileName: file.name, fileBuffer: buffer, password });
            });
        } else {
            // Fallback direto via CryptoEngine e SaveParser se Worker falhar
            try {
                if (window.CryptoEngine && window.SaveParser) {
                    const cryptoEngine = new window.CryptoEngine();
                    const saveParser = new window.SaveParser();
                    const decrypted = await cryptoEngine.decryptBuffer(buffer, password);
                    const parsedData = saveParser.parse(decrypted);
                    this.results.saves.push({
                        fileName: file.name,
                        parsedData: parsedData,
                        timestamp: file.lastModified
                    });
                } else {
                    this.results.errors.push({ fileName: file.name, error: 'Motor de decodificação não disponível' });
                }
            } catch (err) {
                this.results.errors.push({ fileName: file.name, error: err.message });
            }
        }
    }

    async processLog(file) {
        try {
            const text = await file.text();
            let parsed = { raw: text };
            if (window.PlayerTelemetry) {
                const telem = new window.PlayerTelemetry(text);
                parsed = {
                    extracted: telem.extract(),
                    medianCycleMs: telem.medianCycleMs(),
                    suggestClearTimeSec: telem.suggestClearTimeSec(),
                    raw: text
                };
                if (typeof window.__updateTelemetryUI === 'function') {
                    window.__updateTelemetryUI(telem);
                }
            } else if (window.TTBH_LogParser) {
                parsed = window.TTBH_LogParser.parse(text);
            }
            
            this.results.logs.push({
                fileName: file.name,
                parsedData: parsed,
                timestamp: file.lastModified
            });
        } catch (error) {
            this.results.errors.push({ fileName: file.name, error: error.message });
        }
    }

    async processBackend(file) {
        try {
            const parsed = window.BackendParser ? 
                await window.BackendParser.parse(file) : 
                { raw: await file.text() };
            
            this.results.backends.push({
                fileName: file.name,
                parsedData: parsed,
                timestamp: file.lastModified
            });
        } catch (error) {
            this.results.errors.push({ fileName: file.name, error: error.message });
        }
    }

    handleCryptoResult(e) {
        console.log('[CryptoWorker] Resultado:', e.data);
    }

    handleCryptoError(e) {
        console.error('[CryptoWorker] Erro:', e.message);
        this.results.errors.push({ fileName: 'unknown', error: e.message });
    }
}

// Instância global
window.TTBH_UploadManager = new UnifiedUploadManager();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UnifiedUploadManager };
}
