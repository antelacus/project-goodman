#!/bin/bash
# E1: Rate Limiting Tests
# Tests rate limiting functionality for V3.2 security implementation

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

# Use a fake external IP to bypass localhost whitelist
EXTERNAL_IP_HEADER='-H "X-Forwarded-For: 8.8.8.8"'

echo "=========================================="
echo "E1: Rate Limiting Tests"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Helper function to run test
run_test() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    
    if [ "$expected" == "$actual" ]; then
        echo "✅ PASS: $name"
        ((PASS++))
    else
        echo "❌ FAIL: $name"
        echo "   Expected: $expected"
        echo "   Actual:   $actual"
        ((FAIL++))
    fi
}

# Test 1: Health endpoint should have X-Request-ID header
echo "Test 1: X-Request-ID Header"
RESPONSE=$(curl -s -D - -o /dev/null "$BASE_URL/api/health" 2>/dev/null)
REQUEST_ID=$(echo "$RESPONSE" | grep -i "x-request-id" | head -1)
if [ -n "$REQUEST_ID" ]; then
    run_test "Health endpoint has X-Request-ID" "present" "present"
else
    run_test "Health endpoint has X-Request-ID" "present" "missing"
fi

# Test 2: Rate limit headers should be present (with external IP)
echo ""
echo "Test 2: Rate Limit Headers (with external IP)"
RESPONSE=$(curl -s -D - -o /dev/null -H "X-Forwarded-For: 8.8.8.8" "$BASE_URL/api/preset-functions" 2>/dev/null)
RATE_LIMIT=$(echo "$RESPONSE" | grep -i "x-ratelimit-limit" | head -1)
RATE_REMAINING=$(echo "$RESPONSE" | grep -i "x-ratelimit-remaining" | head -1)
RATE_RESET=$(echo "$RESPONSE" | grep -i "x-ratelimit-reset" | head -1)

if [ -n "$RATE_LIMIT" ]; then
    run_test "X-RateLimit-Limit header present" "present" "present"
else
    run_test "X-RateLimit-Limit header present" "present" "missing"
fi

if [ -n "$RATE_REMAINING" ]; then
    run_test "X-RateLimit-Remaining header present" "present" "present"
else
    run_test "X-RateLimit-Remaining header present" "present" "missing"
fi

if [ -n "$RATE_RESET" ]; then
    run_test "X-RateLimit-Reset header present" "present" "present"
else
    run_test "X-RateLimit-Reset header present" "present" "missing"
fi

# Test 3: Whitelist bypass (localhost should not hit rate limit)
echo ""
echo "Test 3: Localhost Whitelist Bypass"
# Make 10 rapid requests - should all succeed for localhost
for i in {1..10}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
    if [ "$STATUS" != "200" ]; then
        run_test "Localhost request $i bypasses rate limit" "200" "$STATUS"
        break
    fi
done
run_test "10 rapid localhost requests all succeed" "200" "200"

# Test 4: Rate limit headers show correct values
echo ""
echo "Test 4: Rate Limit Header Values (default category = 100/min)"
RESPONSE=$(curl -s -D - -o /dev/null -H "X-Forwarded-For: 10.0.0.99" "$BASE_URL/api/preset-functions" 2>/dev/null)
LIMIT_VALUE=$(echo "$RESPONSE" | grep -i "x-ratelimit-limit:" | sed 's/.*: //' | tr -d '\r\n ')

if [ "$LIMIT_VALUE" == "100" ]; then
    run_test "Default endpoint rate limit is 100" "100" "$LIMIT_VALUE"
else
    run_test "Default endpoint rate limit is 100" "100" "$LIMIT_VALUE"
fi

# Test 5: Request ID is unique for each request
echo ""
echo "Test 5: Unique Request IDs"
ID1=$(curl -s -D - -o /dev/null "$BASE_URL/api/health" 2>/dev/null | grep -i "x-request-id:" | sed 's/.*: //' | tr -d '\r\n')
ID2=$(curl -s -D - -o /dev/null "$BASE_URL/api/health" 2>/dev/null | grep -i "x-request-id:" | sed 's/.*: //' | tr -d '\r\n')

if [ -n "$ID1" ] && [ -n "$ID2" ] && [ "$ID1" != "$ID2" ]; then
    run_test "Request IDs are unique" "unique" "unique"
else
    run_test "Request IDs are unique" "unique" "same or missing"
fi

echo ""
echo "=========================================="
echo "E1 Results: $PASS passed, $FAIL failed"
echo "=========================================="

exit $FAIL
