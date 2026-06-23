#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] Error: %s\n' "$1" >&2
  exit 1
}

if [[ ! -f ".env" ]]; then
  fail "File .env not found in $PROJECT_DIR. Create it from .env.example before deploy."
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker is not installed or not available in PATH."
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
else
  fail "Docker Compose v2 is required."
fi

if [[ -d ".git" ]]; then
  if command -v git >/dev/null 2>&1; then
    log "Pulling latest changes from Git repository..."
    git pull --ff-only
  else
    log "Git repository detected, but git is not installed. Skipping git pull."
  fi
else
  log "No .git directory found. Skipping git pull."
fi

log "Building and restarting containers..."
"${COMPOSE_CMD[@]}" up -d --build

log "Removing unused Docker images..."
docker image prune -f

log "Deployment finished successfully."
