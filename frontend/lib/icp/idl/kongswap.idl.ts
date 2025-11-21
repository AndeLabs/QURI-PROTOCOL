/**
 * KongSwap - Candid IDL Factory
 * Fast DEX on ICP with 8-second swaps
 * Backend canister: 2ipq2-uqaaa-aaaar-qailq-cai
 */

export const KONGSWAP_BACKEND_CANISTER_ID = '2ipq2-uqaaa-aaaar-qailq-cai';

// KongSwap backend IDL
export const kongSwapIdlFactory = ({ IDL }: any) => {
  // Swap amount transaction details
  const SwapAmountsTxReply = IDL.Record({
    pool_symbol: IDL.Text,
    pay_chain: IDL.Text,
    pay_symbol: IDL.Text,
    pay_address: IDL.Text,
    pay_amount: IDL.Nat,
    receive_chain: IDL.Text,
    receive_symbol: IDL.Text,
    receive_address: IDL.Text,
    receive_amount: IDL.Nat,
    price: IDL.Float64,
    lp_fee: IDL.Nat,
    gas_fee: IDL.Nat,
  });

  // Swap amounts reply (quote response)
  const SwapAmountsReply = IDL.Record({
    pay_chain: IDL.Text,
    pay_symbol: IDL.Text,
    pay_address: IDL.Text,
    pay_amount: IDL.Nat,
    receive_chain: IDL.Text,
    receive_symbol: IDL.Text,
    receive_address: IDL.Text,
    receive_amount: IDL.Nat,
    price: IDL.Float64,
    mid_price: IDL.Float64,
    slippage: IDL.Float64,
    txs: IDL.Vec(SwapAmountsTxReply),
  });

  const SwapAmountsResult = IDL.Variant({
    Ok: SwapAmountsReply,
    Err: IDL.Text,
  });

  // Transfer ID reply
  const TransferIdReply = IDL.Record({
    transfer_id: IDL.Nat64,
    transfer: IDL.Variant({
      IC: IDL.Record({
        is_send: IDL.Bool,
        block_index: IDL.Nat64,
      }),
    }),
  });

  // Swap transaction reply
  const SwapTxReply = IDL.Record({
    pool_symbol: IDL.Text,
    pay_chain: IDL.Text,
    pay_address: IDL.Text,
    pay_symbol: IDL.Text,
    pay_amount: IDL.Nat,
    receive_chain: IDL.Text,
    receive_address: IDL.Text,
    receive_symbol: IDL.Text,
    receive_amount: IDL.Nat,
    price: IDL.Float64,
    lp_fee: IDL.Nat,
    gas_fee: IDL.Nat,
    ts: IDL.Nat64,
  });

  // Swap reply
  const SwapReply = IDL.Record({
    tx_id: IDL.Nat64,
    request_id: IDL.Nat64,
    status: IDL.Text,
    pay_chain: IDL.Text,
    pay_address: IDL.Text,
    pay_symbol: IDL.Text,
    pay_amount: IDL.Nat,
    receive_chain: IDL.Text,
    receive_address: IDL.Text,
    receive_symbol: IDL.Text,
    receive_amount: IDL.Nat,
    mid_price: IDL.Float64,
    price: IDL.Float64,
    slippage: IDL.Float64,
    txs: IDL.Vec(SwapTxReply),
    transfer_ids: IDL.Vec(TransferIdReply),
    claim_ids: IDL.Vec(IDL.Nat64),
    ts: IDL.Nat64,
  });

  const SwapResult = IDL.Variant({
    Ok: SwapReply,
    Err: IDL.Text,
  });

  // Swap arguments
  const TxId = IDL.Variant({
    BlockIndex: IDL.Nat,
    TransactionHash: IDL.Text,
  });

  const SwapArgs = IDL.Record({
    pay_token: IDL.Text,
    pay_amount: IDL.Nat,
    pay_tx_id: IDL.Opt(TxId),
    receive_token: IDL.Text,
    receive_amount: IDL.Opt(IDL.Nat),
    receive_address: IDL.Opt(IDL.Text),
    max_slippage: IDL.Opt(IDL.Float64),
    referred_by: IDL.Opt(IDL.Text),
  });

  // Token info
  const TokenReply = IDL.Record({
    token_id: IDL.Nat32,
    name: IDL.Text,
    symbol: IDL.Text,
    chain: IDL.Text,
    address: IDL.Text,
    decimals: IDL.Nat8,
    fee: IDL.Nat,
    fee_fixed: IDL.Bool,
    icrc1: IDL.Bool,
    icrc2: IDL.Bool,
    icrc3: IDL.Bool,
    on_kong: IDL.Bool,
  });

  const TokensResult = IDL.Variant({
    Ok: IDL.Vec(TokenReply),
    Err: IDL.Text,
  });

  // Pool info
  const PoolReply = IDL.Record({
    pool_id: IDL.Nat32,
    symbol: IDL.Text,
    balance_0: IDL.Nat,
    balance_1: IDL.Nat,
    chain_0: IDL.Text,
    symbol_0: IDL.Text,
    address_0: IDL.Text,
    chain_1: IDL.Text,
    symbol_1: IDL.Text,
    address_1: IDL.Text,
    price: IDL.Float64,
    lp_fee_0: IDL.Nat,
    lp_fee_1: IDL.Nat,
    rolling_24h_volume: IDL.Nat,
    rolling_24h_lp_fee: IDL.Nat,
    rolling_24h_num_swaps: IDL.Nat,
    rolling_24h_apy: IDL.Float64,
    lp_token_symbol: IDL.Text,
    tvl: IDL.Nat,
    on_kong: IDL.Bool,
  });

  const PoolsResult = IDL.Variant({
    Ok: IDL.Vec(PoolReply),
    Err: IDL.Text,
  });

  return IDL.Service({
    // Get swap quote - pay_token, amount, receive_token
    swap_amounts: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Text],
      [SwapAmountsResult],
      ['query']
    ),

    // Execute swap
    swap: IDL.Func([SwapArgs], [SwapResult], []),

    // Get all tokens
    tokens: IDL.Func([IDL.Opt(IDL.Text)], [TokensResult], ['query']),

    // Get all pools
    pools: IDL.Func([IDL.Opt(IDL.Text)], [PoolsResult], ['query']),
  });
};

// Token symbol mapping for KongSwap (uses IC.SYMBOL format)
export const KONGSWAP_TOKEN_SYMBOLS: Record<string, string> = {
  ICP: 'IC.ICP',
  ckBTC: 'IC.ckBTC',
  ckETH: 'IC.ckETH',
  ckUSDC: 'IC.ckUSDC',
  ckUSDT: 'IC.ckUSDT',
};
