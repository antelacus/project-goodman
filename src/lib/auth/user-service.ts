/**
 * User Service
 *
 * Provides user management functions for the V3.10 user management system.
 * Handles admin account initialization and user authentication against the database.
 */

import { createServerSupabaseClient } from '@/lib/database/supabase';
import { hashPassword, verifyPassword } from '@/lib/security/password';

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'admin' | 'user' | 'guest';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    displayName: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
}

export interface UserCredentials {
    username: string;
    password: string;
}

export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
    needsRehash?: boolean;
}

// =============================================================================
// User Queries
// =============================================================================

interface UserRow {
    id: string;
    username: string;
    role: string;
    display_name: string | null;
    email: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
    password_hash?: string;
}

/**
 * Find a user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('users')
        .select('id, username, role, display_name, email, is_active, created_at, updated_at, last_login_at')
        .eq('username', username)
        .eq('is_active', true)
        .single();

    if (error || !data) {
        return null;
    }

    const row = data as UserRow;
    return {
        id: row.id,
        username: row.username,
        role: row.role as UserRole,
        displayName: row.display_name,
        email: row.email,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
    };
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('users')
        .select('id, username, role, display_name, email, is_active, created_at, updated_at, last_login_at')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    const row = data as UserRow;
    return {
        id: row.id,
        username: row.username,
        role: row.role as UserRole,
        displayName: row.display_name,
        email: row.email,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
    };
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Authenticate a user with username and password
 */
export async function authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
    const supabase = createServerSupabaseClient();

    // Get user with password hash
    const { data, error } = await supabase
        .from('users')
        .select('id, username, password_hash, role, display_name, email, is_active, created_at, updated_at, last_login_at')
        .eq('username', credentials.username)
        .single();

    if (error || !data) {
        return { success: false, error: '用户名或密码错误' };
    }

    const row = data as UserRow & { password_hash: string };

    if (!row.is_active) {
        return { success: false, error: '账户已被禁用' };
    }

    // Verify password
    const verification = await verifyPassword(credentials.password, row.password_hash);

    if (!verification.valid) {
        return { success: false, error: '用户名或密码错误' };
    }

    // Update last login time
    await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', row.id);

    // If password needs rehash, update it
    if (verification.needsRehash) {
        const newHash = await hashPassword(credentials.password);
        await supabase
            .from('users')
            .update({ password_hash: newHash, updated_at: new Date().toISOString() })
            .eq('id', row.id);
    }

    const user: User = {
        id: row.id,
        username: row.username,
        role: row.role as UserRole,
        displayName: row.display_name,
        email: row.email,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: new Date().toISOString(),
    };

    return {
        success: true,
        user,
        needsRehash: verification.needsRehash,
    };
}

// =============================================================================
// Admin Initialization
// =============================================================================

/**
 * Ensure the initial admin account exists in the database.
 * Called during application initialization.
 *
 * If ADMIN_USERNAME and ADMIN_PASSWORD are set in environment,
 * creates the admin account if it doesn't exist.
 *
 * ADMIN_PASSWORD can be either:
 * - Plaintext password (will be hashed with bcrypt)
 * - Already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
 */
export async function ensureAdminAccount(): Promise<void> {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.warn('[UserService] ADMIN_PASSWORD not set, skipping admin initialization');
        return;
    }

    const supabase = createServerSupabaseClient();

    // Check if admin exists
    const { data: existingAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('username', adminUsername)
        .single();

    if (existingAdmin) {
        console.log('[UserService] Admin account already exists');
        return;
    }

    // Create admin account
    // If ADMIN_PASSWORD is already a bcrypt hash, use it directly
    const isBcryptHash = adminPassword.startsWith('$2');
    const passwordHash = isBcryptHash ? adminPassword : await hashPassword(adminPassword);

    const { error } = await supabase.from('users').insert({
        username: adminUsername,
        password_hash: passwordHash,
        role: 'admin',
        display_name: '系统管理员',
        is_active: true,
    });

    if (error) {
        console.error('[UserService] Failed to create admin account:', error.message);
        throw new Error('Failed to initialize admin account');
    }

    console.log('[UserService] Admin account created successfully');
}

/**
 * Check if any admin account exists
 */
export async function hasAdminAccount(): Promise<boolean> {
    const supabase = createServerSupabaseClient();

    const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true);

    return (count ?? 0) > 0;
}
