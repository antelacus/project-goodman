#!/bin/bash
# E3: Session Management Tests
# Tests Redis-backed sessions and HTTP-only cookies for V3.2 security

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
PASS=0
FAIL=0

echo "=========================================="
echo "E3: Session Management Tests"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Check if password is set
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "⚠️  Warning: ADMIN_PASSWORD not set, using 'test' as fallback"
    ADMIN_PASSWORD="test"
fi

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

# Test 1: Login returns Set-Cookie header
echo "Test 1: Login returns Set-Cookie header"
RESPONSE=$(curl -s -D - -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)

BODY=$(echo "$RESPONSE" | tail -1)
VALID=$(echo "$BODY" | grep -o '"valid":true' | head -1)
COOKIE_HEADER=$(echo "$RESPONSE" | grep -i "set-cookie:" | head -1)

if [ -n "$VALID" ]; then
    run_test "Login successful with valid password" "present" "present"
else
    run_test "Login successful with valid password" "present" "missing"
    echo "   Response body: $BODY"
fi

if [ -n "$COOKIE_HEADER" ]; then
    run_test "Set-Cookie header present on login" "present" "present"
else
    run_test "Set-Cookie header present on login" "present" "missing"
fi

# Test 2: Cookie has HttpOnly flag
echo ""
echo "Test 2: Cookie has HttpOnly flag"
HTTPONLY=$(echo "$COOKIE_HEADER" | grep -i "httponly" | head -1)

if [ -n "$HTTPONLY" ]; then
    run_test "Cookie has HttpOnly flag" "present" "present"
else
    run_test "Cookie has HttpOnly flag" "present" "missing"
    echo "   Cookie: $COOKIE_HEADER"
fi

# Test 3: Cookie has SameSite=Strict flag
echo ""
echo "Test 3: Cookie has SameSite=Strict flag"
SAMESITE=$(echo "$COOKIE_HEADER" | grep -i "samesite=strict" | head -1)

if [ -n "$SAMESITE" ]; then
    run_test "Cookie has SameSite=Strict flag" "present" "present"
else
    run_test "Cookie has SameSite=Strict flag" "present" "missing"
    echo "   Cookie: $COOKIE_HEADER"
fi

# Test 4: Cookie session name is correct
echo ""
echo "Test 4: Cookie session name is 'session'"
SESSION_NAME=$(echo "$COOKIE_HEADER" | grep -o "session=" | head -1)

if [ -n "$SESSION_NAME" ]; then
    run_test "Cookie name is 'session'" "present" "present"
else
    run_test "Cookie name is 'session'" "present" "missing"
fi

# Test 5: Response includes expiresAt timestamp
echo ""
echo "Test 5: Response includes expiresAt"
EXPIRES_AT=$(echo "$BODY" | grep -o '"expiresAt":' | head -1)

if [ -n "$EXPIRES_AT" ]; then
    run_test "Response has expiresAt field" "present" "present"
else
    run_test "Response has expiresAt field" "present" "missing"
fi

# Test 6: Invalid password returns valid: false
echo ""
echo "Test 6: Invalid password returns valid: false"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -d '{"password":"wrong-password-12345"}' 2>/dev/null)

INVALID=$(echo "$RESPONSE" | grep -o '"valid":false' | head -1)

if [ -n "$INVALID" ]; then
    run_test "Invalid password returns valid: false" "present" "present"
else
    run_test "Invalid password returns valid: false" "present" "missing"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "E3 Results: $PASS passed, $FAIL failed"
echo "=========================================="

exit $FAIL
