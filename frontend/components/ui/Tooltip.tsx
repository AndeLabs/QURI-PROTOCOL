'use client';

import { ReactNode, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center cursor-help ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children || <HelpCircle className="w-4 h-4 text-museum-gray hover:text-gold-500 transition-colors" />}
      </div>

      {isVisible && (
        <div className="absolute z-50 w-72 p-3 bg-museum-black text-white text-sm rounded-lg shadow-xl left-6 top-0 transform -translate-y-1/2">
          <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-museum-black"></div>
          {typeof content === 'string' ? <p>{content}</p> : content}
        </div>
      )}
    </div>
  );
}

interface InfoTooltipProps {
  title: string;
  description: string;
  examples?: string[];
  warning?: string;
}

export function InfoTooltip({ title, description, examples, warning }: InfoTooltipProps) {
  return (
    <Tooltip
      content={
        <div className="space-y-2">
          <p className="font-semibold text-gold-400">{title}</p>
          <p className="text-sm leading-relaxed">{description}</p>
          {examples && examples.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs font-semibold text-gray-400 mb-1">Ejemplos:</p>
              <ul className="text-xs space-y-1">
                {examples.map((example, idx) => (
                  <li key={idx} className="text-gray-300">• {example}</li>
                ))}
              </ul>
            </div>
          )}
          {warning && (
            <div className="mt-2 pt-2 border-t border-yellow-700 bg-yellow-900/20 -mx-3 -mb-3 px-3 pb-3 rounded-b-lg">
              <p className="text-xs text-yellow-400">⚠️ {warning}</p>
            </div>
          )}
        </div>
      }
    />
  );
}
