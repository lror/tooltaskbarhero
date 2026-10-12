# ADR 0001: Estratégia de Chave AES Pública

## Status
Aceito

## Contexto
A ferramenta TTBH descriptografa arquivos de save do jogo (Easy Save 3) usando uma chave AES mestra.
Inicialmente, essa chave estava hardcoded em `assets/js/crypto.js` (RSK-SECRET-001).
Ferramentas de análise de segurança classificaram isso como "Hardcoded Secret".

## Decisão
1. **Natureza Pública:** A chave é um segredo do *jogo*, não do *usuário*. Ela foi obtida via engenharia reversa do binário do jogo e é amplamente conhecida pela comunidade de modding.
2. **Extração:** A chave foi movida para `assets/js/config/crypto_config.js` como `window.TTBH_DEFAULT_CRYPTO_KEY`.
3. **Sobrescrita:** A UI agora permite que o usuário insira uma chave customizada via `window.TTBH_CRYPTO_KEY`, suportando mods que alteram a criptografia.
4. **Transparência:** Não tentamos ofuscar a chave no código JS, pois isso seria segurança por obscuridade e facilmente reversível.

## Consequências
- **Positivas:** Transparência total, suporte a mods, eliminação do falso positivo de "Hardcoded Secret" em scanners de segurança.
- **Negativas:** Nenhuma, pois a chave já é pública por natureza.
