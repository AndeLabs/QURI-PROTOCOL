'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { X, ChevronRight, ChevronLeft, Bitcoin, Wallet, FileText, CheckCircle } from 'lucide-react';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    icon: <Wallet className="h-12 w-12 text-bitcoin-500" />,
    title: 'Welcome to QURI Protocol',
    description:
      'Create Bitcoin Runes on Internet Computer with zero platform fees. You only pay Bitcoin network transaction fees.',
    tip: 'You can explore without connecting your wallet first.',
  },
  {
    icon: <Bitcoin className="h-12 w-12 text-bitcoin-500" />,
    title: 'What are Runes?',
    description:
      'Runes are fungible tokens on Bitcoin, similar to ERC-20 tokens on Ethereum. They use the OP_RETURN opcode for data storage.',
    tip: 'Each Rune has a unique name, symbol, divisibility, and supply settings.',
  },
  {
    icon: <FileText className="h-12 w-12 text-bitcoin-500" />,
    title: 'How It Works',
    description:
      '1. Connect with Internet Identity\n2. Fill out Rune parameters\n3. Review transaction details\n4. Confirm and wait for Bitcoin confirmations',
    tip: 'The entire process is decentralized and non-custodial.',
  },
  {
    icon: <CheckCircle className="h-12 w-12 text-bitcoin-500" />,
    title: 'Ready to Start',
    description:
      'Connect your wallet using Internet Identity to begin creating your first Rune. The process typically takes 10-60 minutes depending on Bitcoin network congestion.',
    tip: 'Make sure you have ckBTC balance to pay for transaction fees.',
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if user has seen tutorial before
    const hasSeenTutorial = localStorage.getItem('quri_tutorial_completed');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('quri_tutorial_completed', 'true');
    setShowTutorial(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('quri_tutorial_completed', 'true');
    setShowTutorial(false);
    onSkip();
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!showTutorial) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          {/* Header with close button */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-1">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-bitcoin-500'
                      : index < currentStep
                        ? 'bg-bitcoin-300'
                        : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Skip tutorial"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">{step.icon}</div>

            {/* Title */}
            <h2 className="mb-3 text-2xl font-bold text-gray-900">{step.title}</h2>

            {/* Description */}
            <p className="mb-4 whitespace-pre-line text-gray-600">{step.description}</p>

            {/* Tip */}
            {step.tip && (
              <div className="mb-6 rounded-lg bg-bitcoin-50 p-4">
                <p className="text-sm font-medium text-bitcoin-700">
                  💡 Tip: {step.tip}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-shrink-0"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              {currentStep + 1} of {tutorialSteps.length}
            </div>

            <Button onClick={handleNext} className="flex-shrink-0">
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip tutorial
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component to manually trigger tutorial
export function TutorialButton() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowTutorial(true)}
        className="text-sm"
      >
        View Tutorial
      </Button>

      {showTutorial && (
        <OnboardingTutorial
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}
    </>
  );
}
