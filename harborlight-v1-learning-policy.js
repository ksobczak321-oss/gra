// Build-time availability of the preserved practical course. This changes no
// island flags, lesson history, rewards or stored advertising cooldowns.
export const PRACTICAL_TUTORIAL_ENABLED = false;

// The explicit option lets isolated tests exercise the retained course policy.
// Product callers use the build-time default; this is not a runtime switch.
export function practicalCourseBlocksMissions(state, { enabled = PRACTICAL_TUTORIAL_ENABLED } = {}) {
  if (!enabled) return false;
  const tutorial = state?.tutorial;
  return !(tutorial?.autoOpenDisabled === true || tutorial?.rewardDisabled === true || tutorial?.settled === true ||
    tutorial?.version && Object.values(tutorial.completed || {}).filter(value => value === true).length >= 25);
}

export function practicalCourseBlocksInvitations(state, { enabled = PRACTICAL_TUTORIAL_ENABLED } = {}) {
  if (!enabled) return false;
  const tutorial = state?.tutorial;
  return state?.learning?.practical?.reviewActive === true ||
    !!tutorial?.version && tutorial.rewardDisabled !== true && tutorial.autoOpenDisabled !== true &&
      Object.values(tutorial.completed || {}).filter(value => value === true).length < 25;
}
