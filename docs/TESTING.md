# Estratégia de Testes — TTBH

## Visão Geral
O TTBH utiliza uma abordagem de testes automatizados executáveis via Node.js, focada em garantir a integridade dos motores analíticos e a segurança do DOM, sem dependência de navegadores headless pesados.

## Suítes de Teste
1. **E2E Smoke (`tests/e2e_smoke.js`)**: Valida a lógica de negócio dos 13 módulos principais (Parser, Crypto, BiS, Stash Value, etc.) usando fixtures sintéticas e reais.
2. **Log Parser (`tests/log_parser.test.js`)**: 15 asserções estritas contra padrões de regex de extração de `Player.log`.
3. **XSS Adversarial (`tests/xss_adversarial.test.js`)**: Valida a função `window.TTBH.safeHtml` contra 6 vetores de injeção DOM conhecidos.

## Execução Local
```bash
# Rodar todas as suítes
./tools/ci/run_all.sh

# Ou via npm (se disponível)
npm run validate
```

## Critérios de Aceite
- 100% das asserções devem passar (Zero Regressão - Guardrail G-3.4).
- Nenhum novo risco de segurança (RSK-SEC) introduzido.
