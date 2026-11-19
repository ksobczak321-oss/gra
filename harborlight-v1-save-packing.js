// Serialization only: packAdventureSave receives a detached world snapshot.
// Original implementation of the textbook LZW dictionary algorithm. No third-
// party code, binary dependencies, or runtime networking are used here.
export const ADVENTURE_PACKING_RULES = Object.freeze({
  version: 1, codec: 'hl-lzw16-sections-v1', thresholdBytes: 65536,
  maximumUncompressedBytes: 4000000, maximumDictionaryEntries: 65536
});
const MAX = ADVENTURE_PACKING_RULES.maximumUncompressedBytes;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const invalid = () => Object.assign(new Error('Uszkodzony lub nieobsługiwany zapis przygód.'), { code: 'invalid-cloud-data' });
const width = index => Math.min(16, Math.max(9, Math.ceil(Math.log2(256 + index))));
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function base64(bytes) {
  const pieces = [];
  for (let at = 0; at < bytes.length; at += 16384) pieces.push(String.fromCharCode(...bytes.subarray(at, at + 16384)));
  return btoa(pieces.join(''));
}
function unbase64(value) {
  // Canonical alphabet/padding and a hard input bound are checked before atob.
  if (typeof value !== 'string' || value.length > Math.ceil((MAX * 2 + 8) / 3) * 4 ||
      value.length < 12 || value.length%4!==0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw invalid();
  let binary;
  try { binary = atob(value); } catch { throw invalid(); }
  // atob accepts nonzero padding bits; rejecting them gives one canonical form.
  if (btoa(binary) !== value) throw invalid();
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}
function compress(bytes) {
  const codes = new Uint16Array(bytes.length), dictionary = new Map();
  let prefix = bytes[0], next = 256, count = 0;
  for (let at = 1; at < bytes.length; at++) {
    const byte = bytes[at], key = prefix * 256 + byte, existing = dictionary.get(key);
    if (existing !== undefined) prefix = existing;
    else {
      codes[count++] = prefix;
      if (next < 65536) dictionary.set(key, next++);
      prefix = byte;
    }
  }
  codes[count++] = prefix;
  let bitLength = 0;
  for (let at = 0; at < count; at++) bitLength += width(at);
  const packed = new Uint8Array(8 + Math.ceil(bitLength / 8)), header = new DataView(packed.buffer);
  header.setUint32(0, count); header.setUint32(4, crc32(bytes));
  let bucket = 0, bits = 0, offset = 8;
  for (let at = 0; at < count; at++) {
    const size = width(at); bucket = (bucket << size) | codes[at]; bits += size;
    while (bits >= 8) { bits -= 8; packed[offset++] = (bucket >>> bits) & 255; }
    bucket &= (1 << bits) - 1;
  }
  if (bits) packed[offset] = bucket << (8 - bits);
  return packed;
}
function decompress(packed, expectedBytes) {
  if (packed.length < 10) throw invalid();
  const header = new DataView(packed.buffer, packed.byteOffset, packed.byteLength), count = header.getUint32(0), checksum = header.getUint32(4);
  if (!count || count > expectedBytes) throw invalid();
  let bitLength = 0;
  for (let at = 0; at < count; at++) bitLength += width(at);
  if (packed.length !== 8 + Math.ceil(bitLength / 8)) throw invalid();
  // Prefix/suffix arrays avoid expanding dictionary phrases into strings. The
  // only growing output buffer is the explicitly bounded declared UTF-8 size.
  const prefixes = new Int32Array(65536), suffixes = new Uint8Array(65536), lengths = new Uint32Array(65536);
  for (let code = 0; code < 256; code++) { prefixes[code] = -1; suffixes[code] = code; lengths[code] = 1; }
  const output = new Uint8Array(expectedBytes);
  let next = 256, previous = -1, written = 0, offset = 8, bucket = 0, bits = 0;
  function emit(code) {
    const length = lengths[code];
    if (!length || written + length > expectedBytes) throw invalid();
    let at = written + length - 1, cursor = code;
    while (cursor >= 256) { output[at--] = suffixes[cursor]; cursor = prefixes[cursor]; }
    output[at] = cursor;
    const first = output[written]; written += length; return first;
  }
  for (let at = 0; at < count; at++) {
    const size = width(at);
    while (bits < size) { bucket = (bucket << 8) | packed[offset++]; bits += 8; }
    bits -= size; const code = (bucket >>> bits) & ((1 << size) - 1); bucket &= (1 << bits) - 1;
    let first;
    if (code < next) first = emit(code);
    else if (code === next && previous >= 0 && next < 65536) {
      first = emit(previous); if (written >= expectedBytes) throw invalid(); output[written++] = first;
    } else throw invalid();
    if (previous >= 0 && next < 65536) { prefixes[next] = previous; suffixes[next] = first; lengths[next] = lengths[previous] + 1; next++; }
    previous = code;
  }
  if (written !== expectedBytes || bucket !== 0 || crc32(output) !== checksum) throw invalid();
  return output;
}
const fields = Object.freeze(['adventures', 'expeditionHour', 'adventureBudget', 'effectNotificationState', 'provisions']);
/** Mutates only the caller's serialization clone. Provisions retain every
 * existing compact-history row and number; compression changes only transport.
 * Older readers reject the explicitly named new section before normalization.
 * Account ledgers are packed only on the mother to keep daughter saves separate. */
export function packAdventureSave(world) {
  if (!plain(world)) return world;
  if (own(world, 'adventuresPacked')) {
    unpackAdventureSave(world);return world;
  }
  if (!plain(world.adventures)) return world;
  if(world.adventures.version!==1)throw invalid();
  const account=world.islandRole!=='daughter'&&(!world.islandId||world.islandId==='island-1');
  const packProvisions=plain(world.provisions)&&encoder.encode(JSON.stringify(world.provisions)).length>=ADVENTURE_PACKING_RULES.thresholdBytes;
  let sections=fields.filter(id=>plain(world[id])&&(id!=='provisions'||packProvisions)&&(id==='adventures'||id==='effectNotificationState'||id==='provisions'||account));
  let values=Object.fromEntries(sections.map(id=>[id,world[id]])), bytes=encoder.encode(JSON.stringify(values));
  // Preserve the previous accepted domain near the adventure expansion cap:
  // a large plain provisions section must not make an otherwise valid older
  // adventure-only stream exceed its unchanged four-million-byte boundary.
  if(bytes.length>MAX&&sections.includes('provisions')){
    sections=sections.filter(id=>id!=='provisions');values=Object.fromEntries(sections.map(id=>[id,world[id]]));bytes=encoder.encode(JSON.stringify(values));
  }
  if (bytes.length > MAX) throw invalid();
  if (bytes.length < ADVENTURE_PACKING_RULES.thresholdBytes) return world;
  const packed={version:1,codec:ADVENTURE_PACKING_RULES.codec,sections,data:base64(compress(bytes)),uncompressedBytes:bytes.length};
  if (encoder.encode(JSON.stringify(packed)).length >= bytes.length) return world;
  world.adventuresPacked=packed;for(const id of sections)delete world[id];
  return world;
}
/** Returns a new root only when packed data exists. Invalid data never resets play. */
export function unpackAdventureSave(raw) {
  if (!plain(raw) || !own(raw, 'adventuresPacked')) return raw;
  const packed=raw.adventuresPacked;
  if(!plain(packed)||packed.version!==1||packed.codec!==ADVENTURE_PACKING_RULES.codec||
     !Number.isSafeInteger(packed.uncompressedBytes)||packed.uncompressedBytes<1||packed.uncompressedBytes>MAX||
     !Array.isArray(packed.sections)||packed.sections.length<1||packed.sections.length>fields.length||packed.sections[0]!=='adventures'||
     packed.sections.some((id,index)=>!fields.includes(id)||packed.sections.indexOf(id)!==index||own(raw,id)))throw invalid();
  let values;
  try{values=JSON.parse(decoder.decode(decompress(unbase64(packed.data),packed.uncompressedBytes)));}catch{throw invalid();}
  if(!plain(values)||Object.keys(values).length!==packed.sections.length||packed.sections.some(id=>!plain(values[id]))||
     Object.keys(values).some(id=>!packed.sections.includes(id))||values.adventures.version!==1)throw invalid();
  const copy={...raw,...values};delete copy.adventuresPacked;return copy;
}

// Backend operations may update inventories without constructing the complete
// simulation model. Decode/re-encode each world at that boundary so a trade or
// account mutation never feeds an opaque provisions section into a normalizer.
// Neither helper mutates its input, including when a later daughter is invalid.
function mapSavedWorlds(raw, transform) {
  if (!plain(raw)) return raw;
  const world=transform(raw),group=world.archipelago;
  if (group?.version===2 && plain(group.islands)) {
    const entries=Object.entries(group.islands);
    if (entries.length>19) throw invalid();
    const islands=Object.fromEntries(entries.map(([id,child])=>[id,transform(child)]));
    if(world===raw && entries.every(([id,child])=>islands[id]===child)) return raw;
    return {...world,archipelago:{...group,islands}};
  }
  if (group?.version===1 && plain(group.secondIsland)) {
    const secondIsland=transform(group.secondIsland);
    return world===raw&&secondIsland===group.secondIsland?raw:{...world,archipelago:{...group,secondIsland}};
  }
  return world;
}
export const unpackArchipelagoSave = raw => mapSavedWorlds(raw,unpackAdventureSave);
export const packArchipelagoSave = raw => {
  const saved=mapSavedWorlds(raw,world=>plain(world)?packAdventureSave({...world}):world);
  // serializeArchipelago adds this envelope after compacting the mother. Keep
  // that same insertion order for exact-payload uncertain-commit recovery.
  if(plain(saved)&&own(saved,'archipelago')){
    const {archipelago,...world}=saved;return {...world,archipelago};
  }
  return saved;
};
