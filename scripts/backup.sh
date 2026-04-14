#!/bin/bash
# Carrega as variáveis de ambiente do .env para a sessão atual
export $(grep -v '^#' .env | xargs)

# Cria um timestamp para a pasta de backup
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="./data/backups/dev_$TIMESTAMP"

echo "⏳ Iniciando backup do banco de dados para $BACKUP_DIR..."

# O mongodump vai ler a URI da nuvem que exportamos e salvar os dados na pasta ./data/backups
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR"

if [ $? -eq 0 ]; then
  echo "✅ Backup local concluído com sucesso!"
else
  echo "❌ Erro ao fazer o backup."
fi
