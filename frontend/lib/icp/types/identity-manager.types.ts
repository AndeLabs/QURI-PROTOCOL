/**
 * Identity Manager Canister - Complete TypeScript Types
 * Handles user sessions, permissions, and statistics
 */

import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

// ============================================================================
// ENUMS & VARIANTS
// ============================================================================

export type PermissionType =
  | { CreateRune: null }
  | { Transfer: null };

export type Result<T = null> =
  | { Ok: T }
  | { Err: string };

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionPermissions {
  can_create_rune: boolean;
  can_transfer: boolean;
  max_amount: bigint;
}

export interface UserSession {
  principal: Principal;
  session_key: Uint8Array;
  expires_at: bigint;
  permissions: SessionPermissions;
}

export interface UserStats {
  joined_at: bigint;
  runes_created: bigint;
  total_volume: bigint;
}

// ============================================================================
// ACTOR INTERFACE
// ============================================================================

export interface IdentityManagerActor {
  // Session management
  create_session: ActorMethod<[SessionPermissions, bigint], Result<UserSession>>;
  get_session: ActorMethod<[], [] | [UserSession]>;
  revoke_session: ActorMethod<[], Result>;
  validate_session: ActorMethod<[Principal], boolean>;

  // Permissions
  check_permission: ActorMethod<[PermissionType], boolean>;

  // User statistics
  get_user_stats: ActorMethod<[Principal], UserStats>;
}

// ============================================================================
// UTILITY TYPES FOR FRONTEND
// ============================================================================

/** Session state for UI */
export interface SessionState {
  isActive: boolean;
  principal?: string;
  expiresAt?: Date;
  permissions: {
    canCreateRune: boolean;
    canTransfer: boolean;
    maxAmount: number;
  };
  timeRemaining?: number; // seconds
}

/** Session creation params from form */
export interface CreateSessionParams {
  permissions: {
    canCreateRune: boolean;
    canTransfer: boolean;
    maxAmount: number;
  };
  durationHours: number;
}

/** User profile data for display */
export interface UserProfile {
  principal: string;
  joinedAt: Date;
  runesCreated: number;
  totalVolume: number;
  totalVolumeFormatted: string;
  memberSince: string; // e.g., "3 months ago"
}

/** Permission display data */
export interface PermissionDisplay {
  type: 'createRune' | 'transfer';
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}
