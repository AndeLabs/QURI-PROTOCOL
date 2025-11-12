import { validateRuneName, validateSymbol, formatBTC, shortenAddress } from '@/lib/utils';

describe('validateRuneName', () => {
  it('should accept valid rune names', () => {
    expect(validateRuneName('BITCOIN')).toBeNull();
    expect(validateRuneName('BITCOIN•RUNE')).toBeNull();
    expect(validateRuneName('A')).toBeNull();
    expect(validateRuneName('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBeNull(); // 26 chars
  });

  it('should reject invalid rune names', () => {
    expect(validateRuneName('')).toBeTruthy();
    expect(validateRuneName('bitcoin')).toBeTruthy(); // lowercase
    expect(validateRuneName('BITCOIN RUNE')).toBeTruthy(); // space instead of spacer
    expect(validateRuneName('•BITCOIN')).toBeTruthy(); // starts with spacer
    expect(validateRuneName('BITCOIN•')).toBeTruthy(); // ends with spacer
    expect(validateRuneName('BITCOIN••RUNE')).toBeTruthy(); // consecutive spacers
    expect(validateRuneName('ABCDEFGHIJKLMNOPQRSTUVWXYZ1')).toBeTruthy(); // > 26 chars
  });
});

describe('validateSymbol', () => {
  it('should accept valid symbols', () => {
    expect(validateSymbol('BTC')).toBeNull();
    expect(validateSymbol('A')).toBeNull();
    expect(validateSymbol('ABCD')).toBeNull();
    expect(validateSymbol('ABC1')).toBeNull();
  });

  it('should reject invalid symbols', () => {
    expect(validateSymbol('')).toBeTruthy();
    expect(validateSymbol('ABCDE')).toBeTruthy(); // > 4 chars
    expect(validateSymbol('btc')).toBeTruthy(); // lowercase
    expect(validateSymbol('AB-C')).toBeTruthy(); // special char
  });
});

describe('formatBTC', () => {
  it('should format satoshis to BTC', () => {
    expect(formatBTC(100_000_000)).toBe('1.00000000');
    expect(formatBTC(50_000_000)).toBe('0.50000000');
    expect(formatBTC(1)).toBe('0.00000001');
    expect(formatBTC(0)).toBe('0.00000000');
  });

  it('should handle bigint', () => {
    expect(formatBTC(BigInt(100_000_000))).toBe('1.00000000');
  });
});

describe('shortenAddress', () => {
  it('should shorten long addresses', () => {
    const address = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
    expect(shortenAddress(address)).toBe('bc1p...3297');
    expect(shortenAddress(address, 6)).toBe('bc1p5d...g3297');
  });

  it('should not shorten short addresses', () => {
    const shortAddr = 'bc1p5d7r';
    expect(shortenAddress(shortAddr)).toBe(shortAddr);
  });
});
