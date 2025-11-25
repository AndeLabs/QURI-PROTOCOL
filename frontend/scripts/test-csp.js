#!/usr/bin/env node
/**
 * CSP Testing Script
 *
 * This script tests the Content Security Policy configuration
 * to ensure it's properly set up for production.
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure nonce for CSP
 */
function generateNonce() {
  const array = crypto.randomBytes(16);
  return array.toString('base64');
}

/**
 * Build CSP directives based on environment
 */
function buildCSPDirectives(nonce, isDev = false) {
  const directives = {
    'default-src': ["'self'"],

    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],

    'style-src': [
      "'self'",
      "'unsafe-inline'",
    ],

    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],

    'font-src': [
      "'self'",
      'data:',
    ],

    'connect-src': [
      "'self'",
      'https://ic0.app',
      'https://*.ic0.app',
      'https://icp0.io',
      'https://*.icp0.io',
      'https://icp-api.io',
      'https://*.icp-api.io',
      'https://*.internetcomputer.org',
      'wss://ic0.app',
      'wss://*.ic0.app',
      'https://mempool.space',
      'https://api.hiro.so',
      'https://api.pinata.cloud',
      'https://gateway.pinata.cloud',
      'https://ipfs.io',
      'https://cloudflare-ipfs.com',
      'https://dweb.link',
      'https://min-api.cryptocompare.com',
      ...(isDev ? [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:4943',
        'ws://localhost:8000',
        'ws://127.0.0.1:8000',
      ] : []),
    ],

    'frame-src': [
      "'self'",
      'https://ic0.app',
      'https://*.ic0.app',
      'https://identity.ic0.app',
    ],

    'worker-src': [
      "'self'",
      'blob:',
    ],

    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Validation function to check if CSP is properly configured
 */
function validateCSP(csp) {
  const warnings = [];

  if (process.env.NODE_ENV === 'production') {
    if (csp.includes("'unsafe-eval'")) {
      warnings.push("CSP contains 'unsafe-eval' in production - this weakens XSS protection");
    }

    if (csp.includes("'unsafe-inline'") && !csp.includes('style-src')) {
      warnings.push("CSP contains 'unsafe-inline' outside of style-src - consider using nonces");
    }
  }

  const requiredDirectives = ['default-src', 'script-src', 'connect-src'];
  for (const directive of requiredDirectives) {
    if (!csp.includes(directive)) {
      warnings.push(`CSP missing recommended directive: ${directive}`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

function main() {
  console.log('🔒 Testing Content Security Policy Configuration\n');

  // Test 1: Generate nonce
  console.log('Test 1: Nonce Generation');
  const nonce = generateNonce();
  console.log(`✅ Generated nonce: ${nonce.substring(0, 20)}...`);
  console.log(`   Length: ${nonce.length} characters\n`);

  // Test 2: Development CSP
  console.log('Test 2: Development CSP');
  const devCSP = buildCSPDirectives(nonce, true);
  console.log('Development CSP:');
  console.log(devCSP.split('; ').map(d => `  - ${d}`).join('\n'));
  const devValidation = validateCSP(devCSP);
  console.log(`\nValidation: ${devValidation.valid ? '✅ Valid' : '⚠️  Has warnings'}`);
  if (devValidation.warnings.length > 0) {
    console.log('Warnings:');
    devValidation.warnings.forEach(w => console.log(`  - ${w}`));
  }
  console.log();

  // Test 3: Production CSP
  console.log('Test 3: Production CSP');
  const prodCSP = buildCSPDirectives(nonce, false);
  console.log('Production CSP:');
  console.log(prodCSP.split('; ').map(d => `  - ${d}`).join('\n'));
  const prodValidation = validateCSP(prodCSP);
  console.log(`\nValidation: ${prodValidation.valid ? '✅ Valid' : '⚠️  Has warnings'}`);
  if (prodValidation.warnings.length > 0) {
    console.log('Warnings:');
    prodValidation.warnings.forEach(w => console.log(`  - ${w}`));
  }
  console.log();

  // Test 4: Check for security improvements
  console.log('Test 4: Security Improvements');
  const hasUnsafeEval = prodCSP.includes("'unsafe-eval'");
  const hasNonce = prodCSP.includes(`'nonce-${nonce}'`);
  const hasFrameAncestors = prodCSP.includes('frame-ancestors');
  const hasUpgradeInsecure = prodCSP.includes('upgrade-insecure-requests');

  console.log(`  ${hasUnsafeEval ? '❌' : '✅'} No unsafe-eval in production: ${!hasUnsafeEval}`);
  console.log(`  ${hasNonce ? '✅' : '❌'} Uses nonce-based scripts: ${hasNonce}`);
  console.log(`  ${hasFrameAncestors ? '✅' : '❌'} Prevents iframe embedding: ${hasFrameAncestors}`);
  console.log(`  ${hasUpgradeInsecure ? '✅' : '❌'} Upgrades insecure requests: ${hasUpgradeInsecure}`);
  console.log();

  // Test 5: Check required domains
  console.log('Test 5: Required Domains');
  const requiredDomains = [
    'https://ic0.app',
    'https://*.ic0.app',
    'https://identity.ic0.app',
    'https://mempool.space',
    'https://api.hiro.so',
  ];

  requiredDomains.forEach(domain => {
    const included = prodCSP.includes(domain);
    console.log(`  ${included ? '✅' : '❌'} ${domain}: ${included ? 'included' : 'missing'}`);
  });
  console.log();

  // Summary
  console.log('📊 Summary:');
  const allPassed = !hasUnsafeEval && hasNonce && hasFrameAncestors &&
                    requiredDomains.every(d => prodCSP.includes(d));

  if (allPassed) {
    console.log('✅ All CSP tests passed! Your production CSP is secure.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review the configuration above.');
    process.exit(1);
  }
}

main();
