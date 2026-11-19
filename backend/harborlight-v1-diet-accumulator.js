// Scope-owned numerical index. Never attach this object (or its BigInts) to a
// saved world. It certifies only the integer classification; public shares keep
// their original, ordered Float64 aggregation.
const SCALE_BITS = 256;
const SCALE = 2 ** -SCALE_BITS;
const MAX = Number.MAX_SAFE_INTEGER;
const MANTISSA_MASK = (1n << 52n) - 1n;
const SIGN_BIT = 1n << 63n;
const bits = new DataView(new ArrayBuffer(8));

function nextUp(value) {
  if (Number.isNaN(value) || value === Infinity) return value;
  if (value === 0) return Number.MIN_VALUE;
  bits.setFloat64(0, value);
  const encoded = bits.getBigUint64(0);
  bits.setBigUint64(0, value > 0 ? encoded + 1n : encoded - 1n);
  return bits.getFloat64(0);
}
function nextDown(value) {
  if (Number.isNaN(value) || value === -Infinity) return value;
  if (value === 0) return -Number.MIN_VALUE;
  bits.setFloat64(0, value);
  const encoded = bits.getBigUint64(0);
  bits.setBigUint64(0, value > 0 ? encoded - 1n : encoded + 1n);
  return bits.getFloat64(0);
}

function unitsOf(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX) return null;
  if (value === 0) return 0n;
  bits.setFloat64(0, value);
  const encoded = bits.getBigUint64(0);
  if (encoded & SIGN_BIT) return null;
  const exponent = Number((encoded >> 52n) & 0x7ffn);
  const significand = (encoded & MANTISSA_MASK) | (exponent ? 1n << 52n : 0n);
  const shift = (exponent ? exponent - 1075 : -1074) + SCALE_BITS;
  if (shift >= 0) return significand << BigInt(shift);
  const divisor = 1n << BigInt(-shift);
  return significand % divisor === 0n ? significand / divisor : null;
}

// Higham's gamma_n encloses every ordered, nonnegative Float64 sum. Using
// Number.EPSILON (2u) instead of u and rounding every bound outwards is
// conservative. Supported positive terms are >=2^-256: no underflow occurs.
function gamma(count) {
  if (!Number.isSafeInteger(count) || count < 0) return null;
  if (!count) return 0;
  const error = nextUp(count * Number.EPSILON);
  if (!(error < .25)) return null;
  const denominator = nextDown(1 - error);
  const upper = nextUp(error / denominator);
  return Number.isFinite(upper) ? upper : null;
}
function roundedSumBounds(low, high, count) {
  if (high === 0) return [0, 0];
  const error = gamma(count);
  if (error === null) return null;
  const lowerFactor = Math.max(0, nextDown(1 - error));
  const upperFactor = nextUp(1 + error);
  const lower = Math.max(0, nextDown(low * lowerFactor));
  const upper = nextUp(high * upperFactor);
  return Number.isFinite(upper) ? [lower, upper] : null;
}
function resourceBounds(entry) {
  if (entry.bounds) return entry.bounds;
  if (entry.sum === 0n) return (entry.bounds = [0, 0]);
  const value = Number(entry.sum) * SCALE;
  if (!(value >= SCALE) || !Number.isFinite(value)) return null;
  // A sole input is already a Float64 and is unchanged by 0 + input.
  const bounds = entry.count === 1 ? [value, value]
    : roundedSumBounds(Math.max(0, nextDown(value)), nextUp(value), entry.count);
  // The original finite(previous) clamps each prefix at MAX. Nonnegative
  // prefixes cannot exceed their final unclamped sum; this proves the clamp
  // inactive. If it cannot be proved, use the original row-by-row algorithm.
  if (!bounds || bounds[1] > MAX) return null;
  return (entry.bounds = bounds);
}

/**
 * Exact real sums of the CURRENT stored Float64 row values, in 2^-256 units.
 * Callers supply coherent add/remove/replace hooks and retain the old ordered
 * history. Unsupported input makes this instance fall back until rebuilt.
 */
export function createDietAccumulator(rows = []) {
  const resources = new Map();
  let supported = true, revision = 0, cached = null;
  const fail = () => { supported = false; cached = null; return false; };
  const validResource = resource => typeof resource === 'string' && resource.length > 0 && resource !== '__proto__';
  const changed = entry => { if (entry) entry.bounds = null; revision++; cached = null; return true; };

  function add(resource, value) {
    if (!supported) return false;
    const units = unitsOf(value);
    if (!validResource(resource) || units === null) return fail();
    let entry = resources.get(resource);
    if (!entry) { entry = { sum: 0n, count: 0, bounds: null }; resources.set(resource, entry); }
    if (!Number.isSafeInteger(entry.count + 1)) return fail();
    entry.sum += units; entry.count++;
    return changed(entry);
  }
  function remove(resource, value) {
    if (!supported) return false;
    const units = unitsOf(value), entry = resources.get(resource);
    if (!validResource(resource) || units === null || !entry || entry.sum < units ||
        (entry.count === 1 && entry.sum !== units)) return fail();
    entry.sum -= units; entry.count--;
    if (!entry.count) resources.delete(resource);
    return changed(entry);
  }
  function replace(resource, oldValue, newValue) {
    if (!supported) return false;
    const oldUnits = unitsOf(oldValue), newUnits = unitsOf(newValue), entry = resources.get(resource);
    if (!validResource(resource) || oldUnits === null || newUnits === null || !entry || entry.sum < oldUnits ||
        (entry.count === 1 && entry.sum !== oldUnits)) return fail();
    entry.sum += newUnits - oldUnits;
    return changed(entry);
  }
  function typeCount(epsilon, shareFraction = .2) {
    if (!supported || typeof epsilon !== 'number' || !Number.isFinite(epsilon) || epsilon < 0 ||
        typeof shareFraction !== 'number' || !Number.isFinite(shareFraction) || shareFraction < 0 || shareFraction > 1) return null;
    if (cached?.revision === revision && cached.epsilon === epsilon && cached.fraction === shareFraction) return cached.value;
    const remember = value => { cached = { revision, epsilon, fraction: shareFraction, value }; return value; };
    if (!resources.size) return remember(0);
    let low = 0, high = 0;
    const shares = [];
    for (const entry of resources.values()) {
      const bounds = resourceBounds(entry);
      if (!bounds) return remember(null);
      shares.push(bounds);
      low = Math.max(0, nextDown(low + bounds[0]));
      high = nextUp(high + bounds[1]);
    }
    // The outward endpoint sum encloses the exact sum of the old per-resource
    // Float64 shares; gamma_m then covers ANY Object.values addition order.
    const total = roundedSumBounds(low, high, resources.size);
    if (!total) return remember(null);
    if (total[1] <= epsilon) return remember(0);
    if (!(total[0] > epsilon)) return remember(null);
    const thresholdLow = Math.max(0, nextDown(total[0] * shareFraction));
    const thresholdHigh = nextUp(total[1] * shareFraction);
    if (!Number.isFinite(thresholdHigh)) return remember(null);
    let count = 0;
    for (const [shareLow, shareHigh] of shares) {
      const leftLow = Math.max(0, nextDown(shareLow + epsilon));
      const leftHigh = nextUp(shareHigh + epsilon);
      if (!Number.isFinite(leftHigh)) return remember(null);
      // These enclose the actual RN(share + EPS) >= RN(total * fraction),
      // including both final-operation roundings, rather than a real-number
      // reformulation. An uncertain comparison never supplies a fast answer.
      if (leftLow >= thresholdHigh) count++;
      else if (!(leftHigh < thresholdLow)) return remember(null);
    }
    return remember(count);
  }

  if (!Array.isArray(rows)) fail();
  else for (const row of rows) {
    if (!row || typeof row !== 'object' || !add(row.resource, row.satiety)) { fail(); break; }
  }
  return Object.freeze({ add, remove, replace, typeCount });
}
