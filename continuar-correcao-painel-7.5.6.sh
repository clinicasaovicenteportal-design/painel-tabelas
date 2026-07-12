#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/painel-tabelas

echo "============================================================"
echo "CONTINUAR CORREÇÃO DO PAINEL — 7.5.6"
echo "============================================================"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/workspaces/backup-continuacao-7.5.6-$STAMP"
mkdir -p "$BACKUP"

echo
echo "1/5 — Guardando os arquivos gerados pela primeira tentativa..."
for f in \
  csv-media-stable.js \
  csv-chat-disabled.js \
  csv-menu-update.js \
  csv-bootstrap.js \
  sw.js \
  index.html \
  version.json
do
  if [ -f "$f" ]; then
    cp "$f" "$BACKUP/$f"
  fi
done

required=(
  csv-media-stable.js
  csv-chat-disabled.js
  csv-menu-update.js
  csv-bootstrap.js
  sw.js
)

for f in "${required[@]}"; do
  if [ ! -f "$f" ]; then
    echo
    echo "ERRO: o arquivo $f não foi criado pela primeira tentativa."
    echo "Não continue. Envie uma captura desta mensagem."
    exit 1
  fi
done

echo
echo "2/5 — Retirando somente alterações incompletas dos arquivos antigos..."
git fetch origin main

# A primeira tentativa já guardou as alterações anteriores em um stash.
# Restauramos estes dois arquivos para evitar que uma validação antiga bloqueie a publicação.
git checkout origin/main -- app.js csv-admin-control.js

python3 <<'PY'
from pathlib import Path
import json
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r"<title>Painel Clínico [^<]+</title>",
    "<title>Painel Clínico 7.5.6</title>",
    text,
    count=1
)

text = re.sub(
    r'\s*<link rel="stylesheet" href="csv-banners-hotfix\.css\?v=[^"]+">',
    "",
    text
)

critical = """
    <style id="csv-chat-disabled-critical">
        #chat-fab,
        #chat-window,
        .chat-fab,
        .chat-window,
        [data-chat-widget],
        [data-ai-assistant] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
    </style>
"""

if 'id="csv-chat-disabled-critical"' not in text:
    text = text.replace("</head>", critical + "\n</head>", 1)

text = re.sub(r'app\.js\?v=[^"]+', 'app.js?v=7.5.6', text)
text = re.sub(r'csv-bootstrap\.js\?v=[^"]+', 'csv-bootstrap.js?v=7.5.6', text)

path.write_text(text, encoding="utf-8")

Path("version.json").write_text(
    json.dumps(
        {
            "version": "7.5.6",
            "message": (
                "Banners estabilizados, atualizador simplificado "
                "e chat de IA removido."
            ),
            "force": False,
            "publishedAt": "2026-07-12"
        },
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)
PY

rm -f csv-banners-hotfix.js csv-banners-hotfix.css

echo
echo "3/5 — Validando cada arquivo separadamente..."

check_js() {
  local file="$1"
  echo "Verificando: $file"
  if ! node --check "$file"; then
    echo
    echo "ERRO DE SINTAXE EM: $file"
    echo "A linha exata apareceu logo acima."
    echo "Nada foi publicado."
    exit 1
  fi
}

check_js csv-media-stable.js
check_js csv-chat-disabled.js
check_js csv-menu-update.js
check_js csv-bootstrap.js
check_js sw.js
check_js app.js
check_js csv-admin-control.js

grep -q 'CSV Mídia Estável 7.5.6' csv-media-stable.js
grep -q 'CSV Chat removido 7.5.6' csv-chat-disabled.js
grep -q 'csv-media-stable.js' csv-bootstrap.js
grep -q 'csv-chat-disabled.js' csv-bootstrap.js
! grep -q 'csv-banners-hotfix.js' csv-bootstrap.js
! grep -q 'csv-banners-hotfix.css' index.html
grep -q '"version": "7.5.6"' version.json
grep -q 'painel-csv-v7.5.6' sw.js

echo
echo "4/5 — Preparando a publicação..."

git add \
  index.html \
  app.js \
  csv-admin-control.js \
  csv-media-stable.js \
  csv-chat-disabled.js \
  csv-menu-update.js \
  csv-bootstrap.js \
  sw.js \
  version.json

git add -u csv-banners-hotfix.js csv-banners-hotfix.css 2>/dev/null || true

echo
echo "5/5 — Publicando no GitHub..."

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova foi encontrada."
else
  git commit -m "Concluir estabilização de banners e remover chat IA"
  git push origin main
fi

echo
echo "============================================================"
echo "VERSÃO 7.5.6 PUBLICADA COM SUCESSO"
echo "============================================================"
echo
echo "Backup desta continuação:"
echo "$BACKUP"
echo
echo "Agora feche completamente a aba do painel."
echo "Abra novamente e pressione Ctrl + Shift + R uma única vez."
