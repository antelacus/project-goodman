#!/bin/bash
# E2: Input Validation Tests
# Tests Zod schema validation for V3.2 security implementation

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

echo "=========================================="
echo "E2: Input Validation Tests"
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

echo "=== Financial Analysis Validation ==="
echo ""

# Test 1: Empty question should be rejected
echo "Test 1: Empty question rejected"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/financial-analysis" \
    -H "Content-Type: application/json" \
    -d '{"question": ""}')
run_test "Empty question returns 413" "413" "$STATUS"

# Test 2: Valid question should be accepted (might fail due to other reasons, check for non-413)
echo ""
echo "Test 2: Valid short question"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/financial-analysis" \
    -H "Content-Type: application/json" \
    -d '{"question": "什么是流动比率?"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS" != "413" ]; then
    run_test "Valid question not rejected as 413" "not 413" "not 413"
else
    run_test "Valid question not rejected as 413" "not 413" "413"
    echo "   Body: $BODY"
fi

# Test 3: Question too long (> 2000 chars) should be rejected
echo ""
echo "Test 3: Question too long rejected"
# Generate a 2100 char string (> 2000 limit)
LONG_QUESTION=$(python3 -c "print('测' * 2100)")  # 2100 Chinese chars > 2000 limit
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/financial-analysis" \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"$LONG_QUESTION\"}")
run_test "Too long question returns 413" "413" "$STATUS"

echo ""
echo "=== Landing Chat Validation ==="
echo ""

# Test 4: Empty message should be rejected
echo "Test 4: Empty message rejected"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/landing-chat" \
    -H "Content-Type: application/json" \
    -d '{"message": ""}')
run_test "Empty message returns 413" "413" "$STATUS"

# Test 5: Missing message field should be rejected
echo ""
echo "Test 5: Missing message field rejected"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/landing-chat" \
    -H "Content-Type: application/json" \
    -d '{}')
run_test "Missing message returns 413" "413" "$STATUS"

# Test 6: Valid message should be accepted
echo ""
echo "Test 6: Valid message accepted"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/landing-chat" \
    -H "Content-Type: application/json" \
    -d '{"message": "你好"}')
STATUS=$(echo "$RESPONSE" | tail -1)

if [ "$STATUS" != "413" ]; then
    run_test "Valid message not rejected as 413" "not 413" "not 413"
else
    run_test "Valid message not rejected as 413" "not 413" "413"
fi

echo ""
echo "=== Guidance Chat Validation ==="
echo ""

# Test 7: Empty question should be rejected
echo "Test 7: Empty question rejected"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/guidance-chat" \
    -H "Content-Type: application/json" \
    -d '{"question": ""}')
run_test "Empty question returns 413" "413" "$STATUS"

# Test 8: Valid question structure
echo ""
echo "Test 8: Valid guidance question"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/guidance-chat" \
    -H "Content-Type: application/json" \
    -d '{"question": "固定资产折旧的规定是什么?"}')
STATUS=$(echo "$RESPONSE" | tail -1)

if [ "$STATUS" != "413" ]; then
    run_test "Valid guidance question not rejected as 413" "not 413" "not 413"
else
    run_test "Valid guidance question not rejected as 413" "not 413" "413"
fi

echo ""
echo "=== Admin Verify Password Validation ==="
echo ""

# Test 9: Empty password should be rejected
echo "Test 9: Empty password rejected"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -d '{"password": ""}')
# Note: Empty password returns 400, not 413 (different validation path)
if [ "$STATUS" == "400" ] || [ "$STATUS" == "413" ]; then
    run_test "Empty password rejected (400 or 413)" "rejected" "rejected"
else
    run_test "Empty password rejected (400 or 413)" "rejected" "$STATUS"
fi

# Test 10: Missing password field should be rejected
echo ""
echo "Test 10: Missing password field"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -d '{}')
if [ "$STATUS" == "400" ] || [ "$STATUS" == "413" ]; then
    run_test "Missing password rejected (400 or 413)" "rejected" "rejected"
else
    run_test "Missing password rejected (400 or 413)" "rejected" "$STATUS"
fi

echo ""
echo "=== Error Response Format ==="
echo ""

# Test 11: Error response includes requestId
echo "Test 11: Error response includes requestId"
RESPONSE=$(curl -s \
    -X POST "$BASE_URL/api/financial-analysis" \
    -H "Content-Type: application/json" \
    -d '{"question": ""}')
REQUEST_ID=$(echo "$RESPONSE" | grep -o '"requestId"')
if [ -n "$REQUEST_ID" ]; then
    run_test "Error response includes requestId" "present" "present"
else
    run_test "Error response includes requestId" "present" "missing"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "E2 Results: $PASS passed, $FAIL failed"
echo "=========================================="

exit $FAIL
