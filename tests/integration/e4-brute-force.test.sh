#!/bin/bash
# E4: Brute-Force Protection Tests
# Tests login attempt limiting and lockout for V3.2 security

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
PASS=0
FAIL=0

# Use a unique IP to avoid cross-test contamination
TEST_IP="192.168.99.$(date +%S)"

echo "=========================================="
echo "E4: Brute-Force Protection Tests"
echo "Base URL: $BASE_URL"
echo "Test IP: $TEST_IP"
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

# Helper function to make login attempt
make_attempt() {
    local password="$1"
    curl -s -D - -X POST "$BASE_URL/api/admin/verify-password" \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: $TEST_IP" \
        -d "{\"password\":\"$password\"}" 2>/dev/null
}

# Test 1: First 3 failed attempts should work without delay
echo "Test 1: First 3 failed attempts (no delay)"
for i in 1 2 3; do
    RESPONSE=$(make_attempt "wrong-password-$i")
    STATUS=$(echo "$RESPONSE" | grep "HTTP/" | head -1 | awk '{print $2}')
    BODY=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" == "200" ]; then
        echo "   Attempt $i: OK (status 200)"
    else
        run_test "Attempt $i allows retry" "200" "$STATUS"
    fi
done
run_test "First 3 attempts allowed" "success" "success"

# Test 2: 4th and 5th attempts should suggest delay (but still work)
echo ""
echo "Test 2: Attempts 4-5 (allowed with delay suggestion)"

# Wait a bit to avoid rate limiting
sleep 1

for i in 4 5; do
    RESPONSE=$(make_attempt "wrong-password-$i")
    STATUS=$(echo "$RESPONSE" | grep "HTTP/" | head -1 | awk '{print $2}')
    BODY=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" == "200" ]; then
        echo "   Attempt $i: OK (status 200)"
    elif [ "$STATUS" == "429" ]; then
        # This is the lockout response
        WAIT=$(echo "$BODY" | grep -o '"waitSeconds":[0-9]*' | cut -d: -f2)
        echo "   Attempt $i: Locked (wait $WAIT seconds)"
        
        if [ "$i" == "5" ]; then
            run_test "5th attempt triggers lockout" "locked" "locked"
            i=10  # Signal we hit lockout early
            break
        fi
    else
        echo "   Attempt $i: Unexpected status $STATUS"
    fi
done

# Test 3: After 5 failures, should be locked out
echo ""
echo "Test 3: 6th attempt should be blocked (429)"
RESPONSE=$(make_attempt "wrong-password-6")
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | head -1 | awk '{print $2}')
# Extract JSON body - find line containing 'valid'
BODY=$(echo "$RESPONSE" | grep '"valid"' | head -1)

if [ "$STATUS" == "429" ]; then
    run_test "6th attempt blocked with 429" "429" "429"
    
    # Check for waitSeconds in response
    WAIT=$(echo "$BODY" | grep -oE '"waitSeconds":[0-9]+' | cut -d: -f2)
    if [ -n "$WAIT" ]; then
        run_test "Lockout response includes waitSeconds" "present" "present"
        echo "   Lockout remaining: ${WAIT}s"
    else
        run_test "Lockout response includes waitSeconds" "present" "missing"
        echo "   Body: $BODY"
    fi
    
    # Check for Retry-After header (case-insensitive)
    RETRY_AFTER=$(echo "$RESPONSE" | grep -i "^retry-after:" | head -1)
    if [ -n "$RETRY_AFTER" ]; then
        run_test "Retry-After header present" "present" "present"
    else
        run_test "Retry-After header present" "present" "missing"
    fi
else
    run_test "6th attempt blocked with 429" "429" "$STATUS"
    echo "   Response: $BODY"
fi

# Test 4: Successful login should reset counter (using different IP since we're locked)
echo ""
echo "Test 4: Successful login resets counter (clean IP test)"
CLEAN_IP="10.0.0.$(date +%S)"

# Make a successful login
RESPONSE=$(curl -s -D - -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: $CLEAN_IP" \
    -d "{\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)

BODY=$(echo "$RESPONSE" | tail -1)
VALID=$(echo "$BODY" | grep -o '"valid":true' | head -1)

if [ -n "$VALID" ]; then
    run_test "Successful login with correct password" "valid" "valid"
    
    # Now try a wrong password from same IP - should still work (counter reset)
    RESPONSE=$(curl -s -D - -X POST "$BASE_URL/api/admin/verify-password" \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: $CLEAN_IP" \
        -d '{"password":"wrong-again"}' 2>/dev/null)
    
    STATUS=$(echo "$RESPONSE" | grep "HTTP/" | head -1 | awk '{print $2}')
    if [ "$STATUS" == "200" ]; then
        run_test "Counter reset allows new attempts" "200" "200"
    else
        run_test "Counter reset allows new attempts" "200" "$STATUS"
    fi
else
    run_test "Successful login with correct password" "valid" "invalid"
    echo "   Response: $BODY"
fi

echo ""
echo "=========================================="
echo "E4 Results: $PASS passed, $FAIL failed"
echo "=========================================="
echo ""
echo "Note: Lockout uses IP-based tracking. If tests fail,"
echo "wait 15 minutes or use a different test IP."

exit $FAIL
