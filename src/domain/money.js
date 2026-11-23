// Decimal strings at trust boundaries; integer paise internally. Half away from zero.
export function paise(value) {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('invalid_money');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('money_overflow');
  return Number(negative ? -result : result);
}

export function roundRatio(amount, numerator, denominator) {
  if (![amount, numerator, denominator].every(Number.isSafeInteger) || denominator <= 0) throw new Error('invalid_ratio');
  const product = BigInt(amount) * BigInt(numerator);
  const sign = product < 0n ? -1n : 1n;
  const absolute = product * sign;
  const result = sign * ((absolute * 2n + BigInt(denominator)) / (2n * BigInt(denominator)));
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('money_overflow');
  return Number(result);
}

export function safeSum(values) {
  if (!values.every(Number.isSafeInteger)) throw new Error('invalid_paise');
  const sum = values.reduce((a, b) => a + BigInt(b), 0n);
  if (sum > BigInt(Number.MAX_SAFE_INTEGER) || sum < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('money_overflow');
  return Number(sum);
}
