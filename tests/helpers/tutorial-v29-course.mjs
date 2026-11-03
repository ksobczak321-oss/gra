// The same real command runner now exercises the new natural-wait branch.
import { runTutorialV28 } from './tutorial-v28-course.mjs';
export const runTutorialV29 = (options = {}) => runTutorialV28({ ...options, curriculum: 7 });
