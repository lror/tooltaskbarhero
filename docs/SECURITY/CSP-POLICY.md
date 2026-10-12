# Content Security Policy (CSP) — TTBH

## ID de Rastreabilidade
- RSK-SEC-002 (Quick Win)

## Política Aplicada
```
default-src 'self';
script-src 'self';
style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
font-src https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self';
object-src 'none';
base-uri 'none';
form-action 'none'
```

## Justificativa das Diretivas
- `default-src 'self'`: bloqueia qualquer recurso não explícito.
- `script-src 'self'`: impede injeção de scripts externos (mitiga XSS).
- `style-src 'self' ... 'unsafe-inline'`: necessário para estilos inline legados; fonte externa apenas para Google Fonts.
- `font-src https://fonts.gstatic.com`: restringe carregamento de fontes ao CDN oficial.
- `img-src 'self' data:`: permite imagens locais e data URIs (usados em ícones SVG inline).
- `connect-src 'self'`: bloqueia requisições XHR/fetch para domínios externos.
- `object-src 'none'`: bloqueia plugins (Flash, Java).
- `base-uri 'none'`: previne injeção de tag <base> que redirecionaria URLs relativas.
- `form-action 'none'`: previne submissão de formulários para servidores externos.

## Validação
- Nenhum recurso legítimo deve ser bloqueado (verificar console do navegador).
- Tentativas de injeção de script externo devem ser bloqueadas com erro CSP no console.
