/**
 * [FEAT-1104] Parser para backend.dat
 * Extrai metadados de sessão que o save principal não possui
 */
window.BackendParser = window.BackendParser || {
    async parse(file) {
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        
        const result = {
            fileName: file.name,
            size: file.size,
            parsedAt: new Date().toISOString(),
            metadata: {}
        };

        try {
            // Tentar parsear como JSON primeiro
            const json = JSON.parse(text);
            result.format = 'json';
            result.metadata = this.extractJSONMetadata(json);
        } catch (e) {
            // Fallback: extrair padrões conhecidos de texto/binário
            result.format = 'binary/text';
            result.metadata = this.extractTextMetadata(text);
        }

        return result;
    },

    extractJSONMetadata(json) {
        const meta = {};
        // Extrair campos comuns de backend de jogos Unity
        const fields = ['sessionId', 'playerId', 'gameVersion', 'buildNumber', 'lastLogin', 'playTime', 'achievements'];
        fields.forEach(field => {
            if (json[field] !== undefined) meta[field] = json[field];
        });
        // Se for um objeto aninhado, tentar achar em sub-objetos
        if (!meta.sessionId && json.data) {
            fields.forEach(field => {
                if (json.data[field] !== undefined) meta[field] = json.data[field];
            });
        }
        return meta;
    },

    extractTextMetadata(text) {
        const meta = {};
        // Extrair padrões comuns
        const patterns = {
            version: /version[:\s]+([0-9.]+)/i,
            build: /build[:\s]+(\d+)/i,
            sessionId: /session[_-]?id[:\s]+([a-f0-9-]+)/i,
            playerId: /player[_-]?id[:\s]+(\d+)/i,
        };
        
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) meta[key] = match[1];
        }
        
        meta.linesCount = text.split('\n').length;
        meta.hasEncryptedContent = /[^\x20-\x7E\t\n\r]/.test(text);
        
        return meta;
    }
};

window.TTBH_BackendParser = BackendParser;
