# Política de Anonimização de PII — TTBH

## ID de Rastreabilidade
- RSK-SEC-004 (Quick Win)

## Estratégia
Todos os exports de dados para IA ou compartilhamento externo passam pela função `sanitizePII()` em `assets/js/ai_exporter.js`.

## Regras de Anonimização
Quando `window.TTBH_CONFIG.anonimizePII === true` (default):
- `ownerSteamId` → `[STEAM_ID_ANONIMIZADO]`
- `username` → `[USUARIO_ANONIMIZADO]`

## Controle do Usuário
- Checkbox na UI: "Anonimizar identificadores no relatório"
- Default: ON (marcado)
- O usuário pode desmarcar para diagnósticos próprios que exijam identificação.

## Validação
- Exportar um save com PII visível.
- Verificar no JSON gerado que os campos foram substituídos pelos marcadores.
