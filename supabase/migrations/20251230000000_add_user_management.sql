-- Migration: Add user management system tables
-- Version: V3.10
-- Date: 2025-12-30
-- Purpose: Support admin/guest roles with document ownership

-- ============================================================================
-- Table 1: users
-- Stores user accounts (currently only admin, future: user role)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'user', 'guest')),
    display_name VARCHAR(100),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'User accounts for authentication (admin, user roles)';
COMMENT ON COLUMN users.role IS 'User role: admin (full access), user (registered), guest (stored in session only)';

-- ============================================================================
-- Table 2: Modify documents table
-- Add ownership fields for document isolation
-- ============================================================================

-- Add ownership columns to documents
ALTER TABLE documents
ADD COLUMN owner_id UUID,
ADD COLUMN owner_type VARCHAR(20) DEFAULT 'system'
    CHECK (owner_type IN ('system', 'admin', 'user', 'guest')),
ADD COLUMN expires_at TIMESTAMPTZ;

-- Indexes for document ownership
CREATE INDEX idx_documents_owner ON documents(owner_id, owner_type);
CREATE INDEX idx_documents_expires ON documents(expires_at)
    WHERE expires_at IS NOT NULL;

-- Update existing documents to be system-owned (knowledge base)
UPDATE documents SET owner_type = 'system' WHERE owner_type IS NULL;

COMMENT ON COLUMN documents.owner_id IS 'Owner UUID: users.id for admin/user, session_id for guest';
COMMENT ON COLUMN documents.owner_type IS 'Owner type: system (public), admin, user, guest (temp)';
COMMENT ON COLUMN documents.expires_at IS 'Auto-cleanup time for guest documents';

-- ============================================================================
-- Table 3: guest_activity (optional - for admin dashboard stats)
-- Tracks guest session statistics for admin monitoring
-- ============================================================================

CREATE TABLE guest_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    message_count INTEGER DEFAULT 0,
    upload_count INTEGER DEFAULT 0,
    extract_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expired_at TIMESTAMPTZ
);

-- Indexes for guest_activity
CREATE INDEX idx_guest_activity_session ON guest_activity(session_id);
CREATE INDEX idx_guest_activity_created ON guest_activity(created_at);

COMMENT ON TABLE guest_activity IS 'Persistent storage for guest session statistics (admin dashboard)';
COMMENT ON COLUMN guest_activity.expired_at IS 'Timestamp when session expired (for historical tracking)';
