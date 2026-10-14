# Fire and Ice zones: implementation plan

Source of truth for content: the editable Claude Doc "Fire and Ice Zones (draft)", read at revision 103 (includes your edits).
The kid-readable draft is `plans/ice-fire-zones.md`. This file is the engineering plan.

## Summary

Add two overworld zones, **Emberreach** (Fire) and **Frostmoor** (Ice), plus a fusion arena. This needs two new pet types, 19 new pet species, 13 new moves, two zone bosses, a fusion boss, new items, lava/ice terrain, and map entries. Scene work is small because `LightShadowZoneScene` already takes a config object. The bulk of the effort is content (pets, sprites, move effects) and the type-chart change.

## Status: all eight phases built

Where the build differs from the phases below:

- **Phase 4:** Fire and Ice join old-zone spawns at half the Light/Shadow base rate (0.5% against 1%), because charms and lures need a baseline to multiply.
- **Phase 5:** the zone class gained optional `scaling`, `hazard`, `exitScene` and `exitData` settings. A dev-only `?scene=<SceneKey>` shortcut was added to test scenes directly.
- **Phase 6:** the Steam Sanctum is its own scene (`SteamSanctumScene`) that reuses the castle room scene, so it has a scene key of its own. The Wyrm drops Steamwyrm. Both zone bosses give a TM and a rare pet. The two key halves are the boss-defeated flags.
- **Phase 7:** the world map is display-only, so the way in is three portals on the east wall of Shrub Woodlands (Steam Sanctum sealed until both bosses fall), plus matching map nodes. Both zones are always open.
- **Type symbols:** Fire is red and Ice is white on battle move buttons, the Pet Book and the balance sheet. Attack animations keep their own colours.
- **Phase 8:** no multiplayer changes were needed (scene names pass through as plain strings). The balance-sheet script round-trips the new types, pets, moves and bosses.

## Content locked in from the doc

**Wild pets.** Evolved forms never spawn in the wild.

| Zone | Pet | Rarity | Evolves into |
|---|---|---|---|
| Fire | Cinder | common | Ashwing (Lv 15) |
| Fire | Kindle | common | Blazeling (Lv 15) |
| Fire | Magmite | uncommon | Calderon (Lv 20) |
| Fire | Insinerix | uncommon | Phoenyx (Lv 20) |
| Fire | Infernal | rare | none |
| Ice | Flurry | common | Blizzard (Lv 15) |
| Ice | Frostix (snow wolf) | common | Mammothox (Lv 15) |
| Ice | Glacet | uncommon | Glaciarch (Lv 20) |
| Ice | Snowhare | uncommon | Whitewind (Lv 20) |
| Ice | Permafrost | rare | none |

Plus **Steamwyrm** (Fire type, fusion boss only, `captureCost: 999` so it never joins a wild pool).
Total: 10 wild + 8 evolved + 1 = **19 species**.

**Moves (13).** Fire: Ember, Scorch, Flame Burst, Magma Fist, Heat Haze, Inferno. Ice: Frost Bite, Chill, Ice Shard, Frostburn, Blizzard Blast, Absolute Zero. Shared: Steam Burst (typed Fire).

**Bosses.** Emberlord Vulkar (Calderon, Phoenyx, Infernal, Magmite). Frostqueen Hailey (Glaciarch, Whitewind, Permafrost, Frostix). Twilight Wyrm (5 pets including Steamwyrm). Each zone boss drops a unique TM, a rare pet and half a key.

## Decisions I made (change any of these)

1. **Type chart.** Your edit removed "Fire" from Ice's list and added "Water". The current engine (`src/utils/math.ts`) stores one-way advantages and derives the 0.5x reverse automatically. I'll implement:
   - Fire beats Ice, Nature, Wood.
   - Ice beats Water, Nature, Wood.
   - Water beats Rock **and Fire**. Rock beats Wood **and Fire and Ice**.
   - This contradicts the doc line "Both are weak against Water": Ice > Water means Ice is not weak to it. I followed the Ice > Water edit and kept "Fire weak to Water". The doc also still says Fire and Ice "hurt each other a lot", but the edit makes it one-way (Fire beats Ice). The doc comment on that line is still unanswered.
   - **Balance flag:** Rock now beats three types and loses only to Water, and Nature and Wood lose to Fire and Ice. Worth a playtest.
2. **Heat Haze and Chill.** Moves have no status effects (`IMove` has `power`, `category` and `type` only). Building a status system is a separate project, so these ship as low-power damage moves with flavour text. Say so if you want real debuffs.
3. **Fusion arena.** It reuses `CastleRoomScene` as a new room id (`wyrm`), the way the Eclipse Sanctum works. It is entered from a new locked-until-both-bosses map node, so no new scene class is needed. The arena has the boss only, no wild pets (the doc's last question; easy to add later).
4. **Fire and Ice pets in old zones.** Charms and lures raise spawn odds of the type in old zones (existing behaviour for Light/Shadow). I'll add Fire and Ice to `BOOSTABLE_TYPES` so those items do something.
5. **Evolution stones.** Fire and Ice pets need a `fire-stone` or `ice-stone` plus spirits to evolve, matching Light/Shadow.
6. **Level scaling.** Wild pets: player level -3 to +2, floor 20, cap 60. Bosses: player level +3, same floor and cap. Fusion boss: player level +5.

## Prerequisite

The working tree has an unmerged Training Zone feature that edits `config.ts`, `bossUtils.ts`, `BattleManager.ts`, `BattleScene.ts` and `types/battle.ts`, and adds `trainerLevel` in `src/data/trainers.ts` (level-scaling pattern to reuse). **Merge or commit it first**, then branch `feature/ice-fire-zones` off `main`. Otherwise we conflict in `config.ts` and `bossUtils.ts`.

## Phases

Each phase ends with `npx tsc --noEmit` clean and a commit.

### Phase 1: types and chart
- `src/types/pet.ts`: append `Fire` and `Ice` to the **end** of `PetType` (values 7 and 8). Appending keeps existing numeric values stable. Check `SaveManager.ts` for persisted type numbers before relying on this.
- `src/utils/math.ts`: `advantageMap`, `ALL_PET_TYPES`, `PET_TYPE_LABELS`, and a new comment describing the chart.
- Make the compiler list everything else: `Record<PetType, ...>` objects fail to compile until updated. Known ones: `PetBookUI.ts` (names and colours), `fx/moveEffects.ts` (`TYPE_FX_COLOR`), `MoveShowcaseScene.ts` (labels, mascots, `ORDER`), `data/shop.ts` (labels), `scripts/balance_sheet.py` (`TYPES`, colours).
- Verify: write a throwaway node script that prints the full 9x9 effectiveness matrix and check it against the chart above.

### Phase 2: moves
- `src/data/moves.ts`: 13 moves following the existing power bands (power <= 20 gives 20 uses, <= 40 gives 12, above gives 6). Starting values:

| Move | Category | Power |
|---|---|---|
| Ember | Direct | 15 |
| Scorch | Ranged | 22 |
| Flame Burst | Ranged | 30 |
| Magma Fist | Direct | 36 |
| Heat Haze | Ranged | 20 |
| Inferno | Chance | 52 |
| Frost Bite | Direct | 15 |
| Chill | Ranged | 20 |
| Ice Shard | Ranged | 26 |
| Frostburn | Direct | 34 |
| Blizzard Blast | Chance | 38 |
| Absolute Zero | Chance | 52 |
| Steam Burst | Ranged | 40 |

- Add `inferno` and `absolute-zero` to `BOSS_MOVE_IDS` (priced as boss TMs). TMs are generated automatically from `MOVES`.
- `src/fx/moveEffects.ts`: one animation entry per move (13), plus colours for the two types. Also check `src/battle/petAttackAnimations.ts` for a per-move or per-template table.
- Verify: `MoveShowcaseScene` plays all 13.

### Phase 3: pets and art
- `src/data/pets.ts`: 19 templates. Stats follow the Light zone (HP 112 to 158, Attack 17 to 27, Defense 9 to 16 for wild; evolved forms about +25% per tier, apex above). Each evolved form learns the base pet's moves plus one stronger move.
- `src/data/evolutions.ts`: eight entries in the same format as Light/Shadow.
- `src/assets/AssetFactory.ts`: add `drawFirePet` and `drawIcePet` to the type switch in `generatePetSprites`, with one drawn case per species (19). These are hand-drawn graphics code, so this is the largest single task. Palettes: fire reds/oranges, ice blues/whites.
- Verify: Pet Book shows all 19 sprites without a missing-texture box.

### Phase 4: items
- `src/data/items.ts` and `src/data/shop.ts`, mirroring the Light/Shadow set:
  - `fire-staff`, `ice-staff` (unlock the type's basic moves)
  - `cinder-mail`, `frost-cloak` (+defense and 35% resist)
  - `fire-charm-1..3`, `ice-charm-1..3`
  - `fire-lure`, `ice-lure`
  - `fire-stone`, `ice-stone`
- `GameState.evolutionStoneFor`: add the two stones. `utils/spawn.ts`: add types to `BOOSTABLE_TYPES`. `BagUI.ts` lines ~169 and ~245: resist list and spawn-multiplier text.
- Verify: buy, equip and use each item type once.

### Phase 5: zone scenes and terrain
- `LightShadowZoneScene.ts`:
  - Level scaling: replace fixed `levelMin/levelMax` with a function of player level (the Training Zone `trainerLevel` pattern). Existing zones keep their fixed ranges.
  - Optional `hazard` config: `{ kind: 'lava' | 'ice', patchCount }`. Lava patches are static overlap zones: touching one chips 5% of the **lead pet's max HP** every 1.5 s, never below 1 HP, with a short Toast on the first hit. Ice patches slide the player. `Player.update` currently sets velocity directly, so add a smoothing option (`setSlippery(boolean)`) rather than changing normal movement. Read `Player.ts` fully before editing.
  - Obstacles currently don't avoid hazards; keep patches clear of the portal and the boss.
- `AssetFactory.ts` tiles: `tile-lava`, `tile-ice`, `tile-snow`.
- New files: `EmberreachScene.ts`, `FrostmoorScene.ts` (~35 lines each, like `SunlitMeadowsScene.ts`). Register in `config.ts`, and add to the zone list in `UIScene.ts` (~line 242).
- Exit portal: today it returns to `CastleBasementScene`. For these zones it should return to the scene they were entered from (map hub). Add `exitScene` to the zone config.

### Phase 6: bosses and the key
- `src/data/bosses.ts`: `emberlord-vulkar`, `frostqueen-hailey`, `twilight-wyrm` plus `FIRE_ICE_ZONE_BOSS_IDS`. Boss levels come from the scaling helper, not fixed numbers.
- `bossUtils.ts`: `areBothFireIceBossesDefeated()`, and a scaled-team builder (reuse the Training Zone approach).
- Rewards: unique TM, rare pet (Infernal / Permafrost) and a key-half flag per boss. Check how `Chest.ts` / flags grant Sunlit and Gloom rewards and copy it.
- `CastleRoomScene.ts`: add room id `wyrm` ("Steam Sanctum") with intro dialogue and a drop. The Wyrm's drop is open (doc question), so I'll make it a unique TM until you decide.

### Phase 7: world map
- `ui/MapUI.ts`: append Emberreach and Frostmoor beyond Shrub Woodlands, plus the arena node (locked until both bosses fall). Connections use **fixed indices**, so append to the end of the array and add `lineBetween` calls from the Shrub Woodlands node. Check the map panel width before choosing x positions.

### Phase 8: multiplayer and tooling checks
- `server/index.js` has no zone names, but `initSceneMultiplayer` runs per scene, so confirm remote players show in the new scenes.
- Run `scripts/balance_sheet.py` export once to confirm the new types, pets and moves round-trip.

## Risks

- **Sprite volume.** 19 hand-coded drawings are slow and easy to get wrong. A fallback is a tinted recolour of an existing silhouette for evolved forms.
- **Chart side effects.** Adding types to a cyclic chart shifts every existing matchup (see decision 1).
- **Dirty tree.** Building on unmerged Training Zone code, as above.
- **No test framework.** Only `tsc` and manual play exist, so verification below is manual.

## Verification

1. `npx tsc --noEmit` clean after each phase.
2. Matrix script output matches the chart.
3. Play: map to Emberreach, step on lava (HP drops, never below 1), beat Vulkar (TM, pet, key half), same for Frostmoor and ice sliding, then open the arena and beat the Wyrm.
4. Check level scaling at player levels 10, 30 and 55 (floor 20, cap 60).
5. Evolve one pet from each tier, with and without its stone.
6. Load an old save and confirm nothing breaks.

## Not included

- Real status effects (slow, weaken).
- Wild pets in the fusion arena.
- Dual-typed pets.
