#!/bin/sh
# Generate and persist VAPID keys once, then export them for the process.
# Use as entrypoint: ["/bin/sh", "/app/scripts/init-vapid.sh", "node", "src/server.js"]
set -e

CONFIG_DIR="/app/config"
ENV_FILE="$CONFIG_DIR/vapid.env"

mkdir -p "$CONFIG_DIR"

# If file already exists, source and continue
if [ -f "$ENV_FILE" ]; then
  . "$ENV_FILE"
  export VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT
  exec "$@"
fi

# If env vars are provided externally, persist them and continue
if [ -n "$VAPID_PUBLIC_KEY" ] && [ -n "$VAPID_PRIVATE_KEY" ]; then
  : ${VAPID_SUBJECT:=mailto:admin@example.com}
  {
    echo "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY"
    echo "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY"
    echo "VAPID_SUBJECT=$VAPID_SUBJECT"
  } > "$ENV_FILE"
  exec "$@"
fi

# Otherwise generate new keys once and persist
TMP_FILE=$(mktemp)

npx web-push generate-vapid-keys > "$TMP_FILE"

PUB=$(grep "Public Key" "$TMP_FILE" | awk '{print $3}')
PRIV=$(grep "Private Key" "$TMP_FILE" | awk '{print $3}')
SUBJECT=${VAPID_SUBJECT:-mailto:admin@example.com}

if [ -z "$PUB" ] || [ -z "$PRIV" ]; then
  echo "Failed to generate VAPID keys" >&2
  cat "$TMP_FILE" >&2 || true
  exit 1
fi

{
  echo "VAPID_PUBLIC_KEY=$PUB"
  echo "VAPID_PRIVATE_KEY=$PRIV"
  echo "VAPID_SUBJECT=$SUBJECT"
} > "$ENV_FILE"

export VAPID_PUBLIC_KEY=$PUB
export VAPID_PRIVATE_KEY=$PRIV
export VAPID_SUBJECT=$SUBJECT

exec "$@"
