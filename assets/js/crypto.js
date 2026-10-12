/**
 * TTBH - ToolTaskBarHero
 * Motor Criptográfico Client-Side para Easy Save 3 (Unity)
 * 
 * Implementação nativa com Web Crypto API:
 * - PBKDF2 (HMAC-SHA1, 100 iterações, salt = primeiros 16 bytes do arquivo / IV)
 * - AES-128-CBC com padding PKCS7
 * - Descompressão automática GZIP (0x1f 0x8b)
 */

import { safeParseJSON } from './save_parser.js';

export const DEFAULT_TBH_PASSWORD = (typeof window !== "undefined" && (window.TTBH_CRYPTO_KEY || window.TTBH_DEFAULT_CRYPTO_KEY)) || "emuMqG3bLYJ938ZDCfieWJ";

export class CryptoEngine {
    constructor(password = DEFAULT_TBH_PASSWORD) {
        this.password = password || DEFAULT_TBH_PASSWORD;
    }

    setPassword(password) {
        this.password = password || DEFAULT_TBH_PASSWORD;
    }

    getSubtleCrypto() {
        const subtle = (typeof window !== "undefined" && window.crypto && window.crypto.subtle)
            || (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle);

        if (!subtle) {
            throw new Error(
                "A Web Crypto API (crypto.subtle) não está disponível neste ambiente. " +
                "Navegadores modernos bloqueiam crypto.subtle em contextos inseguros (como abrir direto via file:/// ou HTTP em IP externo). " +
                "Inicie um servidor local (ex: python3 -m http.server 8000) e acesse via http://localhost:8000."
            );
        }

        return subtle;
    }

    /**
     * Descriptografa um ArrayBuffer ou Uint8Array de save do Easy Save 3
     * @param {ArrayBuffer|Uint8Array} buffer
     * @returns {Promise<Object>} JSON parseado
     */
    async decryptBuffer(buffer) {
        const subtle = this.getSubtleCrypto();
        const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

        if (u8.length < 32) {
            throw new Error("Arquivo muito pequeno ou corrompido para ser um save ES3 válido.");
        }

        // 1. Primeiros 16 bytes: IV (reutilizado também como Salt do PBKDF2)
        const iv = u8.slice(0, 16);
        const ciphertext = u8.slice(16);

        // 2. Importa a senha para PBKDF2
        const encoder = new TextEncoder();
        const baseKey = await subtle.importKey(
            "raw",
            encoder.encode(this.password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // 3. Deriva a chave AES-CBC de 128 bits
        const aesKey = await subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: iv,
                iterations: 100,
                hash: "SHA-1"
            },
            baseKey,
            { name: "AES-CBC", length: 128 },
            false,
            ["decrypt"]
        );

        // 4. Descriptografa AES-CBC
        let decryptedBytes;
        try {
            const decryptedBuffer = await subtle.decrypt(
                { name: "AES-CBC", iv: iv },
                aesKey,
                ciphertext
            );
            decryptedBytes = new Uint8Array(decryptedBuffer);
        } catch (decryptErr) {
            throw new Error("Falha na descriptografia AES. Verifique se o arquivo é um SaveFile_Live.es3 válido do Task Bar Hero.");
        }

        // 5. Verifica se há compressão GZIP (Magic header 0x1f, 0x8b)
        if (decryptedBytes[0] === 0x1f && decryptedBytes[1] === 0x8b) {
            decryptedBytes = await this.decompressGzip(decryptedBytes);
        }

        // 6. Decodifica para texto UTF-8
        const decoder = new TextDecoder("utf-8");
        const jsonText = decoder.decode(decryptedBytes);

        // 7. Parse do JSON raiz com proteção em cascata (raw -> int64 quote-aware -> exotics)
        try {
            return safeParseJSON(jsonText).data;
        } catch (parseErr) {
            throw new Error("Erro ao analisar a estrutura JSON interna: " + parseErr.message);
        }
    }

    /**
     * Alias de compatibilidade com o módulo de Timeline
     */
    async decryptES3(buffer) {
        return this.decryptBuffer(buffer);
    }

    /**
     * Descomprime um fluxo GZIP no navegador via DecompressionStream
     * @param {Uint8Array} gzipBytes
     * @returns {Promise<Uint8Array>}
     */
    async decompressGzip(gzipBytes) {
        if (typeof DecompressionStream !== "undefined") {
            const stream = new Response(new Blob([gzipBytes]).stream().pipeThrough(new DecompressionStream("gzip")));
            const decompressedBuffer = await stream.arrayBuffer();
            return new Uint8Array(decompressedBuffer);
        } else {
            throw new Error("O seu navegador não suporta DecompressionStream para descompressão GZIP.");
        }
    }
}
