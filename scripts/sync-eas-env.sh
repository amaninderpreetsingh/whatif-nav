#!/usr/bin/env bash
# Reads EXPO_PUBLIC_* values from .env and registers them as EAS env vars
# for the production, preview, and development environments.
# Re-run any time .env changes (idempotent — uses --force to overwrite).
set -euo pipefail

ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

while IFS='=' read -r KEY VALUE; do
  # Skip comments + blank lines + non-EXPO_PUBLIC entries
  [[ "$KEY" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$KEY" ]] && continue
  [[ "$KEY" != EXPO_PUBLIC_* ]] && continue

  # Strip surrounding quotes from VALUE if any
  VALUE="${VALUE%\"}"
  VALUE="${VALUE#\"}"

  echo "→ Setting $KEY"
  eas env:create \
    --scope project \
    --name "$KEY" \
    --value "$VALUE" \
    --environment production \
    --environment preview \
    --environment development \
    --visibility plaintext \
    --type string \
    --force \
    --non-interactive >/dev/null
done < "$ENV_FILE"

echo "Done."
