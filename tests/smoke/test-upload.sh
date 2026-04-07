#!/usr/bin/env bash
set -e

echo "Testando upload..."
HTTP_CODE=$(curl -s -o /tmp/upload-response.txt -w "%{http_code}" \
  -X POST http://localhost/api/uploads \
  -F "file=@tests/fixtures/test.jpg")

cat /tmp/upload-response.txt
echo
echo "HTTP_CODE=$HTTP_CODE"

test "$HTTP_CODE" = "200" -o "$HTTP_CODE" = "201"
echo "Upload OK"