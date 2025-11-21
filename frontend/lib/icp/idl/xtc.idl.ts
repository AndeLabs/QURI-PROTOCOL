/**
 * XTC (Cycles Token) IDL
 * Dank's wrapped cycles token
 * Canister ID: aanaa-xaaaa-aaaah-aaeiq-cai
 *
 * XTC allows wrapping cycles into a fungible token that can be traded
 */

export const xtcIdlFactory = ({ IDL }: any) => {
  // DIP20 standard types
  const TxError = IDL.Variant({
    InsufficientAllowance: IDL.Null,
    InsufficientBalance: IDL.Null,
    ErrorOperationStyle: IDL.Null,
    Unauthorized: IDL.Null,
    LedgerTrap: IDL.Null,
    ErrorTo: IDL.Null,
    Other: IDL.Text,
    BlockUsed: IDL.Null,
    AmountTooSmall: IDL.Null,
  });

  const TxReceipt = IDL.Variant({
    Ok: IDL.Nat,
    Err: TxError,
  });

  const Metadata = IDL.Record({
    fee: IDL.Nat,
    decimals: IDL.Nat8,
    owner: IDL.Principal,
    logo: IDL.Text,
    name: IDL.Text,
    totalSupply: IDL.Nat,
    symbol: IDL.Text,
  });

  // XTC burn/mint types
  const BurnError = IDL.Variant({
    InsufficientBalance: IDL.Null,
    InvalidTokenContract: IDL.Null,
    NotSufficientLiquidity: IDL.Null,
  });

  const BurnResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: BurnError,
  });

  const MintError = IDL.Variant({
    NotSufficientLiquidity: IDL.Null,
  });

  const MintResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: MintError,
  });

  return IDL.Service({
    // DIP20 standard methods
    name: IDL.Func([], [IDL.Text], ['query']),
    symbol: IDL.Func([], [IDL.Text], ['query']),
    decimals: IDL.Func([], [IDL.Nat8], ['query']),
    totalSupply: IDL.Func([], [IDL.Nat], ['query']),
    balanceOf: IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    allowance: IDL.Func([IDL.Principal, IDL.Principal], [IDL.Nat], ['query']),
    getMetadata: IDL.Func([], [Metadata], ['query']),

    // DIP20 transfer methods
    transfer: IDL.Func([IDL.Principal, IDL.Nat], [TxReceipt], []),
    transferFrom: IDL.Func([IDL.Principal, IDL.Principal, IDL.Nat], [TxReceipt], []),
    approve: IDL.Func([IDL.Principal, IDL.Nat], [TxReceipt], []),

    // XTC-specific methods for wrapping/unwrapping cycles
    // Mint XTC by sending cycles to the canister
    mint: IDL.Func([IDL.Opt(IDL.Principal)], [MintResult], []),

    // Burn XTC to get cycles back to a canister
    burn: IDL.Func(
      [
        IDL.Record({
          canister_id: IDL.Principal,
          amount: IDL.Nat64,
        }),
      ],
      [BurnResult],
      []
    ),

    // Get the cycles balance in the canister
    wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
  });
};

export const XTC_CANISTER_ID = 'aanaa-xaaaa-aaaah-aaeiq-cai';

// XTC has 12 decimals (same as cycles - 1 XTC = 1 Trillion cycles)
export const XTC_DECIMALS = 12;
