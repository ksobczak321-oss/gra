// Isolated legacy-course fixture policy for Node-generated browser worlds.
// This preload is never imported by product code or a default-experience test.
// Change the same single declaration as the browser fixture before importing
// the actual model; never edit an already-created world or its campaign data.
import { registerHooks } from 'node:module';

const declaration = 'export const PRACTICAL_TUTORIAL_ENABLED = false;';
registerHooks({
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:' || !parsed.pathname.endsWith('/harborlight-v1-learning-policy.js')) return loaded;
    const source = typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source).toString('utf8');
    if (source.split(declaration).length !== 2) throw new Error('Expected one disabled practical-course fixture declaration');
    return { ...loaded, source: source.replace(declaration, 'export const PRACTICAL_TUTORIAL_ENABLED = true;') };
  }
});
