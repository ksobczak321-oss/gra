// Shared by the browser and the API; this module has no Node/cloud dependencies.
// These rules concern island names, never account logins, nicknames or chat.
const forbiddenCharacters = /[<>\p{Cc}\p{Cf}]/u;
const vulgarWord = /^(?:s?kurw[a-z]*|chuj[a-z]*|huj[a-z]*|(?:wy|po|za|prze|roz|od)?jeb(?:ac|any|ana|ane|ani|ania|anie|al[a-z]*|i[a-z]*)|(?:wy|s|za|po|do|roz|na)?pierd(?:ol[a-z]*|al[a-z]*)|pizd[a-z]*|cip(?:a|y|ie|e|o|ami|ach)|dup(?:a|y|ie|e|o|ami|ach)|fuck[a-z]*|motherfuck[a-z]*|shit[a-z]*|bullshit[a-z]*|bitch[a-z]*|cunt[a-z]*|asshole[a-z]*|dick(?:s|head[a-z]*)?|puss(?:y|ies))$/;
const leet = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

export function containsVulgarIslandWord(value) {
  if (typeof value !== 'string') return false;
  // Keep word boundaries (Scunthorpe, Sussex and Cassidy are ordinary names),
  // while covering accents, common substitutions and names such as Sh1tBay.
  const normalize = source => source.normalize('NFKD')
    .replace(/\p{M}/gu, '').replace(/ł/gi, 'l').toLowerCase()
    .replace(/[013457@$!]/g, letter => leet[letter]);
  for (const source of [value, value.replace(/([a-z])([A-Z])/g, '$1 $2')]) {
    const words = normalize(source).match(/[a-z]+/g) || [];
    if (words.some(word => vulgarWord.test(word))) return true;
    // Also reject explicit spelling with separators: k.u.r.w.a / f_u_c_k.
    let spelled = '';
    for (const word of [...words, '']) {
      if (word.length === 1) spelled += word;
      else {
        if (spelled.length > 1 && vulgarWord.test(spelled)) return true;
        spelled = '';
      }
    }
  }
  return false;
}

function identity(value, minimum, maximum, checkVocabulary) {
  if (typeof value !== 'string' || forbiddenCharacters.test(value)) return {
    ok: false, name: '', reason: 'characters', message: 'Island names cannot contain control characters or angle brackets.'
  };
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if ([...name].length < minimum || [...name].length > maximum) return {
    ok: false, name: '', reason: 'length', message: `Choose an island name with ${minimum}–${maximum} characters.`
  };
  if (checkVocabulary && containsVulgarIslandWord(name)) return {
    ok: false, name: '', reason: 'profanity', message: 'Choose an island name without vulgar Polish or English words.'
  };
  return { ok: true, name, reason: '', message: 'Your island name has been saved.' };
}

export const validateIslandName = (value, maximum = 40) => identity(value, 3, maximum, true);

// Reading a previous save is not a new naming action. Preserve older 2-character
// names and vocabulary, so an autosave/deploy cannot rename or reset a world.
export const validateStoredIslandName = (value, maximum = 40) => identity(value, 2, maximum, false);
