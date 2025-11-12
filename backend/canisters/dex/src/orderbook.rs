use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, VecDeque};
use ic_cdk::api::time;

/// Order types supported by the orderbook
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum OrderType {
    /// Limit order: execute at specified price or better
    Limit,
    /// Market order: execute immediately at best available price
    Market,
    /// Stop-limit: becomes limit order when stop price is reached
    StopLimit { stop_price: Nat },
}

/// Time-in-force options
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum TimeInForce {
    /// Good Till Cancelled: order remains until filled or cancelled
    GTC,
    /// Immediate Or Cancel: execute immediately, cancel unfilled portion
    IOC,
    /// Fill Or Kill: execute entire order immediately or cancel
    FOK,
    /// Good Till Time: order remains until specified timestamp
    GTT { expiry: u64 },
}

/// Order side
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Hash)]
pub enum OrderSide {
    Buy,
    Sell,
}

/// Order status
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum OrderStatus {
    /// Order is active and can be matched
    Open,
    /// Order is partially filled
    PartiallyFilled,
    /// Order is completely filled
    Filled,
    /// Order was cancelled by user
    Cancelled,
    /// Order expired (GTT)
    Expired,
    /// Order was rejected
    Rejected { reason: String },
}

/// Individual order in the orderbook
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Order {
    pub id: String,
    pub user: Principal,
    pub pool_id: String,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub price: Nat,
    pub amount: Nat,
    pub filled_amount: Nat,
    pub status: OrderStatus,
    pub time_in_force: TimeInForce,
    pub created_at: u64,
    pub updated_at: u64,
}

impl Order {
    pub fn new(
        id: String,
        user: Principal,
        pool_id: String,
        side: OrderSide,
        order_type: OrderType,
        price: Nat,
        amount: Nat,
        time_in_force: TimeInForce,
    ) -> Self {
        let now = time();
        Self {
            id,
            user,
            pool_id,
            side,
            order_type,
            price,
            amount,
            filled_amount: Nat::from(0u64),
            status: OrderStatus::Open,
            time_in_force,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn remaining_amount(&self) -> Nat {
        &self.amount - &self.filled_amount
    }

    pub fn is_fillable(&self) -> bool {
        matches!(self.status, OrderStatus::Open | OrderStatus::PartiallyFilled)
    }

    pub fn fill(&mut self, amount: Nat) {
        self.filled_amount = &self.filled_amount + &amount;
        self.updated_at = time();

        if self.filled_amount >= self.amount {
            self.status = OrderStatus::Filled;
        } else {
            self.status = OrderStatus::PartiallyFilled;
        }
    }

    pub fn cancel(&mut self) {
        if self.is_fillable() {
            self.status = OrderStatus::Cancelled;
            self.updated_at = time();
        }
    }

    pub fn expire(&mut self) {
        if self.is_fillable() {
            self.status = OrderStatus::Expired;
            self.updated_at = time();
        }
    }
}

/// Price level in the orderbook
#[derive(Clone, Debug)]
pub struct PriceLevel {
    pub price: Nat,
    pub total_amount: Nat,
    pub orders: VecDeque<Order>,
}

impl PriceLevel {
    pub fn new(price: Nat) -> Self {
        Self {
            price,
            total_amount: Nat::from(0u64),
            orders: VecDeque::new(),
        }
    }

    pub fn add_order(&mut self, order: Order) {
        self.total_amount = &self.total_amount + &order.remaining_amount();
        self.orders.push_back(order);
    }

    pub fn remove_order(&mut self, order_id: &str) -> Option<Order> {
        if let Some(idx) = self.orders.iter().position(|o| o.id == order_id) {
            let order = self.orders.remove(idx)?;
            self.total_amount = self.total_amount.clone().saturating_sub(order.remaining_amount());
            Some(order)
        } else {
            None
        }
    }

    pub fn is_empty(&self) -> bool {
        self.orders.is_empty()
    }
}

/// Trade execution result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Trade {
    pub id: String,
    pub pool_id: String,
    pub maker_order_id: String,
    pub taker_order_id: String,
    pub maker: Principal,
    pub taker: Principal,
    pub price: Nat,
    pub amount: Nat,
    pub side: OrderSide,
    pub timestamp: u64,
}

/// Order placement result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PlaceOrderResult {
    pub order_id: String,
    pub status: OrderStatus,
    pub filled_amount: Nat,
    pub remaining_amount: Nat,
    pub trades: Vec<Trade>,
}

/// Order cancellation result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CancelOrderResult {
    pub order_id: String,
    pub cancelled_amount: Nat,
}

/// Orderbook depth (market depth visualization)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OrderbookDepth {
    pub bids: Vec<(Nat, Nat)>, // (price, total_amount)
    pub asks: Vec<(Nat, Nat)>, // (price, total_amount)
    pub spread: Nat,
    pub mid_price: Option<Nat>,
}

/// Orderbook statistics
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OrderbookStats {
    pub pool_id: String,
    pub total_orders: u64,
    pub active_orders: u64,
    pub total_trades: u64,
    pub volume_24h: Nat,
    pub high_24h: Option<Nat>,
    pub low_24h: Option<Nat>,
    pub last_price: Option<Nat>,
}

/// Main Orderbook structure
pub struct Orderbook {
    pub pool_id: String,
    /// Buy orders sorted by price (descending) then time (ascending)
    pub bids: BTreeMap<String, PriceLevel>, // price_string -> PriceLevel
    /// Sell orders sorted by price (ascending) then time (ascending)
    pub asks: BTreeMap<String, PriceLevel>, // price_string -> PriceLevel
    /// Quick order lookup
    pub orders: HashMap<String, Order>,
    /// Stop orders waiting to be triggered
    pub stop_orders: HashMap<String, Order>,
    /// Trade history
    pub trades: VecDeque<Trade>,
    /// User orders mapping
    pub user_orders: HashMap<Principal, Vec<String>>,
    /// Statistics
    pub stats: OrderbookStats,
    /// Configuration
    pub config: OrderbookConfig,
    /// Next order ID
    next_order_id: u64,
    /// Next trade ID
    next_trade_id: u64,
}

#[derive(Clone, Debug)]
pub struct OrderbookConfig {
    pub min_order_amount: Nat,
    pub max_order_amount: Nat,
    pub price_decimals: u8,
    pub amount_decimals: u8,
    pub max_orders_per_user: u64,
    pub max_price_levels: usize,
    pub trade_history_limit: usize,
}

impl Default for OrderbookConfig {
    fn default() -> Self {
        Self {
            min_order_amount: Nat::from(1000u64), // 0.000001 tokens (assuming 8 decimals)
            max_order_amount: Nat::from(1_000_000_000_000u64), // 10,000 tokens
            price_decimals: 8,
            amount_decimals: 8,
            max_orders_per_user: 100,
            max_price_levels: 1000,
            trade_history_limit: 10000,
        }
    }
}

impl Orderbook {
    pub fn new(pool_id: String, config: Option<OrderbookConfig>) -> Self {
        Self {
            pool_id: pool_id.clone(),
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
            orders: HashMap::new(),
            stop_orders: HashMap::new(),
            trades: VecDeque::new(),
            user_orders: HashMap::new(),
            stats: OrderbookStats {
                pool_id,
                total_orders: 0,
                active_orders: 0,
                total_trades: 0,
                volume_24h: Nat::from(0u64),
                high_24h: None,
                low_24h: None,
                last_price: None,
            },
            config: config.unwrap_or_default(),
            next_order_id: 1,
            next_trade_id: 1,
        }
    }

    /// Place a new order
    pub fn place_order(
        &mut self,
        user: Principal,
        side: OrderSide,
        order_type: OrderType,
        price: Nat,
        amount: Nat,
        time_in_force: TimeInForce,
    ) -> Result<PlaceOrderResult, String> {
        // Validation
        self.validate_order(&user, &amount, &price)?;

        // Generate order ID
        let order_id = self.generate_order_id();

        // Create order
        let mut order = Order::new(
            order_id.clone(),
            user,
            self.pool_id.clone(),
            side.clone(),
            order_type.clone(),
            price.clone(),
            amount.clone(),
            time_in_force.clone(),
        );

        // Handle different order types
        match order_type {
            OrderType::Market => {
                self.execute_market_order(&mut order)
            }
            OrderType::Limit => {
                self.execute_limit_order(&mut order)
            }
            OrderType::StopLimit { stop_price } => {
                // Stop orders are stored separately until triggered
                self.stop_orders.insert(order_id.clone(), order.clone());
                Ok(PlaceOrderResult {
                    order_id,
                    status: OrderStatus::Open,
                    filled_amount: Nat::from(0u64),
                    remaining_amount: amount,
                    trades: vec![],
                })
            }
        }
    }

    /// Execute a market order
    fn execute_market_order(&mut self, order: &mut Order) -> Result<PlaceOrderResult, String> {
        let mut trades = Vec::new();
        let initial_amount = order.amount.clone();

        // Match against opposite side
        let opposite_side = match order.side {
            OrderSide::Buy => &mut self.asks,
            OrderSide::Sell => &mut self.bids,
        };

        // Get price levels in order (best price first)
        let price_keys: Vec<String> = opposite_side.keys().cloned().collect();

        for price_key in price_keys {
            if order.remaining_amount() == Nat::from(0u64) {
                break;
            }

            if let Some(level) = opposite_side.get_mut(&price_key) {
                let matched_trades = self.match_orders_at_level(order, level)?;
                trades.extend(matched_trades);

                // Remove empty level
                if level.is_empty() {
                    opposite_side.remove(&price_key);
                }
            }
        }

        // Market orders must be filled or killed
        if order.remaining_amount() > Nat::from(0u64) {
            order.status = OrderStatus::Rejected {
                reason: "Insufficient liquidity".to_string(),
            };
        } else {
            order.status = OrderStatus::Filled;
        }

        // Update order
        self.orders.insert(order.id.clone(), order.clone());
        self.update_user_orders(order.user, order.id.clone());
        self.stats.total_orders += 1;

        // Update statistics
        for trade in &trades {
            self.update_stats_after_trade(trade);
        }

        Ok(PlaceOrderResult {
            order_id: order.id.clone(),
            status: order.status.clone(),
            filled_amount: order.filled_amount.clone(),
            remaining_amount: order.remaining_amount(),
            trades,
        })
    }

    /// Execute a limit order
    fn execute_limit_order(&mut self, order: &mut Order) -> Result<PlaceOrderResult, String> {
        let mut trades = Vec::new();

        // Try to match with existing orders
        let opposite_side = match order.side {
            OrderSide::Buy => &mut self.asks,
            OrderSide::Sell => &mut self.bids,
        };

        let price_keys: Vec<String> = opposite_side.keys().cloned().collect();

        for price_key in price_keys {
            if order.remaining_amount() == Nat::from(0u64) {
                break;
            }

            if let Some(level) = opposite_side.get_mut(&price_key) {
                // Check if price is acceptable
                let level_price = &level.price;
                let can_match = match order.side {
                    OrderSide::Buy => level_price <= &order.price,
                    OrderSide::Sell => level_price >= &order.price,
                };

                if !can_match {
                    break;
                }

                let matched_trades = self.match_orders_at_level(order, level)?;
                trades.extend(matched_trades);

                if level.is_empty() {
                    opposite_side.remove(&price_key);
                }
            }
        }

        // Handle time-in-force
        match &order.time_in_force {
            TimeInForce::FOK => {
                if order.remaining_amount() > Nat::from(0u64) {
                    order.status = OrderStatus::Cancelled;
                    // Rollback trades (in production, use proper transaction handling)
                    return Err("FOK order could not be completely filled".to_string());
                }
            }
            TimeInForce::IOC => {
                if order.remaining_amount() > Nat::from(0u64) {
                    order.status = OrderStatus::Cancelled;
                }
            }
            TimeInForce::GTC | TimeInForce::GTT { .. } => {
                // Add remaining order to book if not completely filled
                if order.remaining_amount() > Nat::from(0u64) && order.is_fillable() {
                    self.add_order_to_book(order.clone())?;
                }
            }
        }

        // Update order
        self.orders.insert(order.id.clone(), order.clone());
        self.update_user_orders(order.user, order.id.clone());
        self.stats.total_orders += 1;
        if order.is_fillable() {
            self.stats.active_orders += 1;
        }

        // Update statistics
        for trade in &trades {
            self.update_stats_after_trade(trade);
        }

        Ok(PlaceOrderResult {
            order_id: order.id.clone(),
            status: order.status.clone(),
            filled_amount: order.filled_amount.clone(),
            remaining_amount: order.remaining_amount(),
            trades,
        })
    }

    /// Match orders at a specific price level
    fn match_orders_at_level(
        &mut self,
        taker_order: &mut Order,
        level: &mut PriceLevel,
    ) -> Result<Vec<Trade>, String> {
        let mut trades = Vec::new();

        while taker_order.remaining_amount() > Nat::from(0u64) && !level.is_empty() {
            let maker_order = level.orders.front_mut()
                .ok_or("Empty level")?;

            // Calculate trade amount
            let trade_amount = std::cmp::min(
                taker_order.remaining_amount(),
                maker_order.remaining_amount(),
            );

            // Create trade
            let trade = Trade {
                id: self.generate_trade_id(),
                pool_id: self.pool_id.clone(),
                maker_order_id: maker_order.id.clone(),
                taker_order_id: taker_order.id.clone(),
                maker: maker_order.user,
                taker: taker_order.user,
                price: level.price.clone(),
                amount: trade_amount.clone(),
                side: taker_order.side.clone(),
                timestamp: time(),
            };

            // Update orders
            maker_order.fill(trade_amount.clone());
            taker_order.fill(trade_amount.clone());

            // Update level
            level.total_amount = level.total_amount.clone().saturating_sub(trade_amount);

            // Remove filled maker order
            if !maker_order.is_fillable() {
                let filled_order = level.orders.pop_front().unwrap();
                self.orders.insert(filled_order.id.clone(), filled_order.clone());
                self.stats.active_orders = self.stats.active_orders.saturating_sub(1);
            }

            trades.push(trade);
        }

        Ok(trades)
    }

    /// Add order to orderbook
    fn add_order_to_book(&mut self, order: Order) -> Result<(), String> {
        let price_key = format!("{}", order.price);

        let book = match order.side {
            OrderSide::Buy => &mut self.bids,
            OrderSide::Sell => &mut self.asks,
        };

        // Get or create price level
        let level = book.entry(price_key.clone())
            .or_insert_with(|| PriceLevel::new(order.price.clone()));

        level.add_order(order);

        // Check max levels limit
        if book.len() > self.config.max_price_levels {
            return Err("Maximum price levels exceeded".to_string());
        }

        Ok(())
    }

    /// Cancel an order
    pub fn cancel_order(
        &mut self,
        user: Principal,
        order_id: String,
    ) -> Result<CancelOrderResult, String> {
        // Get order
        let order = self.orders.get_mut(&order_id)
            .ok_or("Order not found")?;

        // Verify ownership
        if order.user != user {
            return Err("Not authorized to cancel this order".to_string());
        }

        // Check if order can be cancelled
        if !order.is_fillable() {
            return Err("Order cannot be cancelled".to_string());
        }

        let cancelled_amount = order.remaining_amount();

        // Remove from book
        let price_key = format!("{}", order.price);
        let book = match order.side {
            OrderSide::Buy => &mut self.bids,
            OrderSide::Sell => &mut self.asks,
        };

        if let Some(level) = book.get_mut(&price_key) {
            level.remove_order(&order_id);
            if level.is_empty() {
                book.remove(&price_key);
            }
        }

        // Update order status
        order.cancel();
        self.stats.active_orders = self.stats.active_orders.saturating_sub(1);

        Ok(CancelOrderResult {
            order_id,
            cancelled_amount,
        })
    }

    /// Get orderbook depth
    pub fn get_depth(&self, levels: usize) -> OrderbookDepth {
        let mut bids = Vec::new();
        let mut asks = Vec::new();

        // Get top bid levels (highest prices first)
        for (_, level) in self.bids.iter().rev().take(levels) {
            bids.push((level.price.clone(), level.total_amount.clone()));
        }

        // Get top ask levels (lowest prices first)
        for (_, level) in self.asks.iter().take(levels) {
            asks.push((level.price.clone(), level.total_amount.clone()));
        }

        let best_bid = bids.first().map(|(p, _)| p.clone());
        let best_ask = asks.first().map(|(p, _)| p.clone());

        let spread = match (&best_ask, &best_bid) {
            (Some(ask), Some(bid)) => ask.clone().saturating_sub(bid.clone()),
            _ => Nat::from(0u64),
        };

        let mid_price = match (&best_ask, &best_bid) {
            (Some(ask), Some(bid)) => {
                Some((ask.clone() + bid.clone()) / Nat::from(2u64))
            }
            _ => None,
        };

        OrderbookDepth {
            bids,
            asks,
            spread,
            mid_price,
        }
    }

    /// Get user orders
    pub fn get_user_orders(&self, user: Principal) -> Vec<Order> {
        self.user_orders
            .get(&user)
            .map(|order_ids| {
                order_ids
                    .iter()
                    .filter_map(|id| self.orders.get(id).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get recent trades
    pub fn get_recent_trades(&self, limit: usize) -> Vec<Trade> {
        self.trades
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Update statistics after trade
    fn update_stats_after_trade(&mut self, trade: &Trade) {
        self.stats.total_trades += 1;
        self.stats.volume_24h = &self.stats.volume_24h + &trade.amount;
        self.stats.last_price = Some(trade.price.clone());

        // Update high/low
        match &self.stats.high_24h {
            None => self.stats.high_24h = Some(trade.price.clone()),
            Some(high) => {
                if trade.price > *high {
                    self.stats.high_24h = Some(trade.price.clone());
                }
            }
        }

        match &self.stats.low_24h {
            None => self.stats.low_24h = Some(trade.price.clone()),
            Some(low) => {
                if trade.price < *low {
                    self.stats.low_24h = Some(trade.price.clone());
                }
            }
        }

        // Add to trade history
        self.trades.push_back(trade.clone());
        if self.trades.len() > self.config.trade_history_limit {
            self.trades.pop_front();
        }
    }

    /// Validate order
    fn validate_order(
        &self,
        user: &Principal,
        amount: &Nat,
        _price: &Nat,
    ) -> Result<(), String> {
        // Check minimum amount
        if amount < &self.config.min_order_amount {
            return Err("Order amount below minimum".to_string());
        }

        // Check maximum amount
        if amount > &self.config.max_order_amount {
            return Err("Order amount exceeds maximum".to_string());
        }

        // Check user order limit
        if let Some(user_order_ids) = self.user_orders.get(user) {
            let active_orders = user_order_ids
                .iter()
                .filter(|id| {
                    self.orders
                        .get(*id)
                        .map(|o| o.is_fillable())
                        .unwrap_or(false)
                })
                .count() as u64;

            if active_orders >= self.config.max_orders_per_user {
                return Err("Maximum orders per user exceeded".to_string());
            }
        }

        Ok(())
    }

    /// Update user orders mapping
    fn update_user_orders(&mut self, user: Principal, order_id: String) {
        self.user_orders
            .entry(user)
            .or_insert_with(Vec::new)
            .push(order_id);
    }

    /// Generate unique order ID
    fn generate_order_id(&mut self) -> String {
        let id = format!("{}-{}", self.pool_id, self.next_order_id);
        self.next_order_id += 1;
        id
    }

    /// Generate unique trade ID
    fn generate_trade_id(&mut self) -> String {
        let id = format!("T-{}", self.next_trade_id);
        self.next_trade_id += 1;
        id
    }

    /// Process expired orders (called periodically)
    pub fn process_expired_orders(&mut self) {
        let now = time();
        let mut expired_order_ids = Vec::new();

        for (order_id, order) in &self.orders {
            if let TimeInForce::GTT { expiry } = order.time_in_force {
                if now >= expiry && order.is_fillable() {
                    expired_order_ids.push(order_id.clone());
                }
            }
        }

        for order_id in expired_order_ids {
            if let Some(order) = self.orders.get_mut(&order_id) {
                order.expire();
                self.stats.active_orders = self.stats.active_orders.saturating_sub(1);

                // Remove from book
                let price_key = format!("{}", order.price);
                let book = match order.side {
                    OrderSide::Buy => &mut self.bids,
                    OrderSide::Sell => &mut self.asks,
                };

                if let Some(level) = book.get_mut(&price_key) {
                    level.remove_order(&order_id);
                    if level.is_empty() {
                        book.remove(&price_key);
                    }
                }
            }
        }
    }

    /// Get statistics
    pub fn get_stats(&self) -> OrderbookStats {
        self.stats.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_orderbook() -> Orderbook {
        Orderbook::new("test-pool".to_string(), None)
    }

    fn test_principal(n: u8) -> Principal {
        Principal::from_slice(&[n; 29])
    }

    #[test]
    fn test_place_limit_order() {
        let mut orderbook = create_test_orderbook();
        let user = test_principal(1);

        let result = orderbook.place_order(
            user,
            OrderSide::Buy,
            OrderType::Limit,
            Nat::from(100_000u64),
            Nat::from(10_000u64),
            TimeInForce::GTC,
        );

        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.filled_amount, Nat::from(0u64));
        assert_eq!(result.trades.len(), 0);
    }

    #[test]
    fn test_order_matching() {
        let mut orderbook = create_test_orderbook();
        let buyer = test_principal(1);
        let seller = test_principal(2);

        // Place sell order
        orderbook.place_order(
            seller,
            OrderSide::Sell,
            OrderType::Limit,
            Nat::from(100_000u64),
            Nat::from(10_000u64),
            TimeInForce::GTC,
        ).unwrap();

        // Place matching buy order
        let result = orderbook.place_order(
            buyer,
            OrderSide::Buy,
            OrderType::Limit,
            Nat::from(100_000u64),
            Nat::from(10_000u64),
            TimeInForce::GTC,
        );

        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.filled_amount, Nat::from(10_000u64));
        assert_eq!(result.trades.len(), 1);
        assert_eq!(result.trades[0].amount, Nat::from(10_000u64));
    }

    #[test]
    fn test_cancel_order() {
        let mut orderbook = create_test_orderbook();
        let user = test_principal(1);

        let result = orderbook.place_order(
            user,
            OrderSide::Buy,
            OrderType::Limit,
            Nat::from(100_000u64),
            Nat::from(10_000u64),
            TimeInForce::GTC,
        ).unwrap();

        let cancel_result = orderbook.cancel_order(user, result.order_id);
        assert!(cancel_result.is_ok());
    }

    #[test]
    fn test_orderbook_depth() {
        let mut orderbook = create_test_orderbook();
        let user = test_principal(1);

        // Place multiple orders
        orderbook.place_order(
            user,
            OrderSide::Buy,
            OrderType::Limit,
            Nat::from(100_000u64),
            Nat::from(5_000u64),
            TimeInForce::GTC,
        ).unwrap();

        orderbook.place_order(
            user,
            OrderSide::Buy,
            OrderType::Limit,
            Nat::from(99_000u64),
            Nat::from(3_000u64),
            TimeInForce::GTC,
        ).unwrap();

        orderbook.place_order(
            user,
            OrderSide::Sell,
            OrderType::Limit,
            Nat::from(101_000u64),
            Nat::from(4_000u64),
            TimeInForce::GTC,
        ).unwrap();

        let depth = orderbook.get_depth(10);
        assert_eq!(depth.bids.len(), 2);
        assert_eq!(depth.asks.len(), 1);
        assert!(depth.mid_price.is_some());
    }
}
