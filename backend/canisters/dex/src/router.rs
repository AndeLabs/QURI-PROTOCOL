use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

use crate::amm::AMMPool;

/// DEX Router - Smart Order Routing
///
/// Professional implementation of intelligent order routing that finds
/// the best execution path for trades across multiple liquidity pools.
///
/// Features:
/// - Best price discovery across all pools
/// - Multi-hop routing (A → B → C)
/// - Split orders across multiple pools
/// - Gas optimization
/// - Slippage minimization
/// - Route caching for performance
///
/// Based on routing algorithms from:
/// - Uniswap V3 Smart Order Router
/// - 1inch Aggregation Protocol
/// - 0x Protocol

// ============================================================================
// Types
// ============================================================================

/// Swap route - single or multi-hop
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum Route {
    /// Direct swap through single pool
    Direct {
        pool_id: String,
        token_in: Principal,
        token_out: Principal,
    },

    /// Multi-hop swap through multiple pools
    MultiHop {
        hops: Vec<RouteHop>,
    },

    /// Split trade across multiple routes
    Split {
        routes: Vec<SplitRoute>,
    },
}

/// Single hop in a multi-hop route
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct RouteHop {
    pub pool_id: String,
    pub token_in: Principal,
    pub token_out: Principal,
    pub expected_amount_in: Nat,
    pub expected_amount_out: Nat,
}

/// Split route with percentage allocation
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct SplitRoute {
    pub route: Route,
    pub percentage: u8, // 0-100
    pub amount_in: Nat,
    pub expected_amount_out: Nat,
}

/// Route quote with execution details
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RouteQuote {
    pub route: Route,
    pub amount_in: Nat,
    pub amount_out: Nat,
    pub price_impact: f64,
    pub gas_estimate: u64,
    pub execution_price: f64,
    pub minimum_received: Nat, // With slippage tolerance
}

/// Routing configuration
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RouterConfig {
    /// Maximum number of hops allowed
    pub max_hops: u8,

    /// Maximum number of splits for split routing
    pub max_splits: u8,

    /// Slippage tolerance (basis points)
    pub slippage_tolerance_bps: u16,

    /// Minimum improvement for split routing (basis points)
    pub min_split_improvement_bps: u16,

    /// Enable route caching
    pub enable_caching: bool,
}

impl Default for RouterConfig {
    fn default() -> Self {
        Self {
            max_hops: 3,
            max_splits: 3,
            slippage_tolerance_bps: 50, // 0.5%
            min_split_improvement_bps: 10, // 0.1%
            enable_caching: true,
        }
    }
}

/// Graph node representing a token in the routing graph
#[derive(Clone, Debug)]
struct TokenNode {
    token: Principal,
    pools: Vec<String>, // Pool IDs where this token is available
}

/// Routing graph for pathfinding
#[derive(Clone, Debug)]
struct RoutingGraph {
    /// All tokens in the graph
    tokens: HashSet<Principal>,

    /// Adjacency list: token -> (connected_token, pool_id)
    edges: HashMap<Principal, Vec<(Principal, String)>>,
}

// ============================================================================
// DEX Router Implementation
// ============================================================================

pub struct DEXRouter {
    /// All available pools
    pools: HashMap<String, AMMPool>,

    /// Routing graph
    graph: RoutingGraph,

    /// Configuration
    config: RouterConfig,

    /// Route cache: (token_in, token_out, amount) -> Route
    route_cache: HashMap<(Principal, Principal, Nat), Route>,
}

impl DEXRouter {
    /// Create new router
    pub fn new(config: RouterConfig) -> Self {
        Self {
            pools: HashMap::new(),
            graph: RoutingGraph {
                tokens: HashSet::new(),
                edges: HashMap::new(),
            },
            config,
            route_cache: HashMap::new(),
        }
    }

    /// Add pool to router
    pub fn add_pool(&mut self, pool_id: String, pool: AMMPool) {
        // Add tokens to graph
        self.graph.tokens.insert(pool.token0);
        self.graph.tokens.insert(pool.token1);

        // Add edges
        self.graph
            .edges
            .entry(pool.token0)
            .or_insert_with(Vec::new)
            .push((pool.token1, pool_id.clone()));

        self.graph
            .edges
            .entry(pool.token1)
            .or_insert_with(Vec::new)
            .push((pool.token0, pool_id.clone()));

        // Store pool
        self.pools.insert(pool_id, pool);

        // Clear cache when topology changes
        self.route_cache.clear();
    }

    /// Remove pool from router
    pub fn remove_pool(&mut self, pool_id: &str) {
        if let Some(pool) = self.pools.remove(pool_id) {
            // Remove edges
            if let Some(edges) = self.graph.edges.get_mut(&pool.token0) {
                edges.retain(|(_, pid)| pid != pool_id);
            }

            if let Some(edges) = self.graph.edges.get_mut(&pool.token1) {
                edges.retain(|(_, pid)| pid != pool_id);
            }

            // Clear cache
            self.route_cache.clear();
        }
    }

    /// Find best route for a swap
    pub fn find_best_route(
        &mut self,
        token_in: Principal,
        token_out: Principal,
        amount_in: Nat,
    ) -> Result<RouteQuote, String> {
        // Check cache first
        if self.config.enable_caching {
            let cache_key = (token_in, token_out, amount_in.clone());
            if let Some(cached_route) = self.route_cache.get(&cache_key) {
                return self.quote_route(cached_route.clone(), amount_in);
            }
        }

        // Find all possible routes
        let direct_route = self.find_direct_route(token_in, token_out)?;
        let multi_hop_routes = self.find_multi_hop_routes(token_in, token_out)?;

        // Evaluate all routes
        let mut best_route = direct_route;
        let mut best_quote = self.quote_route(best_route.clone(), amount_in.clone())?;

        for route in multi_hop_routes {
            if let Ok(quote) = self.quote_route(route.clone(), amount_in.clone()) {
                if quote.amount_out > best_quote.amount_out {
                    best_route = route;
                    best_quote = quote;
                }
            }
        }

        // Try split routing if beneficial
        if let Ok(split_route) = self.find_split_route(token_in, token_out, amount_in.clone()) {
            if let Ok(split_quote) = self.quote_route(split_route.clone(), amount_in.clone()) {
                let improvement_bps = calculate_improvement_bps(
                    &best_quote.amount_out,
                    &split_quote.amount_out,
                );

                if improvement_bps >= self.config.min_split_improvement_bps as u64 {
                    best_route = split_route;
                    best_quote = split_quote;
                }
            }
        }

        // Cache result
        if self.config.enable_caching {
            self.route_cache.insert(
                (token_in, token_out, amount_in.clone()),
                best_route.clone(),
            );
        }

        Ok(best_quote)
    }

    /// Find direct route (single pool)
    fn find_direct_route(
        &self,
        token_in: Principal,
        token_out: Principal,
    ) -> Result<Route, String> {
        // Look for pool with both tokens
        for (pool_id, pool) in &self.pools {
            if (pool.token0 == token_in && pool.token1 == token_out)
                || (pool.token0 == token_out && pool.token1 == token_in)
            {
                return Ok(Route::Direct {
                    pool_id: pool_id.clone(),
                    token_in,
                    token_out,
                });
            }
        }

        Err("No direct route found".to_string())
    }

    /// Find multi-hop routes using BFS
    fn find_multi_hop_routes(
        &self,
        token_in: Principal,
        token_out: Principal,
    ) -> Result<Vec<Route>, String> {
        let mut routes = Vec::new();
        let max_hops = self.config.max_hops as usize;

        // BFS to find paths
        let mut queue = vec![(token_in, vec![], HashSet::new())];
        let mut visited_paths = HashSet::new();

        while let Some((current_token, path, visited_tokens)) = queue.pop() {
            // Check if we reached destination
            if current_token == token_out && !path.is_empty() {
                // Convert path to route
                if let Ok(route) = self.path_to_route(&path) {
                    // Avoid duplicate routes
                    let path_key = format!("{:?}", path);
                    if visited_paths.insert(path_key) {
                        routes.push(route);
                    }
                }
                continue;
            }

            // Don't exceed max hops
            if path.len() >= max_hops {
                continue;
            }

            // Explore neighbors
            if let Some(edges) = self.graph.edges.get(&current_token) {
                for (next_token, pool_id) in edges {
                    // Avoid cycles
                    if !visited_tokens.contains(next_token) {
                        let mut new_path = path.clone();
                        new_path.push((current_token, *next_token, pool_id.clone()));

                        let mut new_visited = visited_tokens.clone();
                        new_visited.insert(*next_token);

                        queue.push((*next_token, new_path, new_visited));
                    }
                }
            }
        }

        if routes.is_empty() {
            Err("No multi-hop routes found".to_string())
        } else {
            Ok(routes)
        }
    }

    /// Convert path to Route
    fn path_to_route(
        &self,
        path: &[(Principal, Principal, String)],
    ) -> Result<Route, String> {
        let hops: Vec<RouteHop> = path
            .iter()
            .map(|(token_in, token_out, pool_id)| RouteHop {
                pool_id: pool_id.clone(),
                token_in: *token_in,
                token_out: *token_out,
                expected_amount_in: Nat::from(0u64), // Filled during quote
                expected_amount_out: Nat::from(0u64), // Filled during quote
            })
            .collect();

        Ok(Route::MultiHop { hops })
    }

    /// Find optimal split route
    fn find_split_route(
        &self,
        token_in: Principal,
        token_out: Principal,
        amount_in: Nat,
    ) -> Result<Route, String> {
        // Find all viable routes
        let mut viable_routes = Vec::new();

        if let Ok(direct) = self.find_direct_route(token_in, token_out) {
            viable_routes.push(direct);
        }

        if let Ok(multi_hop) = self.find_multi_hop_routes(token_in, token_out) {
            viable_routes.extend(multi_hop);
        }

        if viable_routes.len() < 2 {
            return Err("Not enough routes for splitting".to_string());
        }

        // Optimize split percentages using simple greedy algorithm
        // In production, use more sophisticated optimization (e.g., quadratic programming)
        let num_routes = viable_routes.len().min(self.config.max_splits as usize);
        let split_routes = self.optimize_split(&viable_routes[..num_routes], amount_in)?;

        Ok(Route::Split {
            routes: split_routes,
        })
    }

    /// Optimize split percentages across routes
    fn optimize_split(
        &self,
        routes: &[Route],
        total_amount: Nat,
    ) -> Result<Vec<SplitRoute>, String> {
        // Simple equal split for now
        // In production, optimize based on price impact curves
        let split_count = routes.len();
        let percentage_per_route = 100 / split_count as u8;
        let amount_per_route = total_amount.clone() / Nat::from(split_count as u64);

        let split_routes: Vec<SplitRoute> = routes
            .iter()
            .map(|route| {
                let quote = self.quote_route(route.clone(), amount_per_route.clone()).ok();

                SplitRoute {
                    route: route.clone(),
                    percentage: percentage_per_route,
                    amount_in: amount_per_route.clone(),
                    expected_amount_out: quote
                        .as_ref()
                        .map(|q| q.amount_out.clone())
                        .unwrap_or(Nat::from(0u64)),
                }
            })
            .collect();

        Ok(split_routes)
    }

    /// Get quote for a route
    fn quote_route(&self, route: Route, amount_in: Nat) -> Result<RouteQuote, String> {
        match route {
            Route::Direct {
                pool_id,
                token_in,
                token_out,
            } => self.quote_direct(pool_id, token_in, token_out, amount_in),

            Route::MultiHop { hops } => self.quote_multi_hop(hops, amount_in),

            Route::Split { routes } => self.quote_split(routes),
        }
    }

    /// Quote direct route
    fn quote_direct(
        &self,
        pool_id: String,
        token_in: Principal,
        token_out: Principal,
        amount_in: Nat,
    ) -> Result<RouteQuote, String> {
        let pool = self.pools.get(&pool_id).ok_or("Pool not found")?;

        let amount_out = if token_in == pool.token0 {
            pool.get_quote_token0_to_token1(amount_in.clone())?
        } else {
            pool.get_quote_token1_to_token0(amount_in.clone())?
        };

        let price_before = pool.get_price();
        let price_impact = 0.5; // TODO: Calculate actual price impact

        let execution_price = nat_to_f64(&amount_out) / nat_to_f64(&amount_in);

        let minimum_received = apply_slippage(&amount_out, self.config.slippage_tolerance_bps);

        Ok(RouteQuote {
            route: Route::Direct {
                pool_id,
                token_in,
                token_out,
            },
            amount_in,
            amount_out,
            price_impact,
            gas_estimate: 100_000, // Estimated gas
            execution_price,
            minimum_received,
        })
    }

    /// Quote multi-hop route
    fn quote_multi_hop(
        &self,
        hops: Vec<RouteHop>,
        initial_amount: Nat,
    ) -> Result<RouteQuote, String> {
        let mut current_amount = initial_amount.clone();
        let mut total_price_impact = 0.0;

        for hop in &hops {
            let pool = self.pools.get(&hop.pool_id).ok_or("Pool not found")?;

            let amount_out = if hop.token_in == pool.token0 {
                pool.get_quote_token0_to_token1(current_amount.clone())?
            } else {
                pool.get_quote_token1_to_token0(current_amount.clone())?
            };

            // Accumulate price impact
            // TODO: Calculate actual price impact per hop
            total_price_impact += 0.3;

            current_amount = amount_out;
        }

        let final_amount = current_amount;
        let execution_price = nat_to_f64(&final_amount) / nat_to_f64(&initial_amount);
        let minimum_received = apply_slippage(&final_amount, self.config.slippage_tolerance_bps);

        Ok(RouteQuote {
            route: Route::MultiHop { hops },
            amount_in: initial_amount,
            amount_out: final_amount,
            price_impact: total_price_impact,
            gas_estimate: 200_000, // Higher gas for multi-hop
            execution_price,
            minimum_received,
        })
    }

    /// Quote split route
    fn quote_split(&self, routes: Vec<SplitRoute>) -> Result<RouteQuote, String> {
        let mut total_amount_in = Nat::from(0u64);
        let mut total_amount_out = Nat::from(0u64);
        let mut total_price_impact = 0.0;

        for split in &routes {
            total_amount_in += split.amount_in.clone();
            total_amount_out += split.expected_amount_out.clone();

            // Quote individual route for price impact
            if let Ok(quote) = self.quote_route(split.route.clone(), split.amount_in.clone()) {
                total_price_impact += quote.price_impact * (split.percentage as f64 / 100.0);
            }
        }

        let execution_price = nat_to_f64(&total_amount_out) / nat_to_f64(&total_amount_in);
        let minimum_received =
            apply_slippage(&total_amount_out, self.config.slippage_tolerance_bps);

        Ok(RouteQuote {
            route: Route::Split { routes },
            amount_in: total_amount_in,
            amount_out: total_amount_out,
            price_impact: total_price_impact,
            gas_estimate: 300_000, // Highest gas for split routing
            execution_price,
            minimum_received,
        })
    }

    /// Get all pools
    pub fn get_pools(&self) -> &HashMap<String, AMMPool> {
        &self.pools
    }

    /// Clear route cache
    pub fn clear_cache(&mut self) {
        self.route_cache.clear();
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

fn nat_to_f64(n: &Nat) -> f64 {
    n.0.to_u64_digits()
        .first()
        .copied()
        .unwrap_or(0) as f64
}

fn apply_slippage(amount: &Nat, slippage_bps: u16) -> Nat {
    let multiplier = 10000 - slippage_bps as u64;
    (amount.clone() * Nat::from(multiplier)) / Nat::from(10000u64)
}

fn calculate_improvement_bps(old_amount: &Nat, new_amount: &Nat) -> u64 {
    if old_amount == &Nat::from(0u64) {
        return 0;
    }

    let improvement = if new_amount > old_amount {
        new_amount.clone() - old_amount.clone()
    } else {
        return 0;
    };

    let bps = (improvement * Nat::from(10000u64)) / old_amount.clone();
    nat_to_u64(&bps)
}

fn nat_to_u64(n: &Nat) -> u64 {
    n.0.to_u64_digits().first().copied().unwrap_or(0)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::amm::AMMPool;

    fn create_test_router() -> DEXRouter {
        DEXRouter::new(RouterConfig::default())
    }

    fn create_test_pool(id: &str, token0: Principal, token1: Principal) -> AMMPool {
        AMMPool::new(id.to_string(), token0, token1, 0)
    }

    #[test]
    fn test_add_pool() {
        let mut router = create_test_router();
        let token0 = Principal::from_text("aaaaa-aa").unwrap();
        let token1 = Principal::from_text("bbbbb-bb").unwrap();

        let pool = create_test_pool("pool1", token0, token1);
        router.add_pool("pool1".to_string(), pool);

        assert_eq!(router.get_pools().len(), 1);
        assert!(router.graph.tokens.contains(&token0));
        assert!(router.graph.tokens.contains(&token1));
    }

    #[test]
    fn test_find_direct_route() {
        let mut router = create_test_router();
        let token0 = Principal::from_text("aaaaa-aa").unwrap();
        let token1 = Principal::from_text("bbbbb-bb").unwrap();

        let pool = create_test_pool("pool1", token0, token1);
        router.add_pool("pool1".to_string(), pool);

        let route = router.find_direct_route(token0, token1).unwrap();

        match route {
            Route::Direct { pool_id, .. } => {
                assert_eq!(pool_id, "pool1");
            }
            _ => panic!("Expected direct route"),
        }
    }

    #[test]
    fn test_multi_hop_routing() {
        let mut router = create_test_router();
        let token_a = Principal::from_text("aaaaa-aa").unwrap();
        let token_b = Principal::from_text("bbbbb-bb").unwrap();
        let token_c = Principal::from_text("ccccc-cc").unwrap();

        // Create pools: A-B and B-C
        let pool1 = create_test_pool("pool1", token_a, token_b);
        let pool2 = create_test_pool("pool2", token_b, token_c);

        router.add_pool("pool1".to_string(), pool1);
        router.add_pool("pool2".to_string(), pool2);

        // Should find route A -> B -> C
        let routes = router.find_multi_hop_routes(token_a, token_c).unwrap();

        assert!(!routes.is_empty());
    }

    #[test]
    fn test_slippage_application() {
        let amount = Nat::from(1000u64);
        let slippage_bps = 50; // 0.5%

        let result = apply_slippage(&amount, slippage_bps);

        // Should be 995 (0.5% slippage)
        assert_eq!(result, Nat::from(995u64));
    }
}
