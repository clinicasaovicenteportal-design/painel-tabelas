#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/workspaces/painel-tabelas"
VERSION="7.6.1"

cd "$PROJECT_DIR"

echo "=============================================================="
echo "REMOVER RECUPERAÇÃO DE ACESSO E MANTER GERENCIAR EQUIPE"
echo "VERSÃO $VERSION — COMPATÍVEL COM FIREBASE SPARK"
echo "=============================================================="

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/workspaces/backup-antes-remover-recuperacao-$STAMP"
mkdir -p "$BACKUP_DIR"

echo
echo "1/7 — Salvando cópia de segurança..."

for file in \
  index.html \
  app.js \
  csv-bootstrap.js \
  sw.js \
  version.json \
  firebase.json \
  firestore.rules \
  csv-account-security.js \
  csv-account-security.css
do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$file"
  fi
done

if [ -d functions ]; then
  cp -R functions "$BACKUP_DIR/functions"
fi

git fetch origin main

if git diff --quiet && git diff --cached --quiet; then
  git pull --rebase origin main
else
  echo "Existem alterações locais. Elas serão preservadas."
fi

BACKUP_BRANCH="backup-antes-remover-recuperacao-$STAMP"
git branch "$BACKUP_BRANCH" 2>/dev/null || true
git push origin "$BACKUP_BRANCH" >/dev/null 2>&1 || true

echo
echo "2/7 — Removendo Minha Conta, Recuperação de Acessos e Esqueci minha senha..."

python3 <<'PY'
from pathlib import Path
import json
import re

VERSION = "7.6.1"

required = [
    Path("index.html"),
    Path("csv-bootstrap.js"),
    Path("sw.js"),
    Path("version.json"),
    Path("firebase.json"),
    Path("firestore.rules"),
]

for path in required:
    if not path.exists():
        raise SystemExit(f"ERRO: arquivo obrigatório não encontrado: {path}")

# ------------------------------------------------------------
# INDEX.HTML
# ------------------------------------------------------------
path = Path("index.html")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r'\s*<link rel="stylesheet" href="csv-account-security\.css\?v=[^"]+">',
    "",
    text
)

text = re.sub(
    r"<title>Painel Clínico [^<]+</title>",
    f"<title>Painel Clínico {VERSION}</title>",
    text,
    count=1
)

text = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={VERSION}', text)
text = re.sub(r'csv-bootstrap\.js\?v=[^"]+', f'csv-bootstrap.js?v={VERSION}', text)

path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# CSV-BOOTSTRAP.JS
# ------------------------------------------------------------
path = Path("csv-bootstrap.js")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r'const VERSION = "[^"]+";',
    f'const VERSION = "{VERSION}";',
    text,
    count=1
)

text = re.sub(
    r'\n\s*await safeImport\(\s*'
    r'"Segurança da conta e recuperação de senha",\s*'
    r'"\./csv-account-security\.js"\s*'
    r'\);\s*',
    "\n",
    text,
    count=1,
    flags=re.DOTALL
)

path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# APP.JS — SOMENTE VERSIONAMENTO, SEM ALTERAR O LOGIN
# ------------------------------------------------------------
path = Path("app.js")
if path.exists():
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r"const APP_VERSION = '[^']+';",
        f"const APP_VERSION = '{VERSION}';",
        text,
        count=1
    )
    text = re.sub(
        r'const APP_VERSION = "[^"]+";',
        f'const APP_VERSION = "{VERSION}";',
        text,
        count=1
    )
    path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# SERVICE WORKER
# ------------------------------------------------------------
path = Path("sw.js")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r'const CACHE_NAME\s*=\s*["\'][^"\']+["\'];',
    f'const CACHE_NAME = "painel-csv-v{VERSION}";',
    text,
    count=1
)

text = re.sub(
    r'\s*["\']\./csv-account-security\.js["\'],?',
    "",
    text
)

text = re.sub(
    r'\s*["\']\./csv-account-security\.css["\'],?',
    "",
    text
)

text = re.sub(
    r'("\./csv-chat-disabled\.js")\s*("\./version\.json")',
    r'\1,\n  \2',
    text
)

path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# FIREBASE.JSON — VOLTA A USAR SOMENTE FIRESTORE
# ------------------------------------------------------------
path = Path("firebase.json")
data = json.loads(path.read_text(encoding="utf-8"))
data.pop("functions", None)
data["firestore"] = {"rules": "firestore.rules"}
path.write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

# ------------------------------------------------------------
# FIRESTORE.RULES — REMOVE APENAS AS COLEÇÕES DA RECUPERAÇÃO
# ------------------------------------------------------------
path = Path("firestore.rules")
rules = path.read_text(encoding="utf-8")

security_pattern = (
    r'\s*match /recuperacoes-acesso/\{requestId\} \{.*?\}'
    r'\s*match /notificacoes-admin/\{notificationId\} \{.*?\}'
    r'\s*match /auditoria-acessos/\{auditId\} \{.*?\}'
)

rules = re.sub(
    security_pattern,
    "\n",
    rules,
    count=1,
    flags=re.DOTALL
)

path.write_text(rules, encoding="utf-8")

# ------------------------------------------------------------
# VERSION.JSON
# ------------------------------------------------------------
Path("version.json").write_text(
    json.dumps(
        {
            "version": VERSION,
            "message": (
                "Recuperação de acessos, Minha Conta e Esqueci minha senha "
                "foram removidos. O Gerenciar Equipe continua criando logins "
                "e senhas iniciais diretamente no portal, compatível com o "
                "plano gratuito Spark."
            ),
            "force": True,
            "publishedAt": "2026-07-12"
        },
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)
PY

echo
echo "3/7 — Excluindo arquivos exclusivos da recuperação..."

rm -f csv-account-security.js csv-account-security.css
rm -rf functions

echo
echo "4/7 — Validando que o Gerenciar Equipe foi mantido..."

node --check csv-bootstrap.js
node --check sw.js
node --check app.js

python3 -m json.tool firebase.json >/dev/null
python3 -m json.tool version.json >/dev/null

grep -q 'csv-phase2.js' csv-bootstrap.js
grep -q 'data-tab="colaboradores"' index.html
grep -q 'Gerenciar Equipe' index.html
grep -q 'createUserWithEmailAndPassword' csv-phase2.js
grep -q 'Criar login e salvar' csv-phase2.js

if grep -q 'csv-account-security' index.html csv-bootstrap.js sw.js 2>/dev/null; then
  echo "ERRO: ainda existe referência ao módulo de recuperação."
  exit 1
fi

if grep -q 'recuperacoes-acesso\|notificacoes-admin\|auditoria-acessos' firestore.rules; then
  echo "ERRO: ainda existem regras da recuperação no Firestore."
  exit 1
fi

if grep -q '"functions"' firebase.json; then
  echo "ERRO: firebase.json ainda contém configuração de Functions."
  exit 1
fi

echo
echo "5/7 — Preparando publicação no GitHub..."

git add -A

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova foi encontrada."
else
  git commit -m "Remover recuperação de acesso e manter gestão de equipe no Spark"
  git push origin main
fi

echo
echo "6/7 — Publicando somente as regras do Firestore..."

if command -v firebase >/dev/null 2>&1; then
  FIREBASE_CMD=(firebase)
else
  FIREBASE_CMD=(npx --yes firebase-tools)
fi

if "${FIREBASE_CMD[@]}" deploy --only firestore:rules --project painel-tabelas; then
  FIRESTORE_STATUS="Regras do Firestore publicadas."
else
  FIRESTORE_STATUS="O site foi publicado, mas as regras não foram atualizadas. Execute depois: firebase deploy --only firestore:rules --project painel-tabelas"
fi

echo
echo "7/7 — Concluído."
echo
echo "=============================================================="
echo "ATUALIZAÇÃO $VERSION PUBLICADA"
echo "=============================================================="
echo
echo "Foi mantido:"
echo "- Gerenciar Equipe;"
echo "- criação de login e senha inicial dentro do portal;"
echo "- permissões por área;"
echo "- ativação e desativação de contas;"
echo "- login normal por usuário e senha;"
echo
echo "Foi removido:"
echo "- Minha Conta;"
echo "- Recuperação de Acessos;"
echo "- Esqueci minha senha;"
echo "- PIN de recuperação;"
echo "- solicitações e notificações de recuperação;"
echo "- Cloud Functions e dependência do plano Blaze;"
echo
echo "$FIRESTORE_STATUS"
echo
echo "Backup local: $BACKUP_DIR"
echo "Branch de backup: $BACKUP_BRANCH"
echo
echo "Agora aguarde o GitHub Pages, feche o painel e pressione Ctrl + Shift + R."
