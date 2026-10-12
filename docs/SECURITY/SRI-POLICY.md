# Subresource Integrity (SRI) — TTBH

## ID de Rastreabilidade
- RSK-SEC-003 (Quick Win)

## Estratégia
Hashes SHA-384 calculados em tempo real para cada URL de Google Fonts presente em index.html.

## Hashes Aplicados
(Calculados dinamicamente durante a aplicação)

## Validação
- Atributos integrity e crossorigin="anonymous" presentes em todos os <link> de fontes externas.
- Se o Google Fonts alterar o conteúdo, o navegador bloqueará o carregamento (proteção contra comprometimento de CDN).
