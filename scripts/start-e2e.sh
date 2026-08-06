#!/usr/bin/env bash
set -euo pipefail

OLLAMA_MODEL="${OLLAMA_MODEL:-gemma3:4b}"
COMPOSE_FILE="./e2e/docker-compose.ollama.yml"
OLLAMA_URL="http://localhost:11434"

cleanup() {
  echo ""
  echo "--- Cleaning up ---"
  if [ -n "${DEV_SERVER_PID:-}" ]; then
    kill "$DEV_SERVER_PID" 2>/dev/null || true
    wait "$DEV_SERVER_PID" 2>/dev/null || true
  fi

  echo "Stopping Ollama container..."
  docker compose -f "$COMPOSE_FILE" down --volumes 2>/dev/null || true
  echo "Done."
}

trap cleanup EXIT INT TERM

echo "--- Starting Ollama in Docker ---"
docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for Ollama to be ready..."
for i in $(seq 1 30); do
  if curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    echo "Ollama is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Ollama did not start in time."
    exit 1
  fi
  sleep 2
done

echo "--- Pulling model: $OLLAMA_MODEL ---"
docker exec ollama-gui-e2e-ollama ollama pull "$OLLAMA_MODEL"

echo "--- Starting dev server ---"
yarn dev &
DEV_SERVER_PID=$!

echo "Waiting for dev server..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:5173" > /dev/null 2>&1; then
    echo "Dev server is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Dev server did not start in time."
    exit 1
  fi
  sleep 1
done

echo "--- Running Playwright tests ---"
OLLAMA_MODEL="$OLLAMA_MODEL" yarn test:e2e
