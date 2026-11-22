#!/usr/bin/env python3
"""Build or verify the immutable, public HARBORLIGHT frontend release.

Only explicitly listed game files are public. No build step executes game code,
reads credentials, or contacts Firebase. Verification finishes before extraction.
"""

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    "harborlight-v1-map-labels.js",
    "harborlight-v1-learning-policy.js",
    "harborlight-v1-startup-replay.js",
    "harborlight-v1-startup-replay-model.js",
    "harborlight-v1-startup-replay-worker.js",
    "harborlight-v1-diet-history-index.js",
    "harborlight-v1-diet-accumulator.js",
    "harborlight-v1-building-stages.js",
    "harborlight-building-gallery.html",
    "assets/building-upgrades-v1/manifest.json",
    "assets/building-upgrades-v1/townhall.webp",
    "assets/building-upgrades-v1/house.webp",
    "assets/building-upgrades-v1/farm.webp",
    "assets/building-upgrades-v1/lumber.webp",
    "assets/building-upgrades-v1/quarry.webp",
    "assets/building-upgrades-v1/windmill.webp",
    "assets/building-upgrades-v1/sawmill.webp",
    "assets/building-upgrades-v1/warehouse.webp",
    "assets/building-upgrades-v1/bakery.webp",
    "assets/building-upgrades-v1/dairy.webp",
    "assets/building-upgrades-v1/slaughterhouse.webp",
    "assets/building-upgrades-v1/fisher.webp",
    "assets/building-upgrades-v1/leatherworks.webp",
    "assets/building-upgrades-v1/academy.webp",
    "assets/building-upgrades-v1/barracks.webp",
    "assets/building-upgrades-v1/chapel.webp",
    "assets/building-upgrades-v1/lighthouse.webp",
    "assets/building-upgrades-v1/theatre.webp",
    "assets/building-upgrades-v1/market.webp",
    "assets/building-upgrades-v1/dock.webp",
    "assets/building-upgrades-v1/crane.webp",
    "assets/building-upgrades-v1/terrain.webp",
    "assets/building-upgrades-v1/frame-townhall-01.webp",
    "assets/building-upgrades-v1/frame-townhall-02.webp",
    "assets/building-upgrades-v1/frame-townhall-03.webp",
    "assets/building-upgrades-v1/frame-townhall-04.webp",
    "assets/building-upgrades-v1/frame-townhall-05.webp",
    "assets/building-upgrades-v1/frame-townhall-06.webp",
    "assets/building-upgrades-v1/frame-townhall-07.webp",
    "assets/building-upgrades-v1/frame-townhall-08.webp",
    "assets/building-upgrades-v1/frame-townhall-09.webp",
    "assets/building-upgrades-v1/frame-townhall-10.webp",
    "assets/building-upgrades-v1/frame-house-01.webp",
    "assets/building-upgrades-v1/frame-house-02.webp",
    "assets/building-upgrades-v1/frame-house-03.webp",
    "assets/building-upgrades-v1/frame-house-04.webp",
    "assets/building-upgrades-v1/frame-house-05.webp",
    "assets/building-upgrades-v1/frame-house-06.webp",
    "assets/building-upgrades-v1/frame-house-07.webp",
    "assets/building-upgrades-v1/frame-house-08.webp",
    "assets/building-upgrades-v1/frame-house-09.webp",
    "assets/building-upgrades-v1/frame-house-10.webp",
    "assets/building-upgrades-v1/frame-farm-01.webp",
    "assets/building-upgrades-v1/frame-farm-02.webp",
    "assets/building-upgrades-v1/frame-farm-03.webp",
    "assets/building-upgrades-v1/frame-farm-04.webp",
    "assets/building-upgrades-v1/frame-farm-05.webp",
    "assets/building-upgrades-v1/frame-farm-06.webp",
    "assets/building-upgrades-v1/frame-farm-07.webp",
    "assets/building-upgrades-v1/frame-farm-08.webp",
    "assets/building-upgrades-v1/frame-farm-09.webp",
    "assets/building-upgrades-v1/frame-farm-10.webp",
    "assets/building-upgrades-v1/frame-lumber-01.webp",
    "assets/building-upgrades-v1/frame-lumber-02.webp",
    "assets/building-upgrades-v1/frame-lumber-03.webp",
    "assets/building-upgrades-v1/frame-lumber-04.webp",
    "assets/building-upgrades-v1/frame-lumber-05.webp",
    "assets/building-upgrades-v1/frame-lumber-06.webp",
    "assets/building-upgrades-v1/frame-lumber-07.webp",
    "assets/building-upgrades-v1/frame-lumber-08.webp",
    "assets/building-upgrades-v1/frame-lumber-09.webp",
    "assets/building-upgrades-v1/frame-lumber-10.webp",
    "assets/building-upgrades-v1/frame-quarry-01.webp",
    "assets/building-upgrades-v1/frame-quarry-02.webp",
    "assets/building-upgrades-v1/frame-quarry-03.webp",
    "assets/building-upgrades-v1/frame-quarry-04.webp",
    "assets/building-upgrades-v1/frame-quarry-05.webp",
    "assets/building-upgrades-v1/frame-quarry-06.webp",
    "assets/building-upgrades-v1/frame-quarry-07.webp",
    "assets/building-upgrades-v1/frame-quarry-08.webp",
    "assets/building-upgrades-v1/frame-quarry-09.webp",
    "assets/building-upgrades-v1/frame-quarry-10.webp",
    "assets/building-upgrades-v1/frame-windmill-01.webp",
    "assets/building-upgrades-v1/frame-windmill-02.webp",
    "assets/building-upgrades-v1/frame-windmill-03.webp",
    "assets/building-upgrades-v1/frame-windmill-04.webp",
    "assets/building-upgrades-v1/frame-windmill-05.webp",
    "assets/building-upgrades-v1/frame-windmill-06.webp",
    "assets/building-upgrades-v1/frame-windmill-07.webp",
    "assets/building-upgrades-v1/frame-windmill-08.webp",
    "assets/building-upgrades-v1/frame-windmill-09.webp",
    "assets/building-upgrades-v1/frame-windmill-10.webp",
    "assets/building-upgrades-v1/frame-sawmill-01.webp",
    "assets/building-upgrades-v1/frame-sawmill-02.webp",
    "assets/building-upgrades-v1/frame-sawmill-03.webp",
    "assets/building-upgrades-v1/frame-sawmill-04.webp",
    "assets/building-upgrades-v1/frame-sawmill-05.webp",
    "assets/building-upgrades-v1/frame-sawmill-06.webp",
    "assets/building-upgrades-v1/frame-sawmill-07.webp",
    "assets/building-upgrades-v1/frame-sawmill-08.webp",
    "assets/building-upgrades-v1/frame-sawmill-09.webp",
    "assets/building-upgrades-v1/frame-sawmill-10.webp",
    "assets/building-upgrades-v1/frame-warehouse-01.webp",
    "assets/building-upgrades-v1/frame-warehouse-02.webp",
    "assets/building-upgrades-v1/frame-warehouse-03.webp",
    "assets/building-upgrades-v1/frame-warehouse-04.webp",
    "assets/building-upgrades-v1/frame-warehouse-05.webp",
    "assets/building-upgrades-v1/frame-warehouse-06.webp",
    "assets/building-upgrades-v1/frame-warehouse-07.webp",
    "assets/building-upgrades-v1/frame-warehouse-08.webp",
    "assets/building-upgrades-v1/frame-warehouse-09.webp",
    "assets/building-upgrades-v1/frame-warehouse-10.webp",
    "assets/building-upgrades-v1/frame-bakery-01.webp",
    "assets/building-upgrades-v1/frame-bakery-02.webp",
    "assets/building-upgrades-v1/frame-bakery-03.webp",
    "assets/building-upgrades-v1/frame-bakery-04.webp",
    "assets/building-upgrades-v1/frame-bakery-05.webp",
    "assets/building-upgrades-v1/frame-bakery-06.webp",
    "assets/building-upgrades-v1/frame-bakery-07.webp",
    "assets/building-upgrades-v1/frame-bakery-08.webp",
    "assets/building-upgrades-v1/frame-bakery-09.webp",
    "assets/building-upgrades-v1/frame-bakery-10.webp",
    "assets/building-upgrades-v1/frame-dairy-01.webp",
    "assets/building-upgrades-v1/frame-dairy-02.webp",
    "assets/building-upgrades-v1/frame-dairy-03.webp",
    "assets/building-upgrades-v1/frame-dairy-04.webp",
    "assets/building-upgrades-v1/frame-dairy-05.webp",
    "assets/building-upgrades-v1/frame-dairy-06.webp",
    "assets/building-upgrades-v1/frame-dairy-07.webp",
    "assets/building-upgrades-v1/frame-dairy-08.webp",
    "assets/building-upgrades-v1/frame-dairy-09.webp",
    "assets/building-upgrades-v1/frame-dairy-10.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-01.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-02.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-03.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-04.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-05.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-06.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-07.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-08.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-09.webp",
    "assets/building-upgrades-v1/frame-slaughterhouse-10.webp",
    "assets/building-upgrades-v1/frame-fisher-01.webp",
    "assets/building-upgrades-v1/frame-fisher-02.webp",
    "assets/building-upgrades-v1/frame-fisher-03.webp",
    "assets/building-upgrades-v1/frame-fisher-04.webp",
    "assets/building-upgrades-v1/frame-fisher-05.webp",
    "assets/building-upgrades-v1/frame-fisher-06.webp",
    "assets/building-upgrades-v1/frame-fisher-07.webp",
    "assets/building-upgrades-v1/frame-fisher-08.webp",
    "assets/building-upgrades-v1/frame-fisher-09.webp",
    "assets/building-upgrades-v1/frame-fisher-10.webp",
    "assets/building-upgrades-v1/frame-leatherworks-01.webp",
    "assets/building-upgrades-v1/frame-leatherworks-02.webp",
    "assets/building-upgrades-v1/frame-leatherworks-03.webp",
    "assets/building-upgrades-v1/frame-leatherworks-04.webp",
    "assets/building-upgrades-v1/frame-leatherworks-05.webp",
    "assets/building-upgrades-v1/frame-leatherworks-06.webp",
    "assets/building-upgrades-v1/frame-leatherworks-07.webp",
    "assets/building-upgrades-v1/frame-leatherworks-08.webp",
    "assets/building-upgrades-v1/frame-leatherworks-09.webp",
    "assets/building-upgrades-v1/frame-leatherworks-10.webp",
    "assets/building-upgrades-v1/frame-academy-01.webp",
    "assets/building-upgrades-v1/frame-academy-02.webp",
    "assets/building-upgrades-v1/frame-academy-03.webp",
    "assets/building-upgrades-v1/frame-academy-04.webp",
    "assets/building-upgrades-v1/frame-academy-05.webp",
    "assets/building-upgrades-v1/frame-academy-06.webp",
    "assets/building-upgrades-v1/frame-academy-07.webp",
    "assets/building-upgrades-v1/frame-academy-08.webp",
    "assets/building-upgrades-v1/frame-academy-09.webp",
    "assets/building-upgrades-v1/frame-academy-10.webp",
    "assets/building-upgrades-v1/frame-barracks-01.webp",
    "assets/building-upgrades-v1/frame-barracks-02.webp",
    "assets/building-upgrades-v1/frame-barracks-03.webp",
    "assets/building-upgrades-v1/frame-barracks-04.webp",
    "assets/building-upgrades-v1/frame-barracks-05.webp",
    "assets/building-upgrades-v1/frame-barracks-06.webp",
    "assets/building-upgrades-v1/frame-barracks-07.webp",
    "assets/building-upgrades-v1/frame-barracks-08.webp",
    "assets/building-upgrades-v1/frame-barracks-09.webp",
    "assets/building-upgrades-v1/frame-barracks-10.webp",
    "assets/building-upgrades-v1/frame-chapel-01.webp",
    "assets/building-upgrades-v1/frame-chapel-02.webp",
    "assets/building-upgrades-v1/frame-chapel-03.webp",
    "assets/building-upgrades-v1/frame-chapel-04.webp",
    "assets/building-upgrades-v1/frame-chapel-05.webp",
    "assets/building-upgrades-v1/frame-chapel-06.webp",
    "assets/building-upgrades-v1/frame-chapel-07.webp",
    "assets/building-upgrades-v1/frame-chapel-08.webp",
    "assets/building-upgrades-v1/frame-chapel-09.webp",
    "assets/building-upgrades-v1/frame-chapel-10.webp",
    "assets/building-upgrades-v1/frame-lighthouse-01.webp",
    "assets/building-upgrades-v1/frame-lighthouse-02.webp",
    "assets/building-upgrades-v1/frame-lighthouse-03.webp",
    "assets/building-upgrades-v1/frame-lighthouse-04.webp",
    "assets/building-upgrades-v1/frame-lighthouse-05.webp",
    "assets/building-upgrades-v1/frame-lighthouse-06.webp",
    "assets/building-upgrades-v1/frame-lighthouse-07.webp",
    "assets/building-upgrades-v1/frame-lighthouse-08.webp",
    "assets/building-upgrades-v1/frame-lighthouse-09.webp",
    "assets/building-upgrades-v1/frame-lighthouse-10.webp",
    "assets/building-upgrades-v1/frame-theatre-01.webp",
    "assets/building-upgrades-v1/frame-theatre-02.webp",
    "assets/building-upgrades-v1/frame-theatre-03.webp",
    "assets/building-upgrades-v1/frame-theatre-04.webp",
    "assets/building-upgrades-v1/frame-theatre-05.webp",
    "assets/building-upgrades-v1/frame-theatre-06.webp",
    "assets/building-upgrades-v1/frame-theatre-07.webp",
    "assets/building-upgrades-v1/frame-theatre-08.webp",
    "assets/building-upgrades-v1/frame-theatre-09.webp",
    "assets/building-upgrades-v1/frame-theatre-10.webp",
    "assets/building-upgrades-v1/frame-market-01.webp",
    "assets/building-upgrades-v1/frame-market-02.webp",
    "assets/building-upgrades-v1/frame-market-03.webp",
    "assets/building-upgrades-v1/frame-market-04.webp",
    "assets/building-upgrades-v1/frame-market-05.webp",
    "assets/building-upgrades-v1/frame-market-06.webp",
    "assets/building-upgrades-v1/frame-market-07.webp",
    "assets/building-upgrades-v1/frame-market-08.webp",
    "assets/building-upgrades-v1/frame-market-09.webp",
    "assets/building-upgrades-v1/frame-market-10.webp",
    "assets/building-upgrades-v1/frame-dock-01.webp",
    "assets/building-upgrades-v1/frame-dock-02.webp",
    "assets/building-upgrades-v1/frame-dock-03.webp",
    "assets/building-upgrades-v1/frame-dock-04.webp",
    "assets/building-upgrades-v1/frame-dock-05.webp",
    "assets/building-upgrades-v1/frame-dock-06.webp",
    "assets/building-upgrades-v1/frame-dock-07.webp",
    "assets/building-upgrades-v1/frame-dock-08.webp",
    "assets/building-upgrades-v1/frame-dock-09.webp",
    "assets/building-upgrades-v1/frame-dock-10.webp",
    "harborlight-v1-advisor-development-plan.js",
    "harborlight-v1-advisor-development-client.js",
    "harborlight-v1-advisor-development-worker.js",
    "harborlight-v1-advisor-guidance.js",
    "harborlight-v1-advisor-guidance.css",
    "harborlight-v1-advisor.js",
    "harborlight-v1-advisor-ui.js",
    "harborlight-v1-advisor-intro.js",
    "harborlight-v1-advisor.css",
    "harborlight-v1-runtime-upgrade.js",
    "harborlight-v1-resident-labels.js",
    "harborlight-v1-map-art.js",
    "harborlight-v1-goods-art.js",
    "harborlight-v1-dev-preview.js",
    "harborlight-v1-save-packing.js",
    "harborlight-v1-development.js",
    "harborlight-v1-development-logistics.js",
    "harborlight-v1-development-ui.js",
    "harborlight-v1-development-copy.js",
    "harborlight-v1-development.css",
    "harborlight-v1-provisions.js",
    "harborlight-v1-education.js",
    "harborlight-v1-military.js",
    "harborlight-v1-kingdom.js",
    "harborlight-v1-kingdom-ui.js",
    "harborlight-v1-kingdom-client.js",
    "harborlight-v1-original-puzzles.js",
    "harborlight-v1-original-puzzles-ui.js",
    "harborlight-v1-original-puzzles.css",

    "assets/harborlight-inhabitants-clean.png",
    "assets/harborlight-v1-approved.png",
    "assets/harborlight-farm-forest-approved-v32.png",
    "assets/harborlight-harbor-approved-v32.png",
    "assets/harborlight-ocean-approved-v32.png",
    "assets/harborlight-goods-v32.png",
    "assets/harborlight-windmill-clean.png",
    "assets/paynow-wordmark.svg",
    "assets/theatre-building-v30.png",
    "assets/theatre-courtyard-v30.png",
    "assets/theatre-decor-atlas-v30.png",
    "harborlight-auth.css",
    "harborlight-auth.html",
    "harborlight-auth.js",
    "harborlight-auth-providers.js",
    "harborlight-dev-cloud.js",
    "harborlight-dev-sync.js",
    "harborlight-legal.js",
    "harborlight-legal.css",
    "harborlight-terms.html",
    "harborlight-privacy.html",
    "harborlight-version.js",
    "harborlight-v1-activities.js",
    "harborlight-v1-expedition-hour.js",
    "harborlight-v1-adventure-budget.js",
    "harborlight-v1-interruption.js",
    "harborlight-v1-campaign.js",
    "harborlight-v1-economy.js",
    "harborlight-v1-welcome.js",
    "harborlight-v1-theatre.js",
    "harborlight-v1-theatre-art.js",
    "harborlight-v1-theatre-ui.js",
    "harborlight-v1-theatre.css",
    "harborlight-v1-theatre-scene.css",
    "harborlight-v1-adventures.js",
    "harborlight-v1-adventure-puzzles.js",
    "harborlight-v1-island-puzzles.js",
    "harborlight-v1-story-catalog.js",
    "harborlight-v1-adventure-journey.js",
    "harborlight-v1-adventures-art.js",
    "harborlight-v1-adventures-ui.js",
    "harborlight-v1-adventures-expanded-ui.js",
    "harborlight-v1-adventures.css",
    "harborlight-v1-approved-copy.js",
    "harborlight-v1-ambient.js",
    "harborlight-v1-archipelago.js",
    "harborlight-v1-charity.js",
    "harborlight-v1-community-client.js",
    "harborlight-v1-community-ui.js",
    "harborlight-v1-league.js",
    "backend/league-rules.mjs",
    "backend/island-name.mjs",
    "harborlight-v1-calendar.js",
    "harborlight-v1-commerce.js",
    "harborlight-v1-copy.js",
    "harborlight-v1-effects.js",
    "harborlight-v1-engagement.js",
    "harborlight-v1-events.js",
    "harborlight-v1-i18n.js",
    "harborlight-v1-housing.js",
    "harborlight-v1-inhabitants.js",
    "harborlight-v1-inventory.js",
    "harborlight-v1-layered.html",
    "harborlight-v1-leisure.js",
    "harborlight-v1-life.js",
    "harborlight-v1-learning-feedback.js",
    "harborlight-v1-learning-feedback.css",
    "harborlight-v1-logistics.js",
    "harborlight-v1-minigame-ui.js",
    "harborlight-v1-minigame-instructions.js",
    "harborlight-v1-minigame-instructions.css",
    "harborlight-v1-minigame.css",
    "harborlight-v1-minigames.js",
    "harborlight-v1-missions.js",
    "harborlight-v1-missions-ui.js",
    "harborlight-v1-notification-copy.js",
    "harborlight-v1-onboarding-ui.js",
    "harborlight-v1-onboarding.css",
    "harborlight-v1-play.css",
    "harborlight-v1-play.js",
    "harborlight-v1-profile.js",
    "harborlight-v1-progression.js",
    "harborlight-v1-residents.js",
    "harborlight-v1-smoke.js",
    "harborlight-v1-state.js",
    "harborlight-v1-tutorial-ui.js",
    "harborlight-v1-tutorial.css",
    "harborlight-v1-v16-copy.js",
    "harborlight-v1-water.js",
)
# The standalone practice hub and its reviewed documents are a separate,
# explicit public set. Never publish the docs tree or a recursive wildcard.
MINIGAME_SLUGS = (
    "puzzle-signal-line",
    "puzzle-harbor-routes",
    "puzzle-gull",
    "puzzle-crabs",
    "puzzle-hidden-objects",
    "puzzle-parrot",
    "puzzle-packing",
    "puzzle-untangle",
    "puzzle-navigation",
    "puzzle-scheduling",
    "puzzle-gears",
    "puzzle-optics",
    "puzzle-tides",
    "puzzle-hotel",
    "puzzle-magnets",
    "puzzle-paper-fold",
    "puzzle-invention",
    "puzzle-photo",
    "puzzle-deduction",
    "puzzle-cooking",
    "puzzle-signals-decode",
    "puzzle-balance",
    "puzzle-memory-triples",
    "puzzle-marble-maze",
    "story-first-light",
    "story-star-guests",
    "story-captainless-ship",
    "story-harbor-opening",
    "story-storm-shelter",
    "story-bottle-message",
    "story-fog-convoy",
    "story-keeper-map",
    "story-supply-voyage",
    "story-second-shore",
    "story-closed-lighthouse",
    "story-lost-performance",
    "story-ocean-visitors",
    "story-nothing-wasted",
    "story-sea-festival",
    "story-merchant-rescue",
    "story-cliff-treasury",
    "story-above-storm",
    "story-sail-gathering",
    "story-homecoming",
    "adventure-cargo-rain",
    "adventure-treasure-map",
    "adventure-pirate-cannon",
    "adventure-bridge",
    "adventure-signals",
    "adventure-letters",
    "adventure-rhythm",
    "adventure-garden",
    "adventure-cargo-balance",
    "expedition-tilt",
    "expedition-triples",
)
MINIGAME_PUBLIC_FILES = (
    "minigames/index.html",
    "minigames/app.js",
    "minigames/styles.css",
    "minigames/catalog.json",
    "minigames/documents.json",
    "minigames/linki.txt",
    "minigames/HARBORLIGHT-minigry-dokumentacja.zip",
    *(f"minigames/docs/{slug}.{extension}"
      for slug in MINIGAME_SLUGS for extension in ("docx", "txt")),
)
PUBLIC_FILES += MINIGAME_PUBLIC_FILES
CONTENT_FILES = frozenset((*PUBLIC_FILES, "index.html"))
ARCHIVE_FILES = CONTENT_FILES | {"release.json"}
# Only current-main-reviewed profiles can select a historical public file set.
# The caller cannot supply a profile path, allowlist or unpinned archive digest.
VERIFICATION_PROFILES = {
    "preprod-0.14.0.0-20261104": ROOT / "infra/google-cloud/frontend-profiles/preprod-0.14.0.0-20261104.json",
}
# Keep both accepted atlases and the explicit 200 lossless runtime frames.
# These finite limits cover the 455-member package without publishing a glob.
MAX_BYTES = 128 * 1024 * 1024
MAX_MEMBERS = 512
MAX_TAR_BYTES = MAX_BYTES + MAX_MEMBERS * 1024
COMMIT = re.compile(r"[a-f0-9]{40}\Z")
DIGEST = re.compile(r"[a-f0-9]{64}\Z")
INDEX = b'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HARBORLIGHT</title>
<script>
(() => {
  const dev = ['harborlight-dev.web.app', 'harborlight-dev.firebaseapp.com']
    .includes(new URL(location.href).hostname);
  const target = new URL(dev ? 'harborlight-auth.html' : 'harborlight-v1-layered.html', location.href);
  target.search = location.search;
  if (!target.searchParams.has('profile')) target.searchParams.set('profile', 'new-player');
  target.hash = location.hash;
  location.replace(target.href);
})();
</script>
</head>
<body><noscript><a href="harborlight-v1-layered.html?profile=new-player">Otworz gre HARBORLIGHT</a></noscript></body>
</html>
'''


class BundleError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise BundleError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def validate_commit(commit):
    require(isinstance(commit, str) and COMMIT.fullmatch(commit), "A full, lowercase commit SHA is required.")
    return commit


def load_verification_profile(name):
    require(name in VERIFICATION_PROFILES, "Unknown trusted frontend verification profile.")
    path = VERIFICATION_PROFILES[name]
    require(path.is_file() and not path.is_symlink(), "Trusted frontend profile must be a regular file.")
    try:
        profile = json.loads(path.read_bytes())
    except (ValueError, UnicodeError) as error:
        raise BundleError("Invalid trusted frontend verification profile.") from error
    require(isinstance(profile, dict) and set(profile) == {
        "schema_version", "name", "commit", "archive_sha256", "manifest_sha256",
        "file_count", "total_bytes", "content_files",
    }, "Invalid trusted frontend verification profile fields.")
    require(type(profile["schema_version"]) is int and profile["schema_version"] == 1
            and profile["name"] == name, "Unsupported trusted frontend verification profile.")
    validate_commit(profile["commit"])
    for key in ("archive_sha256", "manifest_sha256"):
        require(isinstance(profile[key], str) and DIGEST.fullmatch(profile[key]),
                "Trusted frontend profile has an invalid pinned digest.")
    names = profile["content_files"]
    require(isinstance(names, list) and all(isinstance(item, str) for item in names)
            and names == sorted(set(names)) and "index.html" in names and "release.json" not in names,
            "Trusted frontend profile must list unique public content files.")
    for name in names:
        require(name and not PurePosixPath(name).is_absolute()
                and not any(part in ("", ".", "..") for part in name.split("/"))
                and "\\" not in name, "Trusted frontend profile contains an unsafe public path.")
    require(type(profile["file_count"]) is int and profile["file_count"] == len(names) + 1
            and 1 < profile["file_count"] <= MAX_MEMBERS,
            "Trusted frontend profile has an invalid file count.")
    require(type(profile["total_bytes"]) is int and 0 < profile["total_bytes"] <= MAX_BYTES,
            "Trusted frontend profile has an invalid release size.")
    return {**profile, "content_files": frozenset(names), "archive_files": frozenset((*names, "release.json"))}


def public_file_sets(profile=None):
    return (profile["content_files"], profile["archive_files"]) if profile else (CONTENT_FILES, ARCHIVE_FILES)


def canonical_json(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def content_from_source(source_root):
    source_root = Path(source_root).resolve()
    files = {"index.html": INDEX}
    for name in PUBLIC_FILES:
        path = source_root / name
        require(path.is_file() and not path.is_symlink(), f"Missing or linked public source: {name}")
        require(path.resolve().is_relative_to(source_root), f"Public source escapes the repository: {name}")
        require(not any(parent.is_symlink() for parent in path.parents if parent != source_root and source_root in parent.parents),
                f"Linked source directory is not allowed: {name}")
        files[name] = path.read_bytes()
    require(sum(map(len, files.values())) <= MAX_BYTES, "Frontend exceeds the public release size limit.")
    return files


def make_manifest(files, commit):
    return {
        "schema_version": 1,
        "commit": validate_commit(commit),
        "files": {name: {"sha256": sha256(data), "size": len(data)} for name, data in sorted(files.items())},
    }


def validate_files(files, commit, *, profile=None):
    content_files, archive_files = public_file_sets(profile)
    require(set(files) == archive_files, "Archive does not contain the exact public frontend file set.")
    require(sum(map(len, files.values())) <= MAX_BYTES, "Frontend exceeds the public release size limit.")
    if profile:
        require(commit == profile["commit"], "Historical frontend profile belongs to another source commit.")
        require(sha256(files["release.json"]) == profile["manifest_sha256"],
                "Frontend manifest does not match the trusted historical profile.")
        require(len(files) == profile["file_count"] and sum(map(len, files.values())) == profile["total_bytes"],
                "Frontend size does not match the trusted historical profile.")
    try:
        manifest = json.loads(files["release.json"])
    except (ValueError, UnicodeError) as error:
        raise BundleError("Invalid release manifest JSON.") from error
    require(isinstance(manifest, dict) and manifest.get("schema_version") == 1, "Unsupported frontend manifest.")
    require(manifest.get("commit") == validate_commit(commit), "Frontend manifest belongs to another source commit.")
    expected = manifest.get("files")
    require(isinstance(expected, dict) and set(expected) == content_files, "Manifest does not list the exact public file set.")
    for name in sorted(content_files):
        entry = expected[name]
        require(isinstance(entry, dict) and set(entry) == {"sha256", "size"}, f"Invalid manifest entry: {name}")
        require(isinstance(entry["sha256"], str) and DIGEST.fullmatch(entry["sha256"]), f"Invalid file digest: {name}")
        require(type(entry["size"]) is int and entry["size"] >= 0, f"Invalid file size: {name}")
        require(entry["sha256"] == sha256(files[name]) and entry["size"] == len(files[name]),
                f"Frontend file does not match its manifest: {name}")
    return manifest


def archive_bytes(files):
    destination = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=destination, mtime=0, compresslevel=9) as zipped:
        with tarfile.open(fileobj=zipped, mode="w|", format=tarfile.USTAR_FORMAT) as archive:
            for name, data in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = 0o644
                info.uid = info.gid = info.mtime = 0
                info.uname = info.gname = ""
                archive.addfile(info, io.BytesIO(data))
    value = destination.getvalue()
    require(len(value) <= MAX_BYTES, "Compressed frontend exceeds the release size limit.")
    return value


def existing_output_is_managed(destination, *, profile=None):
    require(not destination.is_symlink(), "Output directory must not be a symbolic link.")
    if not destination.exists():
        return
    require(destination.is_dir(), "Frontend output is not a directory.")
    paths = list(destination.rglob("*"))
    require(not any(path.is_symlink() for path in paths), "Output contains a symbolic link.")
    regular = {path.relative_to(destination).as_posix(): path for path in paths if path.is_file()}
    if not paths:
        return
    _, archive_files = public_file_sets(profile)
    require(set(regular) == archive_files, "Refusing to overwrite an output directory with unknown files.")
    try:
        manifest = json.loads(regular["release.json"].read_bytes())
        commit = manifest.get("commit")
    except (ValueError, AttributeError) as error:
        raise BundleError("Refusing to overwrite an unmanaged output directory.") from error
    validate_files({name: path.read_bytes() for name, path in regular.items()}, commit, profile=profile)


def write_output(files, destination, *, profile=None):
    destination = Path(destination)
    existing_output_is_managed(destination, profile=profile)
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".harborlight-frontend-", dir=destination.parent))
    try:
        for name, data in files.items():
            path = staging / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            path.chmod(0o644)
        if destination.exists():
            shutil.rmtree(destination)
        staging.rename(destination)
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def metadata(files, commit, archive, compressed):
    return {
        "commit": commit,
        "archive": str(archive),
        "archive_sha256": sha256(compressed),
        "manifest_sha256": sha256(files["release.json"]),
        "file_count": len(files),
        "total_bytes": sum(map(len, files.values())),
    }


def build(commit, output, archive, source_root=ROOT):
    validate_commit(commit)
    output, archive = Path(output), Path(archive)
    require(not archive.resolve().is_relative_to(output.resolve()), "Archive must be outside the public output directory.")
    files = content_from_source(source_root)
    files["release.json"] = canonical_json(make_manifest(files, commit))
    validate_files(files, commit)
    compressed = archive_bytes(files)
    write_output(files, output)
    archive.parent.mkdir(parents=True, exist_ok=True)
    require(not archive.is_symlink(), "Archive output must not be a symbolic link.")
    archive.write_bytes(compressed)
    return metadata(files, commit, archive, compressed)


def verify_archive(archive, commit, expected_sha256, extract_to, *, verification_profile=None):
    validate_commit(commit)
    profile = load_verification_profile(verification_profile) if verification_profile is not None else None
    _, archive_files = public_file_sets(profile)
    if profile:
        require(commit == profile["commit"], "Historical frontend profile belongs to another source commit.")
        require(expected_sha256 == profile["archive_sha256"],
                "DEV receipt archive does not match the trusted historical profile.")
    require(isinstance(expected_sha256, str) and DIGEST.fullmatch(expected_sha256), "Expected archive SHA-256 must have 64 lowercase hex digits.")
    archive = Path(archive)
    require(archive.is_file() and not archive.is_symlink(), "Frontend archive must be a regular file.")
    require(archive.stat().st_size <= MAX_BYTES, "Compressed frontend exceeds the release size limit.")
    compressed = archive.read_bytes()
    require(sha256(compressed) == expected_sha256, "Frontend archive SHA-256 does not match the DEV receipt.")
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(compressed), mode="rb") as zipped:
            unpacked = zipped.read(MAX_TAR_BYTES + 1)
        require(len(unpacked) <= MAX_TAR_BYTES, "Expanded archive exceeds the release size limit.")
        files = {}
        with tarfile.open(fileobj=io.BytesIO(unpacked), mode="r:") as source:
            for member in source:
                require(len(files) < MAX_MEMBERS, "Archive contains too many entries.")
                path = PurePosixPath(member.name)
                require(not path.is_absolute() and not any(part in (".", "..") for part in member.name.split("/"))
                        and "\\" not in member.name and member.name in archive_files,
                        "Archive contains a path outside the public file set.")
                require(member.isfile() and not member.pax_headers, "Archive contains links or unsupported metadata.")
                require(not profile or member.type in (tarfile.REGTYPE, tarfile.AREGTYPE) and not member.sparse,
                        "Historical archive contains a non-regular file or sparse metadata.")
                require(member.name not in files, "Archive contains duplicate files.")
                require(0 <= member.size <= MAX_BYTES, "Archive member exceeds the release size limit.")
                require(sum(map(len, files.values())) + member.size <= MAX_BYTES,
                        "Frontend exceeds the public release size limit.")
                value = source.extractfile(member)
                require(value is not None, "Archive member is unreadable.")
                files[member.name] = value.read()
                require(len(files[member.name]) == member.size, "Archive member is truncated.")
    except (tarfile.TarError, OSError, EOFError) as error:
        raise BundleError("Frontend archive is not a valid bounded tar.gz release.") from error
    validate_files(files, commit, profile=profile)
    write_output(files, extract_to, profile=profile)
    result = metadata(files, commit, archive, compressed)
    if profile:
        result["verification_profile"] = verification_profile
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", type=Path, default=Path("build/frontend"))
    parser.add_argument("--archive", type=Path, default=Path("build/harborlight-frontend.tar.gz"))
    parser.add_argument("--verify-archive", type=Path)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--extract-to", type=Path)
    parser.add_argument("--verification-profile", choices=tuple(VERIFICATION_PROFILES),
                        help="Use an explicitly trusted, digest-pinned historical profile for verification only.")
    args = parser.parse_args()
    try:
        if args.verify_archive:
            require(args.expected_sha256 and args.extract_to, "Verification requires --expected-sha256 and --extract-to.")
            result = verify_archive(args.verify_archive, args.commit, args.expected_sha256, args.extract_to,
                                    verification_profile=args.verification_profile)
        else:
            require(not args.expected_sha256 and not args.extract_to and args.verification_profile is None,
                    "Verification options require --verify-archive.")
            result = build(args.commit, args.output, args.archive)
        print(json.dumps(result, sort_keys=True))
    except (BundleError, OSError) as error:
        print(f"Frontend release rejected: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
