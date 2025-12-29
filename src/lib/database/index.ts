/**
 * Database Module
 *
 * Database clients and types:
 * - supabase: Supabase client factory (server & browser)
 * - redis: Redis client (import directly from @/lib/database/redis for server-only code)
 * - types: Auto-generated Supabase database types
 */

// Supabase
export {
  createServerSupabaseClient,
  createBrowserSupabaseClient,
} from "./supabase";

// Note: Redis is NOT re-exported here to avoid bundling issues.
// Import directly: import { redis } from "@/lib/database/redis";

// Types
export type { Database, Json } from "./types";
