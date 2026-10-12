#!/bin/bash

# Define o diretório onde os arquivos do site estão
TARGET_DIR=${1:-"."}
REPORT_FILE="tbh_analysis_pt_report.txt"

# Lista de diretórios de idiomas para ignorar (deixando apenas o 'pt' e as pastas base)
EXCLUDES="--exclude-dir=id --exclude-dir=vi --exclude-dir=th --exclude-dir=zh-hant --exclude-dir=zh-hans --exclude-dir=ko --exclude-dir=ja --exclude-dir=uk --exclude-dir=ru --exclude-dir=tr --exclude-dir=pl --exclude-dir=de --exclude-dir=es --exclude-dir=fr"

echo "==========================================================" > "$REPORT_FILE"
echo "  ANALISADOR TBH: VARREDURA OTIMIZADA (FOCO EM PT E _APP) " >> "$REPORT_FILE"
echo "==========================================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "[!] Iniciando varredura na pasta _app e arquivos essenciais..."

# FASE 1: O Motor de Descriptografia (Buscando APENAS na pasta _app e arquivos base)
echo "-> Caçando a lógica AES e ES3..."
echo "--- FASE 1: FUNÇÕES DE CRIPTOGRAFIA ---" >> "$REPORT_FILE"
grep -r -n -o -i -E '.{0,80}(AES|decrypt|CryptoJS|ES3|crypto\.subtle|aes-cbc|pbkdf2).{0,80}' $EXCLUDES --include="*.js" --include="*.html" "$TARGET_DIR" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# FASE 2: Caça à Chave AES
echo "-> Caçando possíveis senhas..."
echo "--- FASE 2: POSSÍVEIS CHAVES/SENHAS ---" >> "$REPORT_FILE"
grep -r -n -o -i -E '(key|password|secret|iv|salt)[\\"\x27\:\s=]+[\\"\x27][a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\-\_\+\=]{5,40}[\\"\x27]' $EXCLUDES --include="*.js" --include="*.html" "$TARGET_DIR" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# FASE 3: Mapeamento de Dados Específicos em Português
echo "-> Localizando banco de dados em PT-BR..."
echo "--- FASE 3: DADOS DE JOGO (PT) ---" >> "$REPORT_FILE"
find "$TARGET_DIR" -type f \( -name "*.json" -o -name "*.html" \) | grep -v -E '/(id|vi|th|zh-hant|zh-hans|ko|ja|uk|ru|tr|pl|de|es|fr)/' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "==========================================================" >> "$REPORT_FILE"
echo "[OK] Varredura super-rápida concluída! Resultados em: $REPORT_FILE"
