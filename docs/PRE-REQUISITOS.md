# Pré-requisitos do TTBH

## Obrigatório (uso normal)
1. Navegador moderno (Chrome/Edge/Firefox/Brave) — usa Web Crypto API + ES Modules.
2. Servidor HTTP local (a app NÃO funciona via file:// porque crypto.subtle exige contexto seguro):
   - `python3 -m http.server 8000` **ou** `npx http-server -p 8000` **ou** `php -S localhost:8000`
3. Abrir `http://localhost:8000`. Pronto. O **Modo Demo** funciona sem nenhum arquivo.

## Opcional
- **Auto-load Steam (Linux/Proton):** `bash tools/setup_steam_link.sh` (cria symlink steam_save/).
- **Preços ao vivo do Market:** `python3 tools/steam_proxy.py` (proxy local 100% auditável).
- **Node.js ≥18:** apenas para rodar testes/CI (`./tools/ci/run_all.sh`).

## O que NÃO é necessário
- Contas, logins, chaves de API, banco de dados, instalação de dependências npm para uso.
