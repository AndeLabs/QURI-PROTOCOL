/**
 * ICP Ledger Canister - Candid IDL Factory
 * ICRC-1 compatible interface for ICP operations
 */

export const idlFactory = ({ IDL }: any) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const TransferArgs = IDL.Record({
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });

  const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({
      error_code: IDL.Nat,
      message: IDL.Text,
    }),
  });

  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  });

  const Transaction = IDL.Record({
    burn: IDL.Opt(IDL.Record({
      from: Account,
      amount: IDL.Nat,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
    })),
    kind: IDL.Text,
    mint: IDL.Opt(IDL.Record({
      to: Account,
      amount: IDL.Nat,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
    })),
    timestamp: IDL.Nat64,
    transfer: IDL.Opt(IDL.Record({
      to: Account,
      from: Account,
      amount: IDL.Nat,
      fee: IDL.Opt(IDL.Nat),
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
    })),
  });

  const GetTransactionsRequest = IDL.Record({
    start: IDL.Nat,
    length: IDL.Nat,
  });

  const GetTransactionsResponse = IDL.Record({
    first_index: IDL.Nat,
    log_length: IDL.Nat,
    transactions: IDL.Vec(IDL.Record({
      id: IDL.Nat,
      transaction: Transaction,
    })),
    archived_transactions: IDL.Vec(IDL.Record({
      start: IDL.Nat,
      length: IDL.Nat,
    })),
  });

  const TransactionsResult = IDL.Variant({
    Ok: GetTransactionsResponse,
    Err: IDL.Text,
  });

  return IDL.Service({
    // ICRC-1 balance query
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),

    // ICRC-1 metadata
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
    icrc1_name: IDL.Func([], [IDL.Text], ['query']),
    icrc1_total_supply: IDL.Func([], [IDL.Nat], ['query']),

    // ICRC-1 transfer
    icrc1_transfer: IDL.Func([TransferArgs], [TransferResult], []),

    // Transaction history
    get_transactions: IDL.Func([GetTransactionsRequest], [TransactionsResult], ['query']),
  });
};
