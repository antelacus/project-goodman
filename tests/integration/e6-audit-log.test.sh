#!/bin/bash
# E6: Audit Logger Tests
# Tests audit log creation and format for V3.2 Phase D

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
LOG_DIR="${AUDIT_LOG_DIR:-/var/log/goodman}"
LOG_FILE="$LOG_DIR/audit.log"
PASS=0
FAIL=0

echo "=========================================="
echo "E6: Audit Logger Tests"
echo "Base URL: $BASE_URL"
echo "Log File: $LOG_FILE"
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

# Test 0: Check log directory exists
echo "Test 0: Log directory setup"
if [ -d "$LOG_DIR" ]; then
    run_test "Log directory exists" "exists" "exists"
else
    echo "⚠️  Log directory does not exist. Creating..."
    if sudo mkdir -p "$LOG_DIR" 2>/dev/null; then
        sudo chown $(whoami) "$LOG_DIR" 2>/dev/null
        run_test "Log directory created" "created" "created"
    else
        echo "❌ Cannot create log directory. Tests may fail."
        echo "   Run: sudo mkdir -p $LOG_DIR && sudo chown \$(whoami) $LOG_DIR"
        run_test "Log directory exists" "exists" "missing"
    fi
fi

# Get initial log line count
INITIAL_LINES=0
if [ -f "$LOG_FILE" ]; then
    INITIAL_LINES=$(wc -l < "$LOG_FILE")
fi
echo "   Initial log lines: $INITIAL_LINES"

# Test 1: Failed login should create audit log entry
echo ""
echo "Test 1: Failed login creates audit entry"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -d '{"password":"wrong-password-test"}' 2>/dev/null)

# Wait a moment for async log write
sleep 1

if [ -f "$LOG_FILE" ]; then
    NEW_LINES=$(wc -l < "$LOG_FILE")
    if [ "$NEW_LINES" -gt "$INITIAL_LINES" ]; then
        run_test "Failed login logged" "logged" "logged"
        INITIAL_LINES=$NEW_LINES
    else
        run_test "Failed login logged" "logged" "not logged"
        echo "   Note: If running in dev, check console for [Audit] messages"
    fi
else
    run_test "Failed login logged" "logged" "log file not found"
    echo "   Note: In dev mode, audit may only log to console"
fi

# Test 2: Successful login should create audit log entry
echo ""
echo "Test 2: Successful login creates audit entry"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/verify-password" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)

# Wait a moment for async log write
sleep 1

VALID=$(echo "$RESPONSE" | grep -o '"valid":true' | head -1)
if [ -n "$VALID" ]; then
    echo "   Login succeeded"
    
    if [ -f "$LOG_FILE" ]; then
        NEW_LINES=$(wc -l < "$LOG_FILE")
        if [ "$NEW_LINES" -gt "$INITIAL_LINES" ]; then
            run_test "Successful login logged" "logged" "logged"
        else
            run_test "Successful login logged" "logged" "not logged"
        fi
    else
        run_test "Successful login logged" "logged" "log file not found"
    fi
else
    echo "   Login failed (check password)"
    run_test "Successful login logged" "logged" "login failed"
fi

# Test 3: Verify log entry format is valid JSON
echo ""
echo "Test 3: Log entries are valid JSON"
if [ -f "$LOG_FILE" ]; then
    # Get last line and check if it's valid JSON
    LAST_LINE=$(tail -1 "$LOG_FILE")
    
    if echo "$LAST_LINE" | python3 -m json.tool > /dev/null 2>&1; then
        run_test "Log entry is valid JSON" "valid" "valid"
    elif echo "$LAST_LINE" | jq . > /dev/null 2>&1; then
        run_test "Log entry is valid JSON" "valid" "valid"
    else
        run_test "Log entry is valid JSON" "valid" "invalid"
        echo "   Last line: $LAST_LINE"
    fi
else
    run_test "Log entry is valid JSON" "valid" "log file not found"
fi

# Test 4: Log entry has required fields
echo ""
echo "Test 4: Log entry has required fields"
if [ -f "$LOG_FILE" ]; then
    LAST_LINE=$(tail -1 "$LOG_FILE")
    
    HAS_TIMESTAMP=$(echo "$LAST_LINE" | grep -o '"timestamp":' | head -1)
    HAS_EVENTTYPE=$(echo "$LAST_LINE" | grep -o '"eventType":' | head -1)
    HAS_ACTION=$(echo "$LAST_LINE" | grep -o '"action":' | head -1)
    HAS_IP=$(echo "$LAST_LINE" | grep -o '"ip":' | head -1)
    
    FIELDS_FOUND=0
    [ -n "$HAS_TIMESTAMP" ] && ((FIELDS_FOUND++)) && echo "   ✓ timestamp field"
    [ -n "$HAS_EVENTTYPE" ] && ((FIELDS_FOUND++)) && echo "   ✓ eventType field"
    [ -n "$HAS_ACTION" ] && ((FIELDS_FOUND++)) && echo "   ✓ action field"
    [ -n "$HAS_IP" ] && ((FIELDS_FOUND++)) && echo "   ✓ ip field"
    
    if [ "$FIELDS_FOUND" -eq 4 ]; then
        run_test "Log has required fields (4/4)" "complete" "complete"
    else
        run_test "Log has required fields (4/4)" "complete" "${FIELDS_FOUND}/4 found"
    fi
else
    run_test "Log has required fields" "complete" "log file not found"
fi

# Test 5: Check for auth event types
echo ""
echo "Test 5: Auth event types logged"
if [ -f "$LOG_FILE" ]; then
    HAS_LOGIN_FAILED=$(grep -c '"login_failed"' "$LOG_FILE" 2>/dev/null || echo 0)
    HAS_LOGIN_SUCCESS=$(grep -c '"login_success"' "$LOG_FILE" 2>/dev/null || echo 0)
    
    echo "   login_failed events: $HAS_LOGIN_FAILED"
    echo "   login_success events: $HAS_LOGIN_SUCCESS"
    
    if [ "$HAS_LOGIN_FAILED" -gt 0 ] || [ "$HAS_LOGIN_SUCCESS" -gt 0 ]; then
        run_test "Auth events logged" "logged" "logged"
    else
        run_test "Auth events logged" "logged" "not found"
    fi
else
    run_test "Auth events logged" "logged" "log file not found"
fi

echo ""
echo "=========================================="
echo "E6 Results: $PASS passed, $FAIL failed"
echo "=========================================="
echo ""
echo "Note: If log file not found, audit logger may be in console-only mode."
echo "Check console output for [Audit] messages during test execution."
echo ""
echo "To enable file logging, ensure the log directory exists:"
echo "  sudo mkdir -p $LOG_DIR"
echo "  sudo chown \$(whoami) $LOG_DIR"

exit $FAIL
