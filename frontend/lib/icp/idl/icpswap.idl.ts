/**
 * ICPSwap V3 - Candid IDL Factories
 * Real DEX integration for token swaps on ICP
 * Based on official ICPSwap documentation
 */

// SwapPool canister IDL
export const swapPoolIdlFactory = ({ IDL }: any) => {
  const DepositArgs = IDL.Record({
    fee: IDL.Nat,
    token: IDL.Text,
    amount: IDL.Nat,
  });

  const SwapArgs = IDL.Record({
    amountIn: IDL.Text,
    zeroForOne: IDL.Bool,
    amountOutMinimum: IDL.Text,
  });

  const WithdrawArgs = IDL.Record({
    fee: IDL.Nat,
    token: IDL.Text,
    amount: IDL.Nat,
  });

  const Error = IDL.Variant({
    CommonError: IDL.Null,
    InsufficientFunds: IDL.Null,
    InternalError: IDL.Text,
    UnsupportedToken: IDL.Text,
  });

  const Result = IDL.Variant({
    ok: IDL.Nat,
    err: Error,
  });

  const ResultBalance = IDL.Variant({
    ok: IDL.Record({ balance0: IDL.Nat, balance1: IDL.Nat }),
    err: Error,
  });

  const Token = IDL.Record({
    address: IDL.Text,
    standard: IDL.Text,
  });

  const PoolMetadata = IDL.Record({
    fee: IDL.Nat,
    key: IDL.Text,
    sqrtPriceX96: IDL.Nat,
    tick: IDL.Int,
    liquidity: IDL.Nat,
    token0: Token,
    token1: Token,
    maxLiquidityPerTick: IDL.Nat,
    nextPositionId: IDL.Nat,
  });

  const ResultMetadata = IDL.Variant({
    ok: PoolMetadata,
    err: Error,
  });

  return IDL.Service({
    // Quote expected output
    quote: IDL.Func([SwapArgs], [Result], ['query']),

    // Deposit tokens (ICRC1 flow)
    deposit: IDL.Func([DepositArgs], [Result], []),

    // Deposit from caller (requires approval - ICRC2/DIP20 flow)
    depositFrom: IDL.Func([DepositArgs], [Result], []),

    // Execute swap
    swap: IDL.Func([SwapArgs], [Result], []),

    // Withdraw tokens
    withdraw: IDL.Func([WithdrawArgs], [Result], []),

    // Get user's unused balance in pool
    getUserUnusedBalance: IDL.Func([IDL.Principal], [ResultBalance], ['query']),

    // Get pool metadata
    metadata: IDL.Func([], [ResultMetadata], ['query']),
  });
};

// SwapFactory canister IDL
export const swapFactoryIdlFactory = ({ IDL }: any) => {
  const Token = IDL.Record({
    address: IDL.Text,
    standard: IDL.Text,
  });

  const PoolData = IDL.Record({
    fee: IDL.Nat,
    key: IDL.Text,
    tickSpacing: IDL.Int,
    token0: Token,
    token1: Token,
    canisterId: IDL.Principal,
  });

  const Error = IDL.Variant({
    CommonError: IDL.Null,
    InternalError: IDL.Text,
    UnsupportedToken: IDL.Text,
    InsufficientFunds: IDL.Null,
  });

  const ResultPool = IDL.Variant({
    ok: PoolData,
    err: Error,
  });

  return IDL.Service({
    // Get pool by tokens
    getPool: IDL.Func([IDL.Text, IDL.Text, IDL.Nat], [ResultPool], ['query']),

    // Get all pools
    getPools: IDL.Func([], [IDL.Vec(PoolData)], ['query']),
  });
};

// ICRC-2 Ledger IDL for approve/transfer
export const icrc2LedgerIdlFactory = ({ IDL }: any) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const ApproveArgs = IDL.Record({
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
    expected_allowance: IDL.Opt(IDL.Nat),
    expires_at: IDL.Opt(IDL.Nat64),
    spender: Account,
  });

  const ApproveError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  });

  const ApproveResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: ApproveError,
  });

  const TransferArgs = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  });

  const TransferError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  });

  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  });

  const AllowanceArgs = IDL.Record({
    account: Account,
    spender: Account,
  });

  const Allowance = IDL.Record({
    allowance: IDL.Nat,
    expires_at: IDL.Opt(IDL.Nat64),
  });

  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_transfer: IDL.Func([TransferArgs], [TransferResult], []),
    icrc2_approve: IDL.Func([ApproveArgs], [ApproveResult], []),
    icrc2_allowance: IDL.Func([AllowanceArgs], [Allowance], ['query']),
  });
};

// Token list canister IDL
export const tokenListIdlFactory = ({ IDL }: any) => {
  const TokenInfo = IDL.Record({
    fee: IDL.Nat,
    decimals: IDL.Nat,
    name: IDL.Text,
    rank: IDL.Nat32,
    totalSupply: IDL.Nat,
    symbol: IDL.Text,
    canisterId: IDL.Text,
    standard: IDL.Text,
  });

  return IDL.Service({
    getList: IDL.Func([], [IDL.Vec(TokenInfo)], ['query']),
    get: IDL.Func([IDL.Text], [IDL.Opt(TokenInfo)], ['query']),
  });
};
