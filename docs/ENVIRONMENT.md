# ENVIRONMENT REPORT — TTBH RUNTIME

NODE: v24.15.0 (/home/lror/.nvm/versions/node/v24.15.0/bin/node)
PYTHON3: Python 3.14.4 (/usr/bin/python3)
GIT: git version 2.53.0 (/usr/bin/git)
DENO: not_found
BUN: not_found
DISK: Total: 477G | Used: 379G | Free: 99G | Mount: /mnt/TMP (80%)
WRITE_PERMISSION: granted (tested via touch/rm on project root)
TEST_STRATEGY: python3 tools/test_runner.py with node runtime bridge to tests/e2e_smoke.js

---

## Detalhamento de Execução

- **Ambiente Host:** Linux 6.6.137+bpo-amd64 x86_64
- **Engine Primária de Testes:** Python 3.14.4 servindo como orquestrador e probe (`tools/test_runner.py`), com execução dos testes de fumaça E2E delegada ao Node.js v24.15.0 via NVM (`/home/lror/.nvm/versions/node/v24.15.0/bin/node`).
- **Permissões de I/O:** Leitura e escrita validadas com sucesso na raiz `/mnt/TMP/APPs/TBH`.
