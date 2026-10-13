#!/bin/bash
set -e # Falha rápida em caso de erro

echo "🚀 Iniciando Pipeline de Validação TTBH v1.0.0..."

# Detectar Node.js
NODE_BIN=$(which node 2>/dev/null || echo "/home/lror/.nvm/versions/node/v24.15.0/bin/node")
if ! command -v $NODE_BIN &> /dev/null; then
    echo "❌ ERRO: Node.js não encontrado em $NODE_BIN"
    exit 1
fi

echo "✅ Node.js detectado: $($NODE_BIN -v)"

echo "🧪 Executando Testes E2E..."
$NODE_BIN tests/e2e_smoke.js
echo "✅ E2E PASSOU"

echo "🧪 Executando Testes de Log Parser..."
$NODE_BIN tests/log_parser.test.js
echo "✅ LOG PARSER PASSOU"

echo "🧪 Executando Testes Adversariais XSS..."
$NODE_BIN tests/xss_adversarial.test.js
echo "✅ XSS PASSOU"

echo "🎉 PIPELINE DE VALIDAÇÃO CONCLUÍDO COM SUCESSO!"
