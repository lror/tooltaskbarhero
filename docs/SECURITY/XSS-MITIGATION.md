# Mitigação de DOM XSS (RSK-SEC-001)

## Estratégia
Criação de um helper nativo `window.TTBH.safeHtml` que atua como uma *Tagged Template Function*.
Ele intercepta a interpolação de variáveis em template literals e aplica escape contextual (`& < > " '`) antes que a string seja montada e atribuída ao `innerHTML`.

## Refatoração Cirúrgica
Foram identificados 55 sinks de `innerHTML` em `assets/js/app.js`.
A refatoração focou exclusivamente nos vetores de risco dinâmico (template literals):
```javascript
// ANTES (Vulnerável a XSS se item.name contiver <script>)
card.innerHTML = `<div class="item">${item.name}</div>`;

// DEPOIS (Seguro - escape automático)
card.innerHTML = window.TTBH.safeHtml`<div class="item">${item.name}</div>`;
```

## Sinks Estáticos (Não Refatorados)
Atribuições de strings estáticas (`el.innerHTML = ''` ou `el.innerHTML = '<div>Texto Fixo</div>'`) não oferecem risco de injeção e foram mantidas inalteradas para preservar performance e evitar regressão de comportamento.

## Validação
- Suíte `tests/xss_adversarial.test.js` valida a neutralização de payloads conhecidos.
- Suíte `tests/e2e_smoke.js` garante que a renderização da UI não foi quebrada pela função de escape.
