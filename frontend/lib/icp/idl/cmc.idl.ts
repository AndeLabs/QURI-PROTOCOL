/**
 * Cycles Minting Canister (CMC) IDL
 * For converting Cycles to ICP
 * Canister ID: rkp4c-7iaaa-aaaaa-aaaca-cai
 */

export const cmcIdlFactory = ({ IDL }: any) => {
  const IcpXdrConversionRate = IDL.Record({
    xdr_permyriad_per_icp: IDL.Nat64,
    timestamp_seconds: IDL.Nat64,
  });

  const IcpXdrConversionRateResponse = IDL.Record({
    certificate: IDL.Vec(IDL.Nat8),
    data: IcpXdrConversionRate,
    hash_tree: IDL.Vec(IDL.Nat8),
  });

  const SubnetTypesToSubnetsResponse = IDL.Record({
    data: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Principal))),
  });

  const Cycles = IDL.Record({
    e8s: IDL.Nat64,
  });

  const NotifyError = IDL.Variant({
    Refunded: IDL.Record({
      block_index: IDL.Opt(IDL.Nat64),
      reason: IDL.Text,
    }),
    InvalidTransaction: IDL.Text,
    Other: IDL.Record({
      error_message: IDL.Text,
      error_code: IDL.Nat64,
    }),
    Processing: IDL.Null,
    TransactionTooOld: IDL.Nat64,
  });

  const NotifyCreateCanisterResult = IDL.Variant({
    Ok: IDL.Principal,
    Err: NotifyError,
  });

  const NotifyTopUpResult = IDL.Variant({
    Ok: Cycles,
    Err: NotifyError,
  });

  const NotifyMintCyclesResult = IDL.Variant({
    Ok: IDL.Record({
      balance: IDL.Nat,
      block_index: IDL.Nat,
      minted: IDL.Nat,
    }),
    Err: NotifyError,
  });

  const BlockIndex = IDL.Nat64;

  const NotifyCreateCanisterArg = IDL.Record({
    controller: IDL.Principal,
    block_index: BlockIndex,
    subnet_type: IDL.Opt(IDL.Text),
    subnet_selection: IDL.Opt(
      IDL.Variant({
        Filter: IDL.Record({
          subnet_type: IDL.Opt(IDL.Text),
        }),
        Subnet: IDL.Record({
          subnet: IDL.Principal,
        }),
      })
    ),
    settings: IDL.Opt(
      IDL.Record({
        freezing_threshold: IDL.Opt(IDL.Nat),
        controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
        memory_allocation: IDL.Opt(IDL.Nat),
        compute_allocation: IDL.Opt(IDL.Nat),
      })
    ),
  });

  const NotifyTopUpArg = IDL.Record({
    block_index: BlockIndex,
    canister_id: IDL.Principal,
  });

  const NotifyMintCyclesArg = IDL.Record({
    block_index: BlockIndex,
    to_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    deposit_memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  return IDL.Service({
    // Get current ICP/XDR conversion rate
    get_icp_xdr_conversion_rate: IDL.Func([], [IcpXdrConversionRateResponse], ['query']),

    // Get subnet types to subnets mapping
    get_subnet_types_to_subnets: IDL.Func([], [SubnetTypesToSubnetsResponse], ['query']),

    // Notify CMC about ICP transfer to create canister
    notify_create_canister: IDL.Func([NotifyCreateCanisterArg], [NotifyCreateCanisterResult], []),

    // Notify CMC about ICP transfer to top up canister
    notify_top_up: IDL.Func([NotifyTopUpArg], [NotifyTopUpResult], []),

    // Notify CMC to mint cycles from ICP deposit
    notify_mint_cycles: IDL.Func([NotifyMintCyclesArg], [NotifyMintCyclesResult], []),
  });
};

// Cycles Ledger IDL for transferring cycles
export const cyclesLedgerIdlFactory = ({ IDL }: any) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
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

  const WithdrawArgs = IDL.Record({
    to: IDL.Principal,
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  });

  const WithdrawError = IDL.Variant({
    FailedToWithdraw: IDL.Record({
      fee_block: IDL.Opt(IDL.Nat),
      rejection_code: IDL.Int32,
      rejection_reason: IDL.Text,
    }),
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    InvalidReceiver: IDL.Record({ receiver: IDL.Principal }),
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  });

  const WithdrawResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: WithdrawError,
  });

  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_transfer: IDL.Func([TransferArgs], [TransferResult], []),

    // Withdraw cycles to a canister (converts to computation cycles)
    withdraw: IDL.Func([WithdrawArgs], [WithdrawResult], []),
  });
};

export const CMC_CANISTER_ID = 'rkp4c-7iaaa-aaaaa-aaaca-cai';
export const CYCLES_LEDGER_CANISTER_ID = 'um5iw-rqaaa-aaaaq-qaaba-cai';
