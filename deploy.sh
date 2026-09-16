#!/bin/bash

# ============================================================
# RXN3D Frontend Blue/Green Deployment
#
# GitHub Actions builds the Next.js application (standalone output).
# This script ONLY deploys the pre-built artifact.
#
# Usage:
#
# ./deploy.sh --artifact /tmp/rxn3d-frontend-<sha>.tar.gz
#
# ============================================================

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

ARTIFACT=""

mkdir -p "$RELEASES_DIR"
mkdir -p "$STATE_DIR"

# ============================================================
# Logging
# ============================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

fail() {
    log "ERROR: $*"
    exit 1
}

# ============================================================
# Required commands
# ============================================================

require_cmd() {
    command -v "$1" >/dev/null 2>&1 ||
        fail "Required command not found: $1"
}

require_cmd pm2
require_cmd curl
require_cmd sudo
require_cmd nginx
require_cmd tar
require_cmd ss
require_cmd python3
require_cmd node

# ============================================================
# Arguments
# ============================================================

while [[ $# -gt 0 ]]; do

    case "$1" in

        --artifact)

            [[ $# -ge 2 ]] ||
                fail "--artifact requires a path"

            ARTIFACT="$2"

            shift 2
            ;;

        *)

            fail "Unknown argument: $1"

            ;;

    esac

done

[[ -n "$ARTIFACT" ]] ||
    fail "Artifact is required."

[[ -f "$ARTIFACT" ]] ||
    fail "Artifact not found: $ARTIFACT"

# ============================================================
# Active / Target detection
# ============================================================

get_nginx_backend_port() {

    local port

    port="$(
        grep -E '^\s*server\s+127\.0\.0\.1:(3000|3002)\s*;' \
            "$NGINX_BACKEND_CONF" \
        | head -1 \
        | grep -oE '127\.0\.0\.1:(3000|3002)' \
        | grep -oE '3000|3002' \
        || true
    )"

    if [[ -z "$port" ]]; then

        port="$(
            grep -E 'server\s+127\.0\.0\.1:(3000|3002)' \
                /etc/nginx/sites-available/app.rxn3d.com \
            | head -1 \
            | grep -oE '3000|3002' \
            || true
        )

    fi

    [[ -n "$port" ]] ||
        fail "Could not determine active Nginx upstream port."

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

# ============================================================
# PM2 helpers
# ============================================================

pm2_is_online() {

    local name="$1"

    pm2 describe "$name" >/dev/null 2>&1 ||
        return 1

    pm2 jlist 2>/dev/null |
        python3 -c '
import json
import sys

name = sys.argv[1]

try:
    processes = json.load(sys.stdin)
except Exception:
    sys.exit(1)

for process in processes:

    if (
        process.get("name") == name
        and process.get("pm2_env", {}).get("status") == "online"
    ):
        sys.exit(0)

sys.exit(1)
' "$name"
}

pm2_stop_delete() {

    local name="$1"

    if pm2 describe "$name" >/dev/null 2>&1; then

        log "Stopping PM2 process: $name"

        pm2 stop "$name" >/dev/null 2>&1 || true

        pm2 delete "$name" >/dev/null 2>&1 || true

    fi
}

# ============================================================
# Stop color
# ============================================================

stop_process_for_color() {

    local color="$1"

    local name
    local port

    if [[ "$color" == "blue" ]]; then

        name="$BLUE_NAME"
        port="$BLUE_PORT"

    else

        name="$GREEN_NAME"
        port="$GREEN_PORT"

    fi

    pm2_stop_delete "$name"

    # Legacy process historically used BLUE
    if [[ "$color" == "blue" ]] &&
       pm2 describe "$LEGACY_NAME" >/dev/null 2>&1; then

        log "Stopping legacy PM2 process: $LEGACY_NAME"

        pm2 stop "$LEGACY_NAME" >/dev/null 2>&1 || true

        pm2 delete "$LEGACY_NAME" >/dev/null 2>&1 || true

    fi

    if ss -tln | grep -qE ":${port}\b"; then

        log "WARNING: Port $port still appears to be listening"

    fi
}

# ============================================================
# Create release from GitHub artifact (standalone output)
# ============================================================

create_release_from_artifact() {

    local release_id
    local release_dir

    release_id="$(date +%Y%m%d_%H%M%S)_$$"

    release_dir="$RELEASES_DIR/$release_id"

    log "Creating release:"
    log "$release_dir"

    mkdir -p "$release_dir"

    # --------------------------------------------------------
    # Extract artifact
    #
    # The archive already contains the standalone layout:
    #   server.js
    #   .next/static/...
    #   public/...
    #   node_modules/...   (trimmed, bundled by Next.js)
    # --------------------------------------------------------

    log "Extracting GitHub Actions artifact..."

    tar \
        -xzf "$ARTIFACT" \
        -C "$release_dir"

    # --------------------------------------------------------
    # Production environment
    # --------------------------------------------------------

    if [[ -f "$SOURCE_DIR/.env" ]]; then

        log "Copying production .env"

        cp -a \
            "$SOURCE_DIR/.env" \
            "$release_dir/.env"

    else

        fail ".env missing from $SOURCE_DIR"

    fi

    # --------------------------------------------------------
    # Validate build
    #
    # NOTE: standalone output ships its own entrypoint and
    # bundled deps, so there is NO npm ci step here anymore.
    # --------------------------------------------------------

    [[ -f "$release_dir/server.js" ]] ||
        fail "Release is missing server.js (standalone entrypoint)"

    [[ -d "$release_dir/.next/static" ]] ||
        fail "Release is missing .next/static"

    log "Release validated (standalone build, no install step needed)"

    printf '%s\n' "$release_dir"
}

# ============================================================
# Start target process
# ============================================================

start_target_process() {

    local name="$1"
    local port="$2"
    local cwd="$3"

    [[ -d "$cwd" ]] ||
        fail "Release directory missing: $cwd"

    [[ -f "$cwd/server.js" ]] ||
        fail "Release missing server.js: $cwd"

    [[ -d "$cwd/.next/static" ]] ||
        fail "Release missing .next/static: $cwd"

    pm2_stop_delete "$name"

    log "Starting $name"
    log "Port: $port"
    log "Directory: $cwd"

    PORT="$port" \
    HOSTNAME="127.0.0.1" \
    pm2 start "$cwd/server.js" \
        --name "$name" \
        --cwd "$cwd" \
        --time

    sleep 2
}

# ============================================================
# Health checks
# ============================================================

health_check_url() {

    local url="$1"
    local label="$2"

    local i

    for i in $(seq 1 "$HEALTH_RETRIES"); do

        if curl \
            --fail \
            --silent \
            --show-error \
            --max-time "$HEALTH_CURL_MAX_TIME" \
            -o /dev/null \
            "$url"; then

            log "Health check OK ($label): $url"

            return 0
        fi

        log "Health check $i/$HEALTH_RETRIES failed ($label)"

        sleep "$HEALTH_INTERVAL_SEC"

    done

    return 1
}

local_health_check() {

    health_check_url \
        "http://127.0.0.1:${1}${HEALTH_PATH}" \
        "local:${1}"
}

public_health_check() {

    health_check_url \
        "$PUBLIC_URL" \
        "public"
}

# ============================================================
# Nginx
# ============================================================

write_nginx_backend() {

    local port="$1"

    local tmp

    tmp="$(mktemp)"

    cat > "$tmp" <<EOF
# Managed by deploy.sh
# BLUE = 127.0.0.1:3000 | GREEN = 127.0.0.1:3002
server 127.0.0.1:${port};
EOF

    sudo cp \
        "$tmp" \
        "$NGINX_BACKEND_CONF"

    rm -f "$tmp"
}

switch_nginx_to_port() {

    local port="$1"
    local previous_port="$2"

    log "Switching Nginx to 127.0.0.1:$port"

    write_nginx_backend "$port"

    if ! sudo nginx -t; then

        log "nginx -t FAILED"

        log "Restoring previous port: $previous_port"

        write_nginx_backend "$previous_port"

        sudo nginx -t >/dev/null 2>&1 || true

        return 1

    fi

    sudo systemctl reload nginx

    log "Nginx switched successfully"

    sleep "$POST_SWITCH_WAIT_SEC"

    return 0
}

rollback_nginx_to_active() {

    local port="$1"

    log "ROLLBACK: restoring port $port"

    write_nginx_backend "$port"

    if ! sudo nginx -t; then

        log "CRITICAL: nginx -t failed during rollback"

        return 1

    fi

    sudo systemctl reload nginx

    sleep "$POST_SWITCH_WAIT_SEC"

    local_health_check "$port" ||
        log "CRITICAL: local health check failed after rollback"

    public_health_check ||
        log "CRITICAL: public health check failed after rollback"
}

# ============================================================
# Save deployment state
# ============================================================

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

    echo "$active_release" \
        > "$STATE_DIR/${active_color}_release"
}

# ============================================================
# Cleanup old releases
# ============================================================

prune_old_releases() {

    local keep="$KEEP_RELEASES"

    local dirs

    mapfile -t dirs < <(
        ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null || true
    )

    local i

    for ((i=keep; i<${#dirs[@]}; i++)); do

        local dir="${dirs[$i]%/}"

        # Never remove a release being used by PM2
        if pm2 jlist 2>/dev/null | grep -q "$dir"; then

            log "Keeping in-use release: $dir"

            continue

        fi

        log "Removing old release: $dir"

        rm -rf "$dir"

    done
}

# ============================================================
# Cleanup uploaded artifact
# ============================================================

cleanup_artifact() {

    if [[ -f "$ARTIFACT" ]]; then

        log "Removing uploaded artifact: $ARTIFACT"

        rm -f "$ARTIFACT"

    fi
}

# ============================================================
# Main
# ============================================================

main() {

    log "============================================"
    log "$APP_NAME"
    log "BLUE/GREEN DEPLOYMENT"
    log "GitHub-built artifact (standalone output)"
    log "============================================"

    log "Artifact:"
    log "$ARTIFACT"

    detect_colors

    log "Active:"
    log "  Color: $ACTIVE_COLOR"
    log "  Name:  $ACTIVE_NAME"
    log "  Port:  $ACTIVE_PORT"

    log "Target:"
    log "  Color: $TARGET_COLOR"
    log "  Name:  $TARGET_NAME"
    log "  Port:  $TARGET_PORT"

    # ========================================================
    # Verify current production
    # ========================================================

    if ! pm2_is_online "$ACTIVE_NAME" &&
       ! {
           [[ "$ACTIVE_COLOR" == "blue" ]] &&
           pm2_is_online "$LEGACY_NAME"
       }; then

        if ss -tln | grep -qE ":${ACTIVE_PORT}\b"; then

            log "Active port $ACTIVE_PORT is listening"

        else

            fail "No process listening on active port $ACTIVE_PORT"

        fi
    fi

    # ========================================================
    # 1. Create release
    # ========================================================

    log "[1/7] Creating release from GitHub artifact"

    RELEASE_DIR="$(create_release_from_artifact)"

    log "Release ready:"
    log "$RELEASE_DIR"

    # ========================================================
    # 2. Prepare target
    # ========================================================

    log "[2/7] Preparing $TARGET_COLOR"

    stop_process_for_color "$TARGET_COLOR"

    if ss -tln | grep -qE ":${TARGET_PORT}\b"; then

        fail "Target port $TARGET_PORT is still in use"

    fi

    # ========================================================
    # 3. Start target
    # ========================================================

    log "[3/7] Starting $TARGET_COLOR"

    start_target_process \
        "$TARGET_NAME" \
        "$TARGET_PORT" \
        "$RELEASE_DIR"

    # ========================================================
    # 4. Local health check
    # ========================================================

    log "[4/7] Local health check"

    if ! local_health_check "$TARGET_PORT"; then

        log "Target health check FAILED"

        stop_process_for_color "$TARGET_COLOR"

        pm2 save

        cleanup_artifact

        fail "Deployment aborted: target unhealthy"

    fi

    # ========================================================
    # 5. Switch Nginx
    # ========================================================

    log "[5/7] Switching Nginx"

    PREVIOUS_PORT="$ACTIVE_PORT"

    if ! switch_nginx_to_port \
        "$TARGET_PORT" \
        "$PREVIOUS_PORT"; then

        log "Nginx switch FAILED"

        stop_process_for_color "$TARGET_COLOR"

        pm2 save

        cleanup_artifact

        fail "Deployment aborted: Nginx switch failed"

    fi

    # ========================================================
    # 6. Public health check
    # ========================================================

    log "[6/7] Public health check"

    if ! public_health_check; then

        log "Public health check FAILED"

        log "Rolling back to port $PREVIOUS_PORT"

        rollback_nginx_to_active "$PREVIOUS_PORT" || true

        stop_process_for_color "$TARGET_COLOR"

        pm2 save

        cleanup_artifact

        fail "Deployment aborted and rolled back"

    fi

    # ========================================================
    # 7. Stop old environment
    # ========================================================

    log "[7/7] Stopping previous environment"

    stop_process_for_color "$ACTIVE_COLOR"

    pm2 save

    save_state \
        "$TARGET_COLOR" \
        "$TARGET_PORT" \
        "$RELEASE_DIR"

    prune_old_releases

    cleanup_artifact

    # ========================================================
    # Success
    # ========================================================

    log "============================================"
    log "DEPLOYMENT SUCCESS"
    log "============================================"

    log "Now live:"
    log "  Color: $TARGET_COLOR"
    log "  Port:  $TARGET_PORT"
    log "  Release: $RELEASE_DIR"

    pm2 list

    echo ""
    echo "============================================"
    echo "RXN3D FRONTEND DEPLOYED SUCCESSFULLY"
    echo "============================================"
    echo "app.rxn3d.com is live."
}

main "$@"