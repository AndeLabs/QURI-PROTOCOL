/**
 * Identity Manager Canister - Candid IDL Factory
 * Session management and permissions inspired by Odin.fun
 */

export const idlFactory = ({ IDL }: any) => {
  const PermissionType = IDL.Variant({
    CreateRune: IDL.Null,
    Transfer: IDL.Null,
  });

  const SessionPermissions = IDL.Record({
    can_transfer: IDL.Bool,
    can_create_rune: IDL.Bool,
    max_amount: IDL.Nat64,
  });

  const UserSession = IDL.Record({
    permissions: SessionPermissions,
    principal: IDL.Principal,
    session_key: IDL.Vec(IDL.Nat8),
    expires_at: IDL.Nat64,
  });

  const UserStats = IDL.Record({
    runes_created: IDL.Nat64,
    joined_at: IDL.Nat64,
    total_volume: IDL.Nat64,
  });

  const SessionResult = IDL.Variant({
    Ok: UserSession,
    Err: IDL.Text,
  });

  const Result = IDL.Variant({
    Ok: IDL.Null,
    Err: IDL.Text,
  });

  return IDL.Service({
    // Session management
    create_session: IDL.Func(
      [SessionPermissions, IDL.Nat64],
      [SessionResult],
      []
    ),
    get_session: IDL.Func([], [IDL.Opt(UserSession)], ['query']),
    validate_session: IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    revoke_session: IDL.Func([], [Result], []),

    // Permissions
    check_permission: IDL.Func([PermissionType], [IDL.Bool], ['query']),

    // User statistics
    get_user_stats: IDL.Func([IDL.Principal], [UserStats], ['query']),
  });
};
