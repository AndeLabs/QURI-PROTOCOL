/**
 * QURI Backend Canister - Candid IDL Factory
 * Main backend for Rune creation with ckBTC payments
 */

export const idlFactory = ({ IDL }: any) => {
  // Rune etching data
  const RuneEtching = IDL.Record({
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    premine: IDL.Nat64,
    cap: IDL.Opt(IDL.Nat64),
    amount_per_mint: IDL.Opt(IDL.Nat64),
    start_height: IDL.Opt(IDL.Nat64),
    end_height: IDL.Opt(IDL.Nat64),
    start_offset: IDL.Opt(IDL.Nat64),
    end_offset: IDL.Opt(IDL.Nat64),
    turbo: IDL.Bool,
  });

  // Attribute value
  const AttributeValue = IDL.Variant({
    String: IDL.Text,
    Number: IDL.Nat64,
  });

  // Rune attribute
  const RuneAttribute = IDL.Record({
    trait_type: IDL.Text,
    value: AttributeValue,
  });

  // Rune metadata (IPFS)
  const RuneMetadata = IDL.Record({
    name: IDL.Text,
    description: IDL.Opt(IDL.Text),
    image: IDL.Text, // IPFS CID or URL
    external_url: IDL.Opt(IDL.Text),
    attributes: IDL.Opt(IDL.Vec(RuneAttribute)),
  });

  // Payment method
  const PaymentMethod = IDL.Variant({
    Bitcoin: IDL.Null,
    CkBTC: IDL.Null,
    ICP: IDL.Null,
  });

  // Created Rune record
  const CreatedRune = IDL.Record({
    id: IDL.Text,
    creator: IDL.Principal,
    etching_data: RuneEtching,
    metadata: IDL.Opt(RuneMetadata),
    etching_txid: IDL.Opt(IDL.Text),
    created_at: IDL.Nat64,
    payment_method: PaymentMethod,
    payment_amount: IDL.Nat64,
    payment_block_index: IDL.Opt(IDL.Nat64),
  });

  // ckBTC Payment record
  const PaymentType = IDL.Variant({
    RuneMint: IDL.Null,
    StakingReward: IDL.Null,
    Transfer: IDL.Null,
  });

  const CkBTCPayment = IDL.Record({
    rune_id: IDL.Text,
    payer: IDL.Principal,
    amount: IDL.Nat64,
    block_index: IDL.Nat64,
    timestamp: IDL.Nat64,
    tx_type: PaymentType,
  });

  // Staking types
  const StakePosition = IDL.Record({
    rune_id: IDL.Text,
    staker: IDL.Principal,
    amount: IDL.Nat64,
    staked_at: IDL.Nat64,
    last_reward_claim: IDL.Nat64,
    total_rewards_claimed: IDL.Nat64,
  });

  const StakingPool = IDL.Record({
    rune_id: IDL.Text,
    total_staked: IDL.Nat64,
    reward_rate: IDL.Nat64,
    total_rewards_distributed: IDL.Nat64,
    active_stakers: IDL.Nat64,
  });

  const StakingStats = IDL.Record({
    total_value_locked: IDL.Nat64,
    total_rewards_distributed: IDL.Nat64,
    total_stakers: IDL.Nat64,
    total_pools: IDL.Nat64,
  });

  const RewardCalculation = IDL.Record({
    pending_rewards: IDL.Nat64,
    time_staked: IDL.Nat64,
    current_apy: IDL.Float64,
  });

  // Octopus Rune Entry
  const OctopusRuneEntry = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    symbol: IDL.Opt(IDL.Text),
    divisibility: IDL.Nat8,
    total_supply: IDL.Nat64,
    premine: IDL.Nat64,
    block_height: IDL.Nat64,
    txid: IDL.Text,
  });

  // Canister Config
  const CanisterConfig = IDL.Record({
    network: IDL.Text,
    ckbtc_enabled: IDL.Bool,
    min_mint_fee_sats: IDL.Nat64,
    admin: IDL.Principal,
  });

  // Result types
  const Result = IDL.Variant({
    Ok: IDL.Text,
    Err: IDL.Text,
  });

  const ResultStake = IDL.Variant({
    Ok: StakePosition,
    Err: IDL.Text,
  });

  const ResultUnstake = IDL.Variant({
    Ok: IDL.Tuple(IDL.Nat64, IDL.Nat64),
    Err: IDL.Text,
  });

  const ResultRewards = IDL.Variant({
    Ok: IDL.Nat64,
    Err: IDL.Text,
  });

  const ResultRewardCalc = IDL.Variant({
    Ok: RewardCalculation,
    Err: IDL.Text,
  });

  const ResultOctopus = IDL.Variant({
    Ok: OctopusRuneEntry,
    Err: IDL.Text,
  });

  const ResultConfig = IDL.Variant({
    Ok: IDL.Null,
    Err: IDL.Text,
  });

  return IDL.Service({
    // Query methods
    get_rune: IDL.Func([IDL.Text], [IDL.Opt(CreatedRune)], ['query']),
    get_user_runes: IDL.Func([IDL.Principal], [IDL.Vec(CreatedRune)], ['query']),
    get_all_runes: IDL.Func(
      [IDL.Nat64, IDL.Nat64],
      [IDL.Vec(CreatedRune)],
      ['query']
    ),
    get_runes_count: IDL.Func([], [IDL.Nat64], ['query']),
    get_favorites: IDL.Func([IDL.Principal], [IDL.Vec(IDL.Text)], ['query']),
    get_rune_payments: IDL.Func([IDL.Text], [IDL.Vec(CkBTCPayment)], ['query']),
    get_user_payments: IDL.Func(
      [IDL.Principal],
      [IDL.Vec(CkBTCPayment)],
      ['query']
    ),
    get_config: IDL.Func([], [CanisterConfig], ['query']),

    // Staking queries
    get_stake: IDL.Func([IDL.Text], [IDL.Opt(StakePosition)], ['query']),
    get_user_all_stakes: IDL.Func([], [IDL.Vec(StakePosition)], ['query']),
    get_pool: IDL.Func([IDL.Text], [IDL.Opt(StakingPool)], ['query']),
    get_all_staking_pools: IDL.Func([], [IDL.Vec(StakingPool)], ['query']),
    get_global_staking_stats: IDL.Func([], [StakingStats], ['query']),
    calculate_pending_rewards: IDL.Func([IDL.Text], [ResultRewardCalc], ['query']),

    // Update methods - Rune creation
    mint_rune_with_ckbtc: IDL.Func(
      [RuneEtching, IDL.Opt(RuneMetadata), IDL.Nat64],
      [Result],
      []
    ),
    mint_rune_with_bitcoin: IDL.Func(
      [RuneEtching, IDL.Opt(RuneMetadata), IDL.Text],
      [Result],
      []
    ),

    // Update methods - Favorites
    add_favorite: IDL.Func([IDL.Text], [ResultConfig], []),
    remove_favorite: IDL.Func([IDL.Text], [ResultConfig], []),

    // Update methods - Verification
    verify_rune_on_chain: IDL.Func([IDL.Text], [ResultOctopus], []),

    // Update methods - Staking
    stake: IDL.Func([IDL.Text, IDL.Nat64], [ResultStake], []),
    unstake: IDL.Func([IDL.Text, IDL.Nat64], [ResultUnstake], []),
    claim_staking_rewards: IDL.Func([IDL.Text], [ResultRewards], []),

    // Update methods - Admin
    update_config: IDL.Func([CanisterConfig], [ResultConfig], []),
  });
};
