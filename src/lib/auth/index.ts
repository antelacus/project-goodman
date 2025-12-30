/**
 * Auth Module
 *
 * User authentication and management for V3.10 user management system.
 */

export {
    type User,
    type UserRole,
    type UserCredentials,
    type AuthResult,
    findUserByUsername,
    findUserById,
    authenticateUser,
    ensureAdminAccount,
    hasAdminAccount,
} from './user-service';
