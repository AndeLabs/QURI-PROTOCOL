/**
 * StatusTracker Component
 * Multi-step progress tracker for bridge transactions
 */

'use client';

import { Check, Loader, Clock, AlertCircle } from 'lucide-react';

export type BridgeStep = {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  timestamp?: Date;
  txHash?: string;
};

export interface StatusTrackerProps {
  steps: BridgeStep[];
  currentStep: number;
  className?: string;
}

export function StatusTracker({
  steps,
  currentStep,
  className = '',
}: StatusTrackerProps) {
  const getStepIcon = (step: BridgeStep, index: number) => {
    if (step.status === 'completed') {
      return <Check className="h-5 w-5 text-white" />;
    }
    if (step.status === 'failed') {
      return <AlertCircle className="h-5 w-5 text-white" />;
    }
    if (step.status === 'in-progress') {
      return <Loader className="h-5 w-5 text-white animate-spin" />;
    }
    return <span className="text-sm font-semibold text-white">{index + 1}</span>;
  };

  const getStepColor = (step: BridgeStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'in-progress':
        return 'bg-blue-500 border-blue-500';
      case 'failed':
        return 'bg-red-500 border-red-500';
      default:
        return 'bg-museum-light-gray border-museum-light-gray';
    }
  };

  const getStepTextColor = (step: BridgeStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-900';
      case 'in-progress':
        return 'text-blue-900';
      case 'failed':
        return 'text-red-900';
      default:
        return 'text-museum-dark-gray';
    }
  };

  return (
    <div className={className}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Step */}
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center
                    transition-all
                    ${getStepColor(step)}
                  `}
                >
                  {getStepIcon(step, index)}
                </div>
                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`
                      w-0.5 h-16 mt-2 transition-all
                      ${
                        step.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-museum-light-gray'
                      }
                    `}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h4
                      className={`
                        font-semibold mb-1
                        ${getStepTextColor(step)}
                      `}
                    >
                      {step.label}
                    </h4>
                    <p className="text-sm text-museum-dark-gray">{step.description}</p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0 ml-4">
                    {step.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                    {step.status === 'in-progress' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                        <Loader className="h-3 w-3 animate-spin" />
                        Processing
                      </span>
                    )}
                    {step.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">
                        <Check className="h-3 w-3" />
                        Completed
                      </span>
                    )}
                    {step.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                {step.timestamp && (
                  <p className="text-xs text-museum-dark-gray mt-2">
                    {step.timestamp.toLocaleString()}
                  </p>
                )}

                {/* Transaction Hash */}
                {step.txHash && (
                  <a
                    href={`https://mempool.space/tx/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-mono text-blue-600 hover:underline"
                  >
                    {step.txHash.slice(0, 16)}...
                    <span className="text-blue-600">↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
