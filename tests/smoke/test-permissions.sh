#!/usr/bin/env bash
set -e

echo "Testando permissão de escrita em /app/uploads..."
docker compose exec -T app sh -c 'test -w /app/uploads'
docker compose exec -T app sh -c 'touch /app/uploads/ci-test.txt && rm -f /app/uploads/ci-test.txt'
echo "Permissão OK"