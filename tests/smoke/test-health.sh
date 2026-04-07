#!/usr/bin/env bash
set -e

echo "Testando /health..."
curl -fsS http://localhost/health > /dev/null
echo "Health OK"