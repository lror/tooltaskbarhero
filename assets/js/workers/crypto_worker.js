/**
 * [FEAT-1102] Web Worker para Descriptografia Assíncrona
 * Importa os módulos necessários e processa buffers sem bloquear a Main Thread.
 */
importScripts('/assets/js/crypto.js', '/assets/js/save_parser.js');

self.onmessage = async function(e) {
    const { fileName, fileBuffer, password } = e.data;
    
    try {
        const decryptedBuffer = await cryptoEngine.decryptBuffer(fileBuffer, password);
        const parsedData = saveParser.parse(decryptedBuffer);
        
        self.postMessage({
            fileName: fileName,
            status: 'success',
            parsedData: parsedData
        });
    } catch (error) {
        self.postMessage({
            fileName: fileName,
            status: 'error',
            error: error.message
        });
    }
};
