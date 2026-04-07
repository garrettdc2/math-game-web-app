#!/bin/sh
# deploy-supervisor.sh — Manages locally deployed app servers via JSON manifests.
# Runs inside the OpenClaw container as a background process.
# Reads manifests from /root/deploys/*.json, starts apps, health-checks, auto-restarts.

DEPLOYS_DIR="/root/deploys"
HEALTH_INTERVAL=30
POLL_INTERVAL=10
MAX_RETRIES=3
LOG_PREFIX="[deploy-supervisor]"

log() { echo "$LOG_PREFIX $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

# Read a field from a JSON file using lightweight parsing (no jq dependency).
# Usage: json_field file.json fieldname
json_field() {
  sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^,\"}\r]*\)\"\{0,1\}.*/\1/p" "$1" | head -1
}

json_field_num() {
  sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p" "$1" | head -1
}

# Write a runtime field into a manifest (update in place).
update_manifest() {
  _file="$1" _key="$2" _val="$3"
  if grep -q "\"$_key\"" "$_file" 2>/dev/null; then
    # Update existing key
    sed -i "s/\"$_key\"[[:space:]]*:[[:space:]]*[^,}]*/\"$_key\": $_val/" "$_file" 2>/dev/null
  else
    # Append before closing brace
    sed -i "s/}$/,\n  \"$_key\": $_val\n}/" "$_file" 2>/dev/null
  fi
}

start_app() {
  _manifest="$1"
  _task_id=$(json_field "$_manifest" "task_id")
  _workspace=$(json_field "$_manifest" "workspace")
  _port=$(json_field_num "$_manifest" "port")
  _start_cmd=$(json_field "$_manifest" "start_cmd")

  if [ -z "$_task_id" ] || [ -z "$_workspace" ] || [ -z "$_port" ] || [ -z "$_start_cmd" ]; then
    log "ERROR: Invalid manifest $_manifest (missing required fields)"
    return 1
  fi

  if [ ! -d "$_workspace" ]; then
    log "ERROR: Workspace $_workspace does not exist for $_task_id"
    update_manifest "$_manifest" "status" "\"failed\""
    return 1
  fi

  log "Starting $_task_id on port $_port (cmd: $_start_cmd)"

  # Start the app server in the background, redirect output to a log file
  _logfile="$DEPLOYS_DIR/${_task_id}.log"
  cd "$_workspace" || return 1
  PORT=$_port sh -c "$_start_cmd" > "$_logfile" 2>&1 &
  _pid=$!
  cd / || true

  # Give the process a moment to start or fail immediately
  sleep 2

  if kill -0 "$_pid" 2>/dev/null; then
    log "Started $_task_id (PID $_pid) on port $_port"
    update_manifest "$_manifest" "pid" "$_pid"
    update_manifest "$_manifest" "status" "\"running\""
    update_manifest "$_manifest" "retries" "0"
    return 0
  else
    log "FAILED: $_task_id process exited immediately (PID $_pid)"
    update_manifest "$_manifest" "status" "\"failed\""
    return 1
  fi
}

check_health() {
  _manifest="$1"
  _task_id=$(json_field "$_manifest" "task_id")
  _pid=$(json_field_num "$_manifest" "pid")
  _port=$(json_field_num "$_manifest" "port")
  _status=$(json_field "$_manifest" "status")
  _retries=$(json_field_num "$_manifest" "retries")

  [ -z "$_retries" ] && _retries=0

  # Skip non-running manifests
  case "$_status" in
    failed|stopped|pending) return 0 ;;
  esac

  _healthy=true

  # Check if PID is alive
  if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then
    _healthy=false
  fi

  # Check if port responds (5-second timeout)
  if [ -n "$_port" ]; then
    if ! wget -q -O /dev/null --timeout=5 "http://localhost:$_port" 2>/dev/null && \
       ! wget -q -O /dev/null --timeout=5 --spider "http://localhost:$_port" 2>/dev/null; then
      _healthy=false
    fi
  fi

  _now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  update_manifest "$_manifest" "last_check" "\"$_now\""

  if $_healthy; then
    # Reset retries on healthy check
    if [ "$_retries" -gt 0 ]; then
      update_manifest "$_manifest" "retries" "0"
      log "RECOVERED: $_task_id is healthy again"
    fi
    return 0
  fi

  # Unhealthy — attempt restart
  _retries=$((_retries + 1))
  update_manifest "$_manifest" "retries" "$_retries"

  if [ "$_retries" -ge "$MAX_RETRIES" ]; then
    log "FAILED: $_task_id exceeded max retries ($_retries/$MAX_RETRIES), marking as failed"
    update_manifest "$_manifest" "status" "\"failed\""
    # Clean up dead process
    [ -n "$_pid" ] && kill "$_pid" 2>/dev/null
    return 1
  fi

  log "UNHEALTHY: $_task_id (retry $_retries/$MAX_RETRIES), restarting..."
  # Kill old process if still around
  [ -n "$_pid" ] && kill "$_pid" 2>/dev/null
  sleep 1
  start_app "$_manifest"
}

# Graceful shutdown — kill all managed processes
cleanup() {
  log "Shutting down all managed processes..."
  for _manifest in "$DEPLOYS_DIR"/*.json; do
    [ -f "$_manifest" ] || continue
    _pid=$(json_field_num "$_manifest" "pid")
    if [ -n "$_pid" ] && kill -0 "$_pid" 2>/dev/null; then
      _task_id=$(json_field "$_manifest" "task_id")
      log "Stopping $_task_id (PID $_pid)"
      kill "$_pid" 2>/dev/null
      update_manifest "$_manifest" "status" "\"stopped\""
    fi
  done
  log "Shutdown complete."
  exit 0
}

trap cleanup TERM INT

# === Main Loop ===

log "Deploy supervisor starting. Watching $DEPLOYS_DIR"
mkdir -p "$DEPLOYS_DIR"

# Startup: start all pending/running manifests
for manifest in "$DEPLOYS_DIR"/*.json; do
  [ -f "$manifest" ] || continue
  _status=$(json_field "$manifest" "status")
  case "$_status" in
    pending|running|"")
      start_app "$manifest"
      ;;
  esac
done

log "Initial startup complete. Entering health/poll loop."

_tick=0
while true; do
  sleep "$POLL_INTERVAL"
  _tick=$((_tick + POLL_INTERVAL))

  # Poll for new manifests (pending status or no status)
  for manifest in "$DEPLOYS_DIR"/*.json; do
    [ -f "$manifest" ] || continue
    _status=$(json_field "$manifest" "status")
    if [ "$_status" = "pending" ] || [ -z "$_status" ]; then
      start_app "$manifest"
    fi
  done

  # Health check every HEALTH_INTERVAL seconds
  if [ "$_tick" -ge "$HEALTH_INTERVAL" ]; then
    _tick=0
    for manifest in "$DEPLOYS_DIR"/*.json; do
      [ -f "$manifest" ] || continue
      check_health "$manifest"
    done
  fi
done
