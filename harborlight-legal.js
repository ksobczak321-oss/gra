// These versions identify the exact draft documents shown before registration.
// Necessary service processing uses its own legal basis, not a forced GDPR consent.
export const LEGAL_DOCUMENTS = Object.freeze({
  terms: Object.freeze({ version: '2026-10-31-draft2', href: 'harborlight-terms.html', title: 'Regulamin gry' }),
  privacy: Object.freeze({ version: '2026-10-31-draft2', href: 'harborlight-privacy.html', title: 'Polityka prywatności' }),
  draft: true
});
export function validLegalAcceptance(value) {
  return value?.termsAccepted === true && value?.privacyAcknowledged === true &&
    value.termsVersion === LEGAL_DOCUMENTS.terms.version && value.privacyVersion === LEGAL_DOCUMENTS.privacy.version;
}
export function legalAcceptance(termsAccepted, privacyAcknowledged) {
  return { termsAccepted: termsAccepted === true, privacyAcknowledged: privacyAcknowledged === true,
    termsVersion: LEGAL_DOCUMENTS.terms.version, privacyVersion: LEGAL_DOCUMENTS.privacy.version };
}
