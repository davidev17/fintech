#!/usr/bin/env bash
set -e

bash tests/smoke/test-health.sh
bash tests/smoke/test-permissions.sh
bash tests/smoke/test-upload.sh