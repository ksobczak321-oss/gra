# HARBORLIGHT v1 — Main Screen Spec

Status: **visual bible / frozen target for the main island screen**

The generated HARBORLIGHT v1 visual mockup is the reference direction. The implementation must preserve the same overall density, hierarchy and premium mobile-builder feel rather than falling back to simplified prototype visuals.

## 1. Screen goal

The main screen must communicate three things within the first 3 seconds:

1. This is a rich, living island the player wants to grow.
2. The player has an active settlement economy with resources, population and happiness.
3. There is always a clear next objective or expedition.

The island is the hero. UI must support the world, not cover it.

## 2. Base composition

Target orientation: landscape first, mobile/tablet friendly.

Reference canvas: 1600 × 900 logical units.

Primary composition:

- island occupies roughly 70–78% of usable screen area,
- sea remains visible around all sides of the island,
- lighthouse sits in the upper-right / upper-central high ground and acts as the strongest world landmark,
- village occupies the middle-left / central valley,
- farm occupies the lower-middle,
- lumber/forestry area occupies lower-left / left-middle,
- quarry/mine occupies upper-left rocky terrain,
- harbor occupies lower-right coastline,
- bridges, stairs and paths visibly connect all major zones.

The map must feel dense but readable. Empty green spaces should be rare and intentional.

## 3. World zones

### A. Lighthouse district

Position: upper-right high ground.

Contains:
- lighthouse,
- cliff terraces,
- stairs,
- construction scaffolding before completion,
- keeper house later,
- flowers and lamps,
- viewpoint / decorative benches.

Role:
- main chapter progression object,
- visually dominant landmark,
- changes appearance after each upgrade stage.

### B. Village district

Position: center-left / center.

Contains:
- 3–6 houses,
- small plaza,
- fountain/well,
- market stall,
- bakery later,
- decorations,
- residents walking between buildings.

Role:
- population and happiness center.

### C. Forestry district

Position: left / lower-left.

Contains:
- dense forest,
- lumber camp,
- stacks of logs,
- carts,
- sawmill,
- workshop props,
- dirt road joining village.

Role:
- logs and planks production.

### D. Farming district

Position: lower-middle.

Contains:
- wheat field,
- mill,
- barn,
- animal paddocks,
- irrigation ditch / stream,
- fences,
- hay bales.

Role:
- food and animal production.

### E. Quarry / mine district

Position: upper-left rocky elevation.

Contains:
- cliff face,
- mine entrance,
- crane or wooden hoist,
- stone piles,
- workers,
- carts,
- support beams.

Role:
- stone and later advanced materials.

### F. Harbor district

Position: lower-right shoreline.

Contains:
- wooden docks,
- fishing boat,
- cargo boat / sailboat,
- crates and barrels,
- crane,
- warehouse later,
- mooring poles,
- animated water.

Role:
- trade, later islands, expeditions and long-term progression.

## 4. Terrain and visual density

The world must include multiple elevation levels, not one flat green surface.

Required terrain elements:
- cliffs,
- beaches,
- rocky shoreline,
- waterfalls,
- streams,
- small lake or reservoir,
- bridges,
- stairs,
- winding paths,
- forest clusters,
- isolated decorative trees,
- flowers,
- bushes,
- rocks,
- fences,
- lamp posts,
- benches,
- crates, barrels and carts.

Visual density rule:
- every 100 × 100 logical units should normally contain at least one meaningful prop, vegetation cluster or terrain feature,
- large empty areas should exist only to preserve readability around major buildings.

## 5. World animation

Minimum ambient animation set for v1:
- ocean movement,
- waterfall movement,
- smoke from chimneys,
- rotating mill wheel / blades when active,
- lighthouse light rotation after restoration,
- birds / seagulls,
- residents walking on paths,
- occasional boat movement,
- subtle crop/grass movement,
- lamps glowing at night or during evening state.

Animations should be subtle and asynchronous so the island feels alive without looking noisy.

## 6. HUD — top bar

### Left group

Contains:
- player level badge,
- XP progress,
- population current / capacity,
- happiness percentage.

Suggested order:
`LEVEL | XP | POPULATION | HAPPINESS`

### Right group

Contains key economy resources:
- logs,
- stone,
- planks,
- grain/food,
- coins.

Each resource chip:
- icon,
- numeric value,
- optional small `+` button reserved for later monetization / acquisition flow.

HUD should use compact rounded chips with a light premium-mobile style and remain readable at phone resolution.

## 7. Left navigation rail

Persistent vertical buttons:

1. Island
2. Expeditions
3. Tasks
4. Residents
5. Achievements / Collection later
6. Settings near the bottom-left

The active tab is strongly highlighted.

Notification badges can appear on Expeditions, Tasks and Residents.

## 8. Right objective stack

Right side contains two contextual cards.

### Main objective card

Always visible on the island screen.

Contains:
- section title `MAIN OBJECTIVE`,
- objective title,
- short description,
- progress bar,
- checklist of prerequisites,
- optional small visual preview of the upgraded lighthouse.

Example:
`Awaken the Old Lighthouse`

Prerequisites:
- Lumber Camp 0/1,
- Sawmill 0/1,
- House 0/3,
- Happiness 75%.

### Expedition card

Visible when an expedition is available or selected.

Contains:
- expedition title,
- image preview / diorama thumbnail,
- short objective,
- required or recommended resources/tools,
- rewards,
- large primary button `START`.

This card is the bridge between the settlement layer and the puzzle layer.

## 9. Bottom build dock

Persistent but collapsible.

Tabs:
- Buildings,
- Resources / Production,
- Decorations,
- Paths.

Each build card contains:
- attractive miniature building art,
- name,
- cost,
- locked/unlocked state,
- optional level marker.

Initial visible building set:
- Lumber Camp,
- Sawmill,
- House,
- Barn,
- Farm,
- Quarry,
- Lighthouse.

The selected card should visibly lift / glow and place the game into build-placement mode.

## 10. Building interaction states

Every major building needs at least four visual states:

1. Locked / unavailable
2. Construction site
3. Built / active
4. Upgrade-ready / upgraded

Construction must happen in-world.

Example flow:
- player selects Sawmill,
- valid location glows,
- player confirms placement,
- foundation/scaffolding appears,
- short construction animation,
- finished sawmill replaces the construction state,
- production animation begins.

No circular prototype hotspots in the final art direction except temporary onboarding hints.

## 11. Residents and happiness

Residents must be visible as small animated characters in the world.

Main screen shows:
- population count,
- capacity,
- happiness score.

Happiness is influenced later by:
- housing,
- food availability,
- decorations,
- paths / access,
- service buildings,
- crowding,
- quest events.

Visual happiness cues:
- happy speech/emote bubbles,
- residents gathering at plaza,
- flowers and lamps improving districts,
- duller / emptier ambience if happiness drops.

## 12. Camera behavior

Desktop / tablet:
- default zoom shows almost the entire starter island,
- mouse/touch drag to pan,
- wheel/pinch zoom.

Mobile:
- pinch zoom,
- drag pan,
- double tap important building to focus,
- UI remains screen-fixed while the world moves underneath.

Camera constraints must prevent losing the island completely off-screen.

## 13. Layer architecture

The world must not be one flattened background image.

Required rendering layers:

1. Water
2. Island base terrain / cliffs
3. Paths / roads / bridges
4. Vegetation
5. Static decorative props
6. Buildings
7. Residents / animals / vehicles
8. Ambient VFX
9. Build highlights / selection
10. Screen-space UI

This allows buildings, roads, decorations and inhabitants to react independently to game state.

## 14. First playable v1 screen state

The initial v1 screen should show a partially ruined but attractive settlement, not an empty island.

Visible from the start:
- old lighthouse in damaged state,
- small camp,
- several residential buildings,
- forest,
- undeveloped farm land,
- quarry entrance,
- basic dock,
- paths connecting the core areas,
- around 8–12 visible residents,
- several locked construction plots / opportunities.

The player should feel they are restoring an existing place, not placing objects on an empty sandbox.

## 15. Acceptance criteria

The v1 main screen is accepted only if:

- screenshot quality feels close to the approved HARBORLIGHT visual mockup,
- island is visually dense and attractive without UI,
- UI hierarchy remains clear at 6-inch phone size,
- lighthouse is immediately readable as the major objective,
- at least six production/development zones are visually distinct,
- resident life is visible,
- buildings can exist as separate interactive world objects,
- no prototype circles or emoji are required for normal gameplay,
- future building upgrades can visibly change the island without repainting one giant background image.

## 16. Frozen decisions

For the next implementation pass, do not change these without an explicit product decision:

- peaceful island-builder meta layer,
- no PvP attacks,
- rich colorful semi-isometric visual style,
- lighthouse as first major chapter objective,
- two-layer loop: puzzle expedition → resources/blueprints → settlement growth,
- population and happiness visible in the main HUD,
- premium-mobile UI density similar to the approved v1 visual mockup.
