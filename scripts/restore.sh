#!/bin/bash
export $(grep -v '^#' .env | xargs)

# Encontra a pasta mais recente dentro de data/backups
LATEST_BACKUP=$(ls -td ./data/backups/*/ | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ Nenhum backup encontrado na pasta data/backups."
  exit 1
fi

echo "⏳ Iniciando restauração do backup mais recente: $LATEST_BACKUP..."
# Aviso: O --drop garante que ele limpa o banco atual da nuvem e coloca os dados do backup
mongorestore --uri="$MONGO_URI" --drop "$LATEST_BACKUP"

if [ $? -eq 0 ]; then
  echo "✅ Restauração concluída com sucesso!"
else
  echo "❌ Erro ao restaurar o banco."
fi
