/**
 * [RSK-SEC-001] Safe HTML Helper
 * Previne DOM XSS fazendo escape contextual de caracteres perigosos.
 * Uso: window.TTBH.safeHtml`<div>${userInput}</div>`
 */
(function() {
    window.TTBH = window.TTBH || {};
    
    const ESCAPE_MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    
    window.TTBH.escapeHTML = function(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function(match) {
            return ESCAPE_MAP[match];
        });
    };
    
    // Template Tag Function para interpolação segura
    window.TTBH.safeHtml = function(strings, ...values) {
        return strings.reduce((result, string, i) => {
            const value = values[i] !== undefined ? window.TTBH.escapeHTML(values[i]) : '';
            return result + string + value;
        }, '');
    };
})();
