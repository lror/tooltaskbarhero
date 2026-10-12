/**
 * [RSK-SEC-001] Adversarial XSS Test
 * Valida que o helper safeHtml neutraliza payloads de injeção DOM.
 * Executável via Node.js (sem dependências de DOM).
 */

// Simular o ambiente do helper para teste isolado
const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ESCAPE_MAP[m]);
}
function safeHtml(strings, ...values) {
    return strings.reduce((res, str, i) => res + str + (values[i] !== undefined ? escapeHTML(values[i]) : ''), '');
}

// Fixtures Adversariais
const PAYLOADS = [
    '<img src=x onerror=alert(1)>',
    '"><script>alert(document.cookie)</script>',
    "javascript:alert('XSS')",
    '<svg/onload=alert(1)>',
    '&<>"\'',
];

let passed = 0;
let failed = 0;

PAYLOADS.forEach((payload, i) => {
    const sanitized = escapeHTML(payload);
    
    // Regra de Ouro: Nenhum caractere perigoso (< > & " ') pode permanecer sem escape
    const hasUnescaped = /[<>&"']/.test(sanitized.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, ''));
    
    // O payload é neutralizado se todos os delimitadores HTML < > foram escapados,
    // garantindo que tags ativas como <script> ou tags HTML com onerror= não sejam interpretadas pelo navegador.
    if (!hasUnescaped && !sanitized.includes('<script>') && !sanitized.includes('<img')) {
        console.log(`[PASS] Payload ${i + 1} neutralizado: ${sanitized}`);
        passed++;
    } else {
        console.log(`[FAIL] Payload ${i + 1} FALHOU: ${sanitized}`);
        failed++;
    }
});

// Teste de Template Tag
const maliciousName = '<img src=x onerror=alert(1)>';
const htmlOutput = safeHtml`<div class="item">${maliciousName}</div>`;
if (htmlOutput === '<div class="item">&lt;img src=x onerror=alert(1)&gt;</div>') {
    console.log('[PASS] Template Tag safeHtml funcionou corretamente.');
    passed++;
} else {
    console.log(`[FAIL] Template Tag safeHtml FALHOU: ${htmlOutput}`);
    failed++;
}

console.log(`\nResultado: ${passed} PASSARAM, ${failed} FALHARAM`);
if (failed > 0) process.exit(1);
