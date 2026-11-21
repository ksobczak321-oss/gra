// The practical course is retained for a possible return. Exercise its complete
// invitation policy in an isolated test module; current-default policy has its
// own tests and no production query parameter or global override is introduced.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function legacyEngagementModule() {
  const directory = await mkdtemp(join(tmpdir(), 'harborlight-legacy-engagement-'));
  try {
    const policy = await readFile(new URL('../../harborlight-v1-learning-policy.js', import.meta.url), 'utf8');
    const flag = 'export const PRACTICAL_TUTORIAL_ENABLED = false;';
    if (policy.split(flag).length !== 2) throw new Error('Expected one unchanged build-time practical course flag');
    await writeFile(join(directory, 'policy.mjs'), policy.replace(flag, 'export const PRACTICAL_TUTORIAL_ENABLED = true;'));
    const source = await readFile(new URL('../../harborlight-v1-engagement.js', import.meta.url), 'utf8');
    const dependency = /from '\.\/harborlight-v1-learning-policy\.js\?v=frontend-v32-\d+'/;
    if (!dependency.test(source)) throw new Error('Expected the pure practical course policy import');
    await writeFile(join(directory, 'engagement.mjs'), source.replace(dependency, "from './policy.mjs'"));
    return await import(pathToFileURL(join(directory, 'engagement.mjs')).href);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
