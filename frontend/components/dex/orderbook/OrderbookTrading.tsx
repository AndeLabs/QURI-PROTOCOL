/**
 * Orderbook Trading Component
 * TODO: Implement when DEX canister is deployed
 * Currently placeholder component
 */

'use client';

import React from 'react';

interface OrderbookTradingProps {
  poolId?: string;
}

export const OrderbookTrading: React.FC<OrderbookTradingProps> = ({ poolId }) => {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        Orderbook Trading Coming Soon
      </h3>
      <p className="text-gray-500 mb-4">
        The orderbook trading feature is currently under development.
      </p>
      {poolId && (
        <p className="text-xs text-gray-400 mb-2">Pool ID: {poolId}</p>
      )}
      <p className="text-sm text-gray-400">
        Check back soon for limit orders and advanced trading features.
      </p>
    </div>
  );
};
