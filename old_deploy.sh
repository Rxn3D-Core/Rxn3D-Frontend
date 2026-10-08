#!/bin/bash
# Blue/Green zero-downtime deployment for app.rxn3d.com (Next.js)
# Invoked by GitHub Actions: cd /var/www/rxn3d/frontend && ./deploy.sh
set -euo pipefail

APP_NAME="RXN3D Frontend"
SOURCE_DIR="/var/www/rxn3d/frontend"
RELEASES_DIR="/var/www/rxn3d/frontend-releases"
STATE_DIR="/var/www/rxn3d/frontend-deploy"
NGINX_BACKEND_CONF="/etc/nginx/snippets/rxn3d-frontend-backend.conf"
PUBLIC_URL="https://app.rxn3d.com/"
HEALTH_PATH="/"
KEEP_RELEASES=3
HEALTH_RETRIES=30
HEALTH_INTERVAL_SEC=2
HEALTH_CURL_MAX_TIME=10
POST_SWITCH_WAIT_SEC=2

BLUE_NAME="rxn3d-frontend-blue"
GREEN_NAME="rxn3d-frontend-green"
LEGACY_NAME="rxn3d-frontend"
BLUE_PORT=3000
GREEN_PORT=3002

mkdir -p "$RELEASES_DIR" "$STATE_DIR"
cd "$SOURCE_DIR"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_cmd git
require_cmd npm
require_cmd pm2
require_cmd curl
require_cmd rsync
require_cmd sudo
require_cmd nginx

########################################
# Active / target detection from Nginx
########################################
get_nginx_backend_port() {
  local port
  # Match "server 127.0.0.1:3000;" (semicolon optional)
  port="$(grep -E '^\s*server\s+127\.0\.0\.1:(3000|3002)\s*;' "$NGINX_BACKEND_CONF" \
    | head -1 \
    | grep -oE '127\.0\.0\.1:(3000|3002)' \
    | grep -oE '3000|3002' \
    || true)"
  if [[ -z "$port" ]]; then
    # Fallback: sites-available direct upstream (pre-snippet layouts)
    port="$(grep -E 'server\s+127\.0\.0\.1:(3000|3002)' /etc/nginx/sites-available/app.rxn3d.com \
      | head -1 \
      | grep -oE '3000|3002' \
      || true)"
  fi
  [[ -n "$port" ]] || fail "Could not determine active Nginx upstream port from $NGINX_BACKEND_CONF"
  echo "$port"
}

detect_colors() {
  ACTIVE_PORT="$(get_nginx_backend_port)"
  if [[ "$ACTIVE_PORT" == "$BLUE_PORT" ]]; then
    ACTIVE_COLOR="blue"
    TARGET_COLOR="green"
    ACTIVE_NAME="$BLUE_NAME"
    TARGET_NAME="$GREEN_NAME"
    TARGET_PORT="$GREEN_PORT"
  elif [[ "$ACTIVE_PORT" == "$GREEN_PORT" ]]; then
    ACTIVE_COLOR="green"
    TARGET_COLOR="blue"
    ACTIVE_NAME="$GREEN_NAME"
    TARGET_NAME="$BLUE_NAME"
    TARGET_PORT="$BLUE_PORT"
  else
    fail "Unexpected Nginx upstream port: $ACTIVE_PORT"
  fi
}

########################################
# PM2 helpers
########################################
pm2_is_online() {
  local name="$1"
  pm2 describe "$name" >/dev/null 2>&1 || return 1
  pm2 jlist 2>/dev/null | python3 -c "
import json,sys
name=sys.argv[1]
try:
  procs=json.load(sys.stdin)
except Exception:
  sys.exit(1)
for p in procs:
  if p.get('name')==name and p.get('pm2_env',{}).get('status')=='online':
    sys.exit(0)
sys.exit(1)
" "$name"
}

pm2_stop_delete() {
  local name="$1"
  if pm2 describe "$name" >/dev/null 2>&1; then
    log "Stopping PM2 process: $name"
    pm2 stop "$name" >/dev/null 2>&1 || true
    pm2 delete "$name" >/dev/null 2>&1 || true
  fi
}

# Stop whatever currently owns a port (legacy name included)
stop_process_for_color() {
  local color="$1"
  local name port
  if [[ "$color" == "blue" ]]; then
    name="$BLUE_NAME"
    port="$BLUE_PORT"
  else
    name="$GREEN_NAME"
    port="$GREEN_PORT"
  fi

  pm2_stop_delete "$name"

  # Legacy single-process name only maps to BLUE historically
  if [[ "$color" == "blue" ]] && pm2 describe "$LEGACY_NAME" >/dev/null 2>&1; then
    log "Stopping legacy PM2 process: $LEGACY_NAME"
    pm2 stop "$LEGACY_NAME" >/dev/null 2>&1 || true
    pm2 delete "$LEGACY_NAME" >/dev/null 2>&1 || true
  fi

  # Safety: if something else still holds the port, warn (do not kill unknown PIDs blindly)
  if ss -tln | grep -qE ":${port}\\b"; then
    log "WARNING: Port $port still appears to be listening after stop"
  fi
}

start_target_process() {
  local name="$1"
  local port="$2"
  local cwd="$3"

  [[ -d "$cwd" ]] || fail "Release directory missing: $cwd"
  [[ -d "$cwd/.next" ]] || fail "Release missing .next build: $cwd"
  [[ -f "$cwd/package.json" ]] || fail "Release missing package.json: $cwd"

  # Ensure target name is clean before start
  pm2_stop_delete "$name"

  log "Starting $name on 127.0.0.1:$port from $cwd"
  # Bind to localhost only — 3002 must not be public
  pm2 start npm \
    --name "$name" \
    --cwd "$cwd" \
    --time \
    -- start -- -H 127.0.0.1 -p "$port"

  # Give next-server a moment to bind
  sleep 2
}

########################################
# Health checks
########################################
health_check_url() {
  local url="$1"
  local label="$2"
  local i
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    if curl --fail --silent --show-error --max-time "$HEALTH_CURL_MAX_TIME" \
      -o /dev/null -w '' "$url"; then
      log "Health check OK ($label): $url"
      return 0
    fi
    log "Health check attempt $i/$HEALTH_RETRIES failed ($label)"
    sleep "$HEALTH_INTERVAL_SEC"
  done
  return 1
}

local_health_check() {
  health_check_url "http://127.0.0.1:${1}${HEALTH_PATH}" "local:${1}"
}

public_health_check() {
  health_check_url "$PUBLIC_URL" "public"
}

########################################
# Nginx switch / rollback
########################################
write_nginx_backend() {
  local port="$1"
  local tmp
  tmp="$(mktemp)"
  cat > "$tmp" <<EOF
# Managed by /var/www/rxn3d/frontend/deploy.sh - do not edit manually
# BLUE = 127.0.0.1:3000 | GREEN = 127.0.0.1:3002
server 127.0.0.1:${port};
EOF
  sudo cp "$tmp" "$NGINX_BACKEND_CONF"
  rm -f "$tmp"
}

switch_nginx_to_port() {
  local port="$1"
  local previous_port="$2"
  log "Switching Nginx upstream to 127.0.0.1:$port"
  write_nginx_backend "$port"
  if ! sudo nginx -t; then
    log "nginx -t failed for upstream $port — restoring $previous_port without reload"
    write_nginx_backend "$previous_port"
    sudo nginx -t >/dev/null 2>&1 || true
    return 1
  fi
  sudo systemctl reload nginx
  log "Nginx reloaded (upstream $port)"
  sleep "$POST_SWITCH_WAIT_SEC"
  return 0
}

rollback_nginx_to_active() {
  local port="$1"
  log "ROLLBACK: restoring Nginx upstream to 127.0.0.1:$port"
  write_nginx_backend "$port"
  if ! sudo nginx -t; then
    log "CRITICAL: nginx -t failed during rollback"
    return 1
  fi
  sudo systemctl reload nginx
  sleep "$POST_SWITCH_WAIT_SEC"
  local_health_check "$port" || log "CRITICAL: active local health check failed after rollback"
  public_health_check || log "CRITICAL: public health check failed after rollback"
}

########################################
# Release build
########################################
create_release() {
  local release_id release_dir build_log ci_log
  release_id="$(date +%Y%m%d_%H%M%S)_$$"
  release_dir="$RELEASES_DIR/$release_id"
  mkdir -p "$release_dir"
  ci_log="$STATE_DIR/last-npm-ci.log"
  build_log="$STATE_DIR/last-build.log"

  log "Creating release directory: $release_dir"
  # Copy source for an isolated build. Exclude heavy/irrelevant paths.
  # Do NOT reuse the live process's working tree .next — build into this release only.
  rsync -a \
    --delete \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude 'e2e/' \
    --exclude '.github/' \
    --exclude 'deploy.sh.backup' \
    --exclude '*.md' \
    --exclude 'graphify-out/' \
    --exclude '.cursor/' \
    --exclude '.agents/' \
    "$SOURCE_DIR/" "$release_dir/"

  # Ensure production env is present (gitignored)
  if [[ -f "$SOURCE_DIR/.env" ]]; then
    cp -a "$SOURCE_DIR/.env" "$release_dir/.env"
  else
    fail ".env missing in $SOURCE_DIR - cannot build/start production release"
  fi

  log "Installing dependencies in release (npm ci)..."
  if ! (
    cd "$release_dir"
    npm ci --silent
  ) >"$ci_log" 2>&1; then
    log "npm ci failed - see $ci_log"
    tail -n 40 "$ci_log" >&2 || true
    fail "npm ci failed in $release_dir"
  fi

  log "Building release (npm run build) - active process stays untouched..."
  if ! (
    cd "$release_dir"
    NODE_ENV=production npm run build
  ) >"$build_log" 2>&1; then
    log "npm run build failed - see $build_log"
    tail -n 80 "$build_log" >&2 || true
    fail "Build failed in $release_dir"
  fi

  [[ -d "$release_dir/.next" ]] || fail "Build finished but .next is missing"
  [[ -f "$release_dir/.next/BUILD_ID" ]] || fail "Build finished but BUILD_ID is missing"

  # IMPORTANT: only the release path may go to stdout (captured by caller)
  printf '%s\n' "$release_dir"
}

prune_old_releases() {
  local keep="$KEEP_RELEASES"
  local dirs
  mapfile -t dirs < <(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null || true)
  local i
  for ((i=keep; i<${#dirs[@]}; i++)); do
    # Never delete a release that is currently referenced by a running PM2 cwd
    local dir="${dirs[$i]%/}"
    if pm2 jlist 2>/dev/null | grep -q "$dir"; then
      log "Keeping in-use release: $dir"
      continue
    fi
    log "Pruning old release: $dir"
    rm -rf "$dir"
  done
}

save_state() {
  local active_color="$1"
  local active_port="$2"
  local active_release="$3"
  cat > "$STATE_DIR/state.env" <<EOF
ACTIVE_COLOR=$active_color
ACTIVE_PORT=$active_port
ACTIVE_RELEASE=$active_release
UPDATED_AT=$(date -Iseconds)
EOF
  echo "$active_release" > "$STATE_DIR/${active_color}_release"
}

########################################
# Main
########################################
main() {
  log "=== $APP_NAME blue/green deploy starting ==="
  free -h | sed 's/^/[mem] /' || true

  detect_colors
  log "Active: $ACTIVE_COLOR ($ACTIVE_NAME) on port $ACTIVE_PORT"
  log "Target: $TARGET_COLOR ($TARGET_NAME) on port $TARGET_PORT"

  # Ensure active stays up; never stop it before target is proven
  if ! pm2_is_online "$ACTIVE_NAME" && ! { [[ "$ACTIVE_COLOR" == "blue" ]] && pm2_is_online "$LEGACY_NAME"; }; then
    # Active might still be serving if process exists under unexpected name — check port
    if ss -tln | grep -qE ":${ACTIVE_PORT}\\b"; then
      log "Active port $ACTIVE_PORT is listening (legacy/unnamed process OK)"
    else
      fail "No process listening on active port $ACTIVE_PORT — refusing to deploy"
    fi
  fi

  log "[1/7] Fetching latest code (active stays running)..."
  git fetch origin main
  git checkout main
  git pull --ff-only origin main

  log "[2/7] Building new release in isolated directory..."
  if [[ -n "${REUSE_RELEASE:-}" ]]; then
    RELEASE_DIR="$REUSE_RELEASE"
    [[ -d "$RELEASE_DIR/.next" ]] || fail "REUSE_RELEASE missing .next: $RELEASE_DIR"
    log "Reusing existing release (skip build): $RELEASE_DIR"
  else
    RELEASE_DIR="$(create_release)"
    log "Release ready: $RELEASE_DIR"
  fi

  log "[3/7] Starting target environment $TARGET_NAME..."
  # Ensure target port is free first
  stop_process_for_color "$TARGET_COLOR"
  if ss -tln | grep -qE ":${TARGET_PORT}\\b"; then
    fail "Target port $TARGET_PORT is still in use — aborting (active untouched)"
  fi

  start_target_process "$TARGET_NAME" "$TARGET_PORT" "$RELEASE_DIR"

  log "[4/7] Local health check on target..."
  if ! local_health_check "$TARGET_PORT"; then
    log "Target health check FAILED — stopping target, keeping active"
    stop_process_for_color "$TARGET_COLOR"
    pm2 save
    fail "Deploy aborted: target unhealthy"
  fi

  log "[5/7] Switching Nginx traffic to $TARGET_COLOR ($TARGET_PORT)..."
  PREVIOUS_PORT="$ACTIVE_PORT"
  if ! switch_nginx_to_port "$TARGET_PORT" "$PREVIOUS_PORT"; then
    log "Nginx switch failed — active untouched"
    stop_process_for_color "$TARGET_COLOR"
    pm2 save
    fail "Deploy aborted: Nginx switch failed"
  fi

  log "[6/7] Public health check..."
  if ! public_health_check; then
    log "Public health check FAILED — rolling back to $ACTIVE_COLOR"
    rollback_nginx_to_active "$PREVIOUS_PORT" || true
    stop_process_for_color "$TARGET_COLOR"
    pm2 save
    fail "Deploy aborted: public health check failed; rolled back to $ACTIVE_COLOR"
  fi

  log "[7/7] Stopping previous environment ($ACTIVE_COLOR)..."
  stop_process_for_color "$ACTIVE_COLOR"
  pm2 save

  save_state "$TARGET_COLOR" "$TARGET_PORT" "$RELEASE_DIR"
  prune_old_releases

  log "=== Deploy SUCCESS ==="
  log "Now live: $TARGET_COLOR ($TARGET_NAME) on 127.0.0.1:$TARGET_PORT"
  log "Release: $RELEASE_DIR"
  pm2 list
  free -h | sed 's/^/[mem] /' || true
  echo "Done. app.rxn3d.com is live (blue/green)."
}

main "$@"
