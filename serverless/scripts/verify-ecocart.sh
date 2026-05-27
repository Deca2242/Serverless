#!/usr/bin/env bash
# verify-ecocart.sh — Smoke test EcoCart API + cache Redis + flujo carrito
set -Eeuo pipefail

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
DEMO_USER="usr-jgarcia-001"
DEMO_PRODUCT="telefono-x100"

AWS_CMD=(aws --endpoint-url "$ENDPOINT" --region "$REGION")

PASS=0
FAIL=0

log_pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
log_fail() { echo "  FAIL: $1" >&2; FAIL=$((FAIL + 1)); }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

setup_redis_cli() {
  if command -v redis-cli >/dev/null 2>&1; then
    REDIS_CMD=(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT")
    return
  fi

  local container="${REDIS_CONTAINER:-mercado-serverless-redis}"
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$container"; then
    REDIS_CMD=(docker exec "$container" redis-cli)
    echo "Using redis-cli via docker exec ($container)"
    return
  fi

  echo "redis-cli not found and container '$container' is not running" >&2
  exit 1
}

resolve_base_url() {
  local api_id
  api_id=$("${AWS_CMD[@]}" apigatewayv2 get-apis --query 'Items[0].ApiId' --output text 2>/dev/null || true)
  if [[ -z "$api_id" || "$api_id" == "None" ]]; then
    echo "Could not resolve API ID. Is Floci running?" >&2
    exit 1
  fi
  BASE="http://localhost:4566/restapis/${api_id}/\$default/_user_request_"
  echo "API base: $BASE"
}

http_get() {
  curl -sS -w "\n%{http_code}" "$1"
}

http_get_headers() {
  curl -sS -D - -o /dev/null "$1"
}

http_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$body" "$url"
  else
    curl -sS -w "\n%{http_code}" -X "$method" "$url"
  fi
}

parse_response() {
  HTTP_BODY=$(echo "$1" | sed '$d')
  HTTP_CODE=$(echo "$1" | tail -n1)
}

assert_status() {
  local expected="$1"
  if [[ "$HTTP_CODE" == "$expected" ]]; then
    log_pass "HTTP $HTTP_CODE"
  else
    log_fail "Expected HTTP $expected, got $HTTP_CODE — body: ${HTTP_BODY:0:200}"
  fi
}

assert_json_array_length() {
  local min="$1"
  local count
  count=$(echo "$HTTP_BODY" | jq 'length')
  if [[ "$count" -ge "$min" ]]; then
    log_pass "JSON array length $count (>= $min)"
  else
    log_fail "Expected array length >= $min, got $count"
  fi
}

assert_json_field() {
  local filter="$1"
  local desc="$2"
  if echo "$HTTP_BODY" | jq -e "$filter" >/dev/null 2>&1; then
    log_pass "$desc"
  else
    log_fail "$desc"
  fi
}

assert_redis_key_exists() {
  local key="$1"
  local exists
  exists=$("${REDIS_CMD[@]}" EXISTS "$key" 2>/dev/null || echo "0")
  if [[ "$exists" == "1" ]]; then
    log_pass "Redis key exists: $key"
  else
    log_fail "Redis key missing: $key"
  fi
}

assert_redis_key_gone() {
  local key="$1"
  local exists
  exists=$("${REDIS_CMD[@]}" EXISTS "$key" 2>/dev/null || echo "0")
  if [[ "$exists" == "0" ]]; then
    log_pass "Redis key absent: $key"
  else
    log_fail "Redis key still present: $key"
  fi
}

assert_cache_header() {
  local url="$1"
  local expected="$2"
  local header
  header=$(http_get_headers "$url" | grep -i '^x-cache:' | tr -d '\r' | awk '{print $2}' || true)
  if [[ "$header" == "$expected" ]]; then
    log_pass "X-Cache: $header on second request"
  else
    log_fail "Expected X-Cache: $expected, got '${header:-<missing>}' (set CACHE_DEBUG=true and redeploy)"
  fi
}

# --- Phase A: Health API ---
phase_a() {
  echo ""
  echo "=== Phase A: Health API ==="

  parse_response "$(http_get "$BASE/categories")"
  assert_status 200
  assert_json_array_length 4

  parse_response "$(http_get "$BASE/products")"
  assert_status 200
  assert_json_array_length 6
  assert_json_field '.[0].stock != null' "products include stock field"

  parse_response "$(http_get "$BASE/users/$DEMO_USER/dashboard")"
  assert_status 200
  assert_json_field '.profile.email == "jgarcia@example.com"' "demo user profile"
  assert_json_field '.addresses | length >= 1' "demo user has address"

  parse_response "$(http_get "$BASE/cart/$DEMO_USER")"
  assert_status 200
  assert_json_field '.itemCount >= 0' "cart returns itemCount"
}

# --- Phase B: Cart flow ---
phase_b() {
  echo ""
  echo "=== Phase B: Cart flow ==="

  parse_response "$(http_json POST "$BASE/cart/$DEMO_USER/items" "{\"productSlug\":\"$DEMO_PRODUCT\",\"qty\":1}")"
  assert_status 200
  assert_json_field '.itemCount >= 1' "item added to cart"

  parse_response "$(http_get "$BASE/cart/$DEMO_USER")"
  assert_status 200
  assert_json_field '.itemCount >= 1' "cart itemCount after add"

  parse_response "$(http_json DELETE "$BASE/cart/$DEMO_USER")"
  assert_status 204
  log_pass "cart cleared (HTTP 204)"
}

# --- Phase C: Cache verification ---
phase_c() {
  echo ""
  echo "=== Phase C: Cache verification ==="

  # Warm cache
  parse_response "$(http_get "$BASE/categories")"
  assert_status 200

  parse_response "$(http_get "$BASE/products")"
  assert_status 200

  assert_redis_key_exists "mg:catalog:categories"
  assert_redis_key_exists "mg:catalog:products:all"

  local cat_ttl prod_ttl
  cat_ttl=$("${REDIS_CMD[@]}" TTL "mg:catalog:categories" 2>/dev/null || echo "-2")
  prod_ttl=$("${REDIS_CMD[@]}" TTL "mg:catalog:products:all" 2>/dev/null || echo "-2")
  if [[ "$cat_ttl" -gt 0 ]]; then
    log_pass "categories TTL > 0 ($cat_ttl s)"
  else
    log_fail "categories TTL not set ($cat_ttl)"
  fi
  if [[ "$prod_ttl" -gt 0 ]]; then
    log_pass "products TTL > 0 ($prod_ttl s)"
  else
    log_fail "products TTL not set ($prod_ttl)"
  fi

  # First request may be MISS or HIT depending on phase A; second should be HIT
  http_get "$BASE/categories" >/dev/null
  assert_cache_header "$BASE/categories" "HIT"
}

# --- Phase D: Cache invalidation ---
phase_d() {
  echo ""
  echo "=== Phase D: Cache invalidation ==="

  # Ensure products cache is populated
  http_get "$BASE/products" >/dev/null
  assert_redis_key_exists "mg:catalog:products:all"

  parse_response "$(http_json PATCH "$BASE/products/$DEMO_PRODUCT/stock" '{"qty":14}')"
  assert_status 200

  assert_redis_key_gone "mg:catalog:products:all"

  # Restore original stock from seed
  parse_response "$(http_json PATCH "$BASE/products/$DEMO_PRODUCT/stock" '{"qty":15}')"
  assert_status 200
  log_pass "stock restored to seed value"
}

# --- Phase E: Validation boundary ---
phase_e() {
  echo ""
  echo "=== Phase E: Validation boundary ==="

  parse_response "$(curl -sS -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{invalid json' \
    "$BASE/cart/$DEMO_USER/items")"
  assert_status 400
  assert_json_field '.error != null' "invalid JSON returns error message"
}

# --- Main ---
main() {
  require_cmd aws
  require_cmd curl
  require_cmd jq
  setup_redis_cli

  echo "EcoCart verification script"
  resolve_base_url

  if ! "${REDIS_CMD[@]}" ping >/dev/null 2>&1; then
    echo "Redis not reachable at $REDIS_HOST:$REDIS_PORT" >&2
    exit 1
  fi

  phase_a
  phase_b
  phase_c
  phase_d
  phase_e

  echo ""
  echo "=== Summary ==="
  echo "  Passed: $PASS"
  echo "  Failed: $FAIL"

  if [[ "$FAIL" -gt 0 ]]; then
    echo "Verification FAILED" >&2
    exit 1
  fi

  echo "Verification PASSED"
}

main "$@"
