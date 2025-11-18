/**
 * Design System - Animation Tokens
 * Motion design and transitions
 */

export const animations = {
  // Durations (in milliseconds)
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
  },

  // Timing Functions (Easing)
  easing: {
    linear: 'linear',
    ease: 'ease',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',

    // Custom cubic-bezier curves
    'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    'smooth-in': 'cubic-bezier(0.4, 0.0, 1, 1)',
    'smooth-out': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Keyframe Animations
  keyframes: {
    // Fade
    fadeIn: {
      name: 'fadeIn',
      keyframes: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,
    },
    fadeOut: {
      name: 'fadeOut',
      keyframes: `
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `,
    },

    // Slide
    slideInUp: {
      name: 'slideInUp',
      keyframes: `
        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `,
    },
    slideInDown: {
      name: 'slideInDown',
      keyframes: `
        @keyframes slideInDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `,
    },
    slideInLeft: {
      name: 'slideInLeft',
      keyframes: `
        @keyframes slideInLeft {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `,
    },
    slideInRight: {
      name: 'slideInRight',
      keyframes: `
        @keyframes slideInRight {
          from {
            transform: translateX(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `,
    },

    // Scale
    scaleIn: {
      name: 'scaleIn',
      keyframes: `
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `,
    },
    scaleOut: {
      name: 'scaleOut',
      keyframes: `
        @keyframes scaleOut {
          from {
            transform: scale(1);
            opacity: 1;
          }
          to {
            transform: scale(0.9);
            opacity: 0;
          }
        }
      `,
    },

    // Spin
    spin: {
      name: 'spin',
      keyframes: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `,
    },

    // Pulse
    pulse: {
      name: 'pulse',
      keyframes: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `,
    },

    // Bounce
    bounce: {
      name: 'bounce',
      keyframes: `
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `,
    },

    // Shake
    shake: {
      name: 'shake',
      keyframes: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
      `,
    },

    // Shimmer (loading effect)
    shimmer: {
      name: 'shimmer',
      keyframes: `
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `,
    },
  },

  // Predefined animation combinations
  presets: {
    fadeIn: 'fadeIn 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    fadeOut: 'fadeOut 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slideInUp: 'slideInUp 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slideInDown: 'slideInDown 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slideInLeft: 'slideInLeft 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slideInRight: 'slideInRight 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    scaleIn: 'scaleIn 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    scaleOut: 'scaleOut 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    spin: 'spin 1000ms linear infinite',
    pulse: 'pulse 2000ms cubic-bezier(0.4, 0.0, 0.6, 1) infinite',
    bounce: 'bounce 1000ms infinite',
    shake: 'shake 500ms cubic-bezier(0.36, 0.07, 0.19, 0.97)',
    shimmer: 'shimmer 2000ms ease-in-out infinite',
  },

  // Transition presets
  transitions: {
    all: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    colors: 'background-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1), color 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',

    // Specific component transitions
    button: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    hover: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    focus: 'all 100ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    modal: 'opacity 200ms cubic-bezier(0.4, 0.0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

export type AnimationToken = keyof typeof animations;
