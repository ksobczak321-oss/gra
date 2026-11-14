# 96-hour legacy catch-up regression

The unchanged test `tests/harborlight-agreed-state.test.mjs:395` starts a subprocess with a 10 second timeout. It migrates 144 legacy residents, fills the level 6 Lumber stock, advances 96 hours once and again as 16×6 hour intervals, then compares population, stock, resources, happiness, phases, blocked duration and clock.

The full concurrent run reached the subprocess timeout. A separate extraction of its exact simulation completed with identical whole/split snapshots: population 129, happiness−100, Food 0, Lumber stock 1200, blocked 345600 seconds. This was finite work, not an infinite simulation loop.

The execution environment has a quota of 2 CPUs (`cpu.max`=200000/100000). During failed attempts it also ran a long campaign test and Chromium processes; one renderer consumed approximately 86%CPU and its GPU process 23%CPU. Wall-clock measurements taken in that period are not reliable hardware comparisons.

Recorded diagnostic measurements (same simulation, no changed game assertions):

| Version / condition | Wall time | Aggregate process CPU |
| --- | ---: | ---: |
|Current, CPU profile enabled, other work active|15.12 s|14.68 s|
|Current, concurrent Chromium active|28.01 s|15.76 s|
|Base `7e81a1a`, clean archived JavaScript modules|8.25 s|10.79 s|
|Current after heavy browser ended, before optimization|9.48 s|11.64 s|
|Temporary copy with candidate optimization|8.09 s|11.08 s|

CPU includes V8/background work and can exceed elapsed time. Runs were sequential and environment load varied, so these figures are diagnostic observations, not a controlled benchmark or exact speedup claim.

The current profile pointed to `synchronizeResidents` among the hottest functions. Each workplace constructed an entire available-resident array even when no staff was missing; the new eligibility closure also added per-person checks to legacy saves. The root agent applied a behavior-preserving change: skip filtering when `missing<=0`, and use the original `residentAtHome` predicate for earlier rulesets. Ruleset 32 keeps specialist-aware eligibility. The temporary optimized run retained every simulation snapshot value.

Final verification after the applied patch:

```sh
node --test --test-name-pattern='96-hour offline full-storage' tests/harborlight-agreed-state.test.mjs
```

**PASS, 9142.18 ms**. The original 10000 ms timeout and every assertion remain unchanged. Evidence: `/workspace/work/v32-96h-patched-isolated.log`. This resolves the targeted regression without weakening the test. It does not convert an earlier failed concurrent full-suite run into a new full-suite success; a broad result must be reported separately. On this 2 CPU quota, timing-bound subprocess tests should run without concurrent heavy browser/campaign jobs.
