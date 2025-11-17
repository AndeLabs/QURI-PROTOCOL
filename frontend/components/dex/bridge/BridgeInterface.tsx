/**
 * Bridge Interface Component
 * TODO: Implement when bridge canister is deployed
 * Currently placeholder component
 */

'use client';

import React from 'react';

export const BridgeInterface: React.FC = () => {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        Bridge Coming Soon
      </h3>
      <p className="text-gray-500 mb-4">
        The cross-chain bridge is currently under development.
      </p>
      <p className="text-sm text-gray-400">
        Check back soon for Bitcoin ⇄ ICP Rune bridging functionality.
      </p>
    </div>
  );
};
