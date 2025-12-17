#!/bin/bash
# E5: Security Headers Tests
# Tests security headers in responses for V3.2 Phase D

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

echo "=========================================="
echo "E5: Security Headers Tests"
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

# Get headers from the main page
echo "Fetching headers from $BASE_URL..."
HEADERS=$(curl -sI "$BASE_URL" 2>/dev/null)

# Test 1: X-Frame-Options
echo ""
echo "Test 1: X-Frame-Options header"
XFO=$(echo "$HEADERS" | grep -i "^x-frame-options:" | head -1)
if echo "$XFO" | grep -iq "DENY"; then
    run_test "X-Frame-Options: DENY" "present" "present"
else
    run_test "X-Frame-Options: DENY" "present" "missing or incorrect"
    echo "   Received: $XFO"
fi

# Test 2: X-Content-Type-Options
echo ""
echo "Test 2: X-Content-Type-Options header"
XCTO=$(echo "$HEADERS" | grep -i "^x-content-type-options:" | head -1)
if echo "$XCTO" | grep -iq "nosniff"; then
    run_test "X-Content-Type-Options: nosniff" "present" "present"
else
    run_test "X-Content-Type-Options: nosniff" "present" "missing"
    echo "   Received: $XCTO"
fi

# Test 3: X-XSS-Protection
echo ""
echo "Test 3: X-XSS-Protection header"
XXSS=$(echo "$HEADERS" | grep -i "^x-xss-protection:" | head -1)
if echo "$XXSS" | grep -iq "1"; then
    run_test "X-XSS-Protection: 1; mode=block" "present" "present"
else
    run_test "X-XSS-Protection: 1; mode=block" "present" "missing"
    echo "   Received: $XXSS"
fi

# Test 4: Referrer-Policy
echo ""
echo "Test 4: Referrer-Policy header"
RP=$(echo "$HEADERS" | grep -i "^referrer-policy:" | head -1)
if echo "$RP" | grep -iq "strict-origin"; then
    run_test "Referrer-Policy: strict-origin-when-cross-origin" "present" "present"
else
    run_test "Referrer-Policy: strict-origin-when-cross-origin" "present" "missing"
    echo "   Received: $RP"
fi

# Test 5: Permissions-Policy
echo ""
echo "Test 5: Permissions-Policy header"
PP=$(echo "$HEADERS" | grep -i "^permissions-policy:" | head -1)
if [ -n "$PP" ]; then
    run_test "Permissions-Policy header" "present" "present"
    echo "   Value: $PP"
else
    run_test "Permissions-Policy header" "present" "missing"
fi

# Test 6: Content-Security-Policy
echo ""
echo "Test 6: Content-Security-Policy header"
CSP=$(echo "$HEADERS" | grep -i "^content-security-policy:" | head -1)
if [ -n "$CSP" ]; then
    run_test "Content-Security-Policy header" "present" "present"
    
    # Check for key directives
    if echo "$CSP" | grep -iq "default-src"; then
        echo "   ✓ default-src directive found"
    fi
    if echo "$CSP" | grep -iq "script-src"; then
        echo "   ✓ script-src directive found"
    fi
    if echo "$CSP" | grep -iq "frame-ancestors"; then
        echo "   ✓ frame-ancestors directive found"
    fi
else
    run_test "Content-Security-Policy header" "present" "missing"
fi

# Test 7: Check API endpoint also has headers
echo ""
echo "Test 7: API endpoint headers"
API_HEADERS=$(curl -sI "$BASE_URL/api/health" 2>/dev/null)
API_XFO=$(echo "$API_HEADERS" | grep -i "^x-frame-options:" | head -1)
if echo "$API_XFO" | grep -iq "DENY"; then
    run_test "API endpoint has X-Frame-Options" "present" "present"
else
    run_test "API endpoint has X-Frame-Options" "present" "missing"
fi

echo ""
echo "=========================================="
echo "E5 Results: $PASS passed, $FAIL failed"
echo "=========================================="
echo ""
echo "Note: Security headers are set in next.config.ts"
echo "and should appear on all responses."

exit $FAIL
