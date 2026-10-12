# TTBH v1.0.0 — Release Candidate

## ✨ Features
1. **Save Inspector:** Leitura e descriptografia cliente de EasySave3 AES-128 com suporte total a 248 runas e 17 aggregates.
2. **BiS Finder:** Otimizador de equipamentos para 6 heróis × 10 slots com identificação cruzada de Drop Source.
3. **Rune Planner:** Árvore de talentos e runas com 248 nós canônicos e simulação de custos até o nível máximo.
4. **Synthesis Simulator:** Projeção precisa de Cube EXP e custos com alerta de inviabilidade econômica.
5. **Log Parser:** Diagnosticador de `Player.log` com extração de 23 padrões e 15 asserções automatizadas.
6. **Market Price Service:** Motor de precificação 100% local com importação de CSV/JSON e cache TTL de 7 dias.
7. **Chest Optimizer & Drop Finder:** Cálculo de EV (Expected Value) unitário e líquido com Monte Carlo e ranking de baús.
8. **Backup Timeline:** Histórico de múltiplos backups periódicos com deltas de ouro, cubo, estágio e itens.
9. **Stash Value & Combat POWER:** Avaliação do valor do inventário em tempo real e score POWER 0-100 para heróis.

---

## 🐛 Known Issues & Flags
- `⚠ MANUAL ONLY`: Steam Market reaberto em 25/06/2026. Live scraping agressivo evitado intencionalmente; cotações utilizam cache local e importação de planilhas.
- `⚠ AMBÍGUO (Drop Tables)`: Alguns baús de eventos utilizam heurística por tier de estágio (Stage Tier × Item Tier) quando ausentes no bundle do cliente.

---

## 📊 Paridade com Concorrentes

| Feature | TTBH | TBH Index | TBH Helper | Diferencial TTBH |
| :--- | :---: | :---: | :---: | :--- |
| **Save Inspector** | ✅ | ✅ | ✅ | 17 aggregates (eles cobrem 0 a 3) |
| **248 Runas + pt-BR** | ✅ | ✅ | ⚠ | pt-BR completo + custos reais por nível |
| **POWER 0-100** | ✅ | ❌ | ✅ | Fórmula aberta e auditável |
| **Stash Value** | ✅ | ✅ | ✅ | Market price com fallback estático automático |
| **Aggregates (17 tipos)** | ✅ | ❌ | ✅ | Telemetria oficial completa |
| **Log Parser** | ✅ | ❌ | ❌ | **Exclusivo no mercado** |
| **Synthesis Simulator** | ✅ | ⚠ | ❌ | Guardrails econômicos contra perda de ouro |
| **BiS Finder** | ✅ | ✅ | ✅ | + Drop Source cruzado com baús |
| **Rune Planner** | ✅ | ✅ | ✅ | Visualizador vetorial interativo |
| **Backup Timeline** | ✅ | ⚠ | ✅ | Comparação temporal de múltiplos saves (.es3) |
| **Market Price API** | ✅ | ✅ | ✅ | Import CSV + cache local no navegador |
| **Chest Optimizer** | ✅ | ⚠ | ✅ | Ranking por EV e simulação de Monte Carlo |
| **Privacidade** | **✅ 100%** | ⚠ Servidor | ⚠ Servidor | **Zero telemetria, 100% client-side** |
