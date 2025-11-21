/**
 * Settlement Components Export
 * Complete settlement system for QURI Protocol
 */

// Main settlement modal
export { SettlementModal, SettleButton } from './SettlementModal';

// Address components
export {
  BitcoinAddressInput,
  AddressPreview,
} from './BitcoinAddressInput';

// Saved addresses
export {
  SavedAddressesList,
  useSavedAddresses,
} from './SavedAddresses';

// Fee selection
export {
  FeeSelector,
  FeeDisplay,
  FeeComparisonTable,
} from './FeeSelector';

// State badges
export {
  RuneStateBadge,
  RuneStateTimeline,
  RuneStateCard,
} from './RuneStateBadge';

// History
export {
  SettlementHistory,
  SettlementStatusIndicator,
  ActiveSettlementsBadge,
} from './SettlementHistory';

// Re-export types
export type {
  RuneState,
  RuneStateInfo,
  SettlementMode,
  SettlementModeInfo,
  SavedAddress,
  SettlementRequest,
  SettlementEstimate,
  SettlementResult,
  SettlementStatus,
  SettlementStatusInfo,
  FeeEstimate,
  FeeEstimates,
} from '@/types/settlement';
