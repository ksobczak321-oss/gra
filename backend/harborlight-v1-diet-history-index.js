// Derived metadata for one atomic model advance. Nothing is attached to a
// person or saved world. Callers invalidate the index before external row
// mutations; array replacement / length changes are also detected here.
const DAY_MS = 86400 * 1000;

function indexedHeap(key, slot) {
  const rows = [];
  const before = (a, b) => key(a) < key(b) || key(a) === key(b) && a.order < b.order;
  function swap(a, b) {
    const value = rows[a]; rows[a] = rows[b]; rows[b] = value;
    rows[a][slot] = a; rows[b][slot] = b;
  }
  function up(index) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!before(rows[index], rows[parent])) break;
      swap(index, parent); index = parent;
    }
    return index;
  }
  function down(index) {
    for (;;) {
      const left = index * 2 + 1, right = left + 1;
      let next = index;
      if (left < rows.length && before(rows[left], rows[next])) next = left;
      if (right < rows.length && before(rows[right], rows[next])) next = right;
      if (next === index) return;
      swap(index, next); index = next;
    }
  }
  return {
    get size() { return rows.length; },
    first: () => rows[0],
    add(node) { node[slot] = rows.length; rows.push(node); up(node[slot]); },
    update(node) { if (node[slot] >= 0) down(up(node[slot])); },
    remove(node) {
      const index = node[slot];
      if (index < 0) return;
      const last = rows.pop(); node[slot] = -1;
      if (index < rows.length) { rows[index] = last; last[slot] = index; down(up(index)); }
    }
  };
}

function dataValue(row, key, optional = false) {
  const descriptor = Object.getOwnPropertyDescriptor(row, key);
  return !descriptor ? optional : Object.hasOwn(descriptor, 'value') && descriptor.writable;
}

/**
 * Returns null without mutation for unsupported input. Initial rows do not
 * emit callbacks: consumers initialize their accumulator from that same array.
 * Hooks are trusted internal observers and must not mutate history or throw.
 * A false prune/write result likewise occurs before any mutation or hook.
 */
export function createHistoryIndex(person, {
  epsilon = 1e-8, isKnownResource = () => true,
  onAdd = () => {}, onRemove = () => {}, onChange = () => {}
} = {}) {
  if (!person || !dataValue(person, 'history') || !Array.isArray(person.history) ||
      !Object.isExtensible(person.history) || !dataValue(person.history, 'length') ||
      !Number.isFinite(epsilon) || epsilon < 0 ||
      typeof isKnownResource !== 'function' || typeof onAdd !== 'function' ||
      typeof onRemove !== 'function' || typeof onChange !== 'function') return null;
  let history = person.history, length = history.length, detached = false, sequence = 0;
  const seen = new Set();
  // Validate the complete input before constructing metadata or calling hooks.
  // Normalized rows have finite satiety/time and primitive resources. Legacy
  // missing/nonfinite `from` values are retained and never partially pruned.
  for (const row of history) {
    if (!row || typeof row !== 'object' || seen.has(row) ||
        !dataValue(row, 'at') || !dataValue(row, 'satiety') || !dataValue(row, 'resource') ||
        !dataValue(row, 'from', true) || !Number.isFinite(row.at) ||
        !Number.isFinite(row.satiety) || row.satiety < 0 || typeof row.resource !== 'string' ||
        !isKnownResource(row.resource) ||
        !(row.from === undefined || row.from === null || typeof row.from === 'number')) return null;
    seen.add(row);
  }
  const expiry = indexedHeap(node => node.row.at, 'expiryIndex');
  const starts = indexedHeap(node => node.row.from, 'startIndex');
  const active = new Set(), tails = new Map();
  function addNode(row) {
    const previous = tails.get(row.resource) || null;
    const node = {row, order: sequence++, expiryIndex: -1, startIndex: -1, previous, next: null};
    if (previous) previous.next = node;
    tails.set(row.resource, node);
    expiry.add(node);
    if (Number.isFinite(row.from)) starts.add(node);
    return node;
  }
  for (const row of history) addNode(row);
  function removeNode(node) {
    expiry.remove(node); starts.remove(node); active.delete(node);
    if (node.previous) node.previous.next = node.next;
    if (node.next) node.next.previous = node.previous;
    else if (node.previous) tails.set(node.row.resource, node.previous);
    else tails.delete(node.row.resource);
  }
  const isCurrent = () => person.history === history && history.length === length;
  return {
    isCurrent,
    prune(now) {
      if (!isCurrent() || !Number.isFinite(now)) return false;
      const cutoff = now - DAY_MS, expires = cutoff + epsilon, removed = [];
      while (expiry.first() && expiry.first().row.at <= expires) {
        const node = expiry.first(); removeNode(node); removed.push(node.row);
      }
      // Match the reference's first filter allocation, so any pre-scope array
      // remains detached. Within this atomic scope no observer sees the omitted
      // subsequent empty filter allocations; row identities/order stay exact.
      if (!detached || removed.length) {
        person.history = history = history.filter(row => row.at > cutoff + epsilon);
        length = history.length; detached = true;
      }
      for (const row of removed) onRemove(row);
      while (starts.first() && starts.first().row.from < cutoff) {
        const node = starts.first(); starts.remove(node); active.add(node);
      }
      for (const node of active) {
        const row = node.row;
        // Cutoffs can move backwards between internal phases. Never restore
        // expired rows or grow an interval: use the original condition and
        // original per-row IEEE operations, including their operand order.
        if (Number.isFinite(row.from) && row.from < cutoff && row.at > cutoff) {
          const previous = row.satiety;
          row.satiety *= Math.max(0, (row.at - cutoff) / (row.at - row.from));
          row.from = cutoff;
          onChange(row, previous, row.satiety);
        }
      }
      return true;
    },
    write(resource, points, from, at) {
      if (!isCurrent()) return false;
      if (points <= epsilon) return true;
      if (!Number.isFinite(points) || !Number.isFinite(from) || !Number.isFinite(at) ||
          typeof resource !== 'string' || !isKnownResource(resource)) return false;
      const node = tails.get(resource), previous = node?.row || null;
      const duration = at - from, oldDuration = previous ? previous.at - previous.from : 0;
      const rate = points / duration, oldRate = oldDuration > 0 ? previous.satiety / oldDuration : NaN;
      if (previous && Number.isFinite(previous.from) && Math.abs(previous.at - from) < .01 &&
          Math.abs(rate - oldRate) <= 1e-10 * Math.max(1, rate, oldRate)) {
        const before = previous.satiety, after = before + points;
        if (!Number.isFinite(after)) return false;
        previous.at = at; previous.satiety += points;
        expiry.update(node);
        onChange(previous, before, previous.satiety);
      } else {
        const row = {from, at, resource, satiety: points};
        history.push(row); length++;
        addNode(row); onAdd(row);
      }
      return true;
    },
    debugStats() {
      return {rows: length, expiryEntries: expiry.size, startEntries: starts.size,
        activeEntries: active.size, resources: tails.size};
    }
  };
}
