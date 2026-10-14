# Training Zone plan

## Summary
A new room off the Castle of Masters hall with 3 trainers (each stronger than the last). Pressing R on a trainer opens a mode picker (Standard / Sparring / Handicap / Endurance) and then starts the fight. All trainers are open from the start and can be rebattled. Trainer levels scale with the player.

## What exists today (relevant findings)
- Boss fights: `CastleRoomScene` builds a team with `buildBossEnemyTeam(boss)` and starts `BattleScene` with a `BattleConfig` (`src/battle/BattleManager.ts`).
- Rewards and result screen live in `BattleScene.showBattleOver` (`src/scenes/BattleScene.ts` ~772): coins, XP split across alive pets, HP synced back with `syncPetHpFromBattle`. A loss sends the player to Town.
- `calculateRewards()` in `BattleManager` computes XP and coins from enemy levels.
- Moves are taught through `tm-<moveId>` items (generated in `src/data/items.ts`); pets are added with `gs.addPetToTeam` / `addPetToStorage`.
- Scenes are registered in `src/config.ts`. First-clear tracking uses `gs.setFlag` / `getFlag`.
- The Castle hall (`CastleOfMastersScene`) has the basement stairs on the west wall (cols 1-2, rows 10-12). The east wall is free.

## Design

### Entrance
Door on the east wall of the Castle hall (mirror of the basement stairs), always open, labelled "Training Zone ->". Exit from the zone returns to the hall.

### Scene: `TrainingZoneScene` (new, `src/scenes/TrainingZoneScene.ts`)
- One room, 3 trainer NPCs spaced across it, weakest on the left to strongest on the right.
- Each shows "E: talk   R: fight" (same pattern as `CastleRoomScene`).
- R opens the mode picker modal (4 buttons plus a short description each, and a Cancel button).
- Registered in `src/config.ts`.

### Trainer data (new, `src/data/trainers.ts`)
```
ITrainerDefinition { id, name, intro[], levelOffset, team: petTemplateId[], specialMoveIds,
                     firstWinRewards: { tmMoveId, itemId?, petTemplateId? } }
```
- 3 trainers, team sizes 1 / 2 / 3 pets, level offsets about -3 / 0 / +4 from the player level (clamped 1-50).
- At fight time the definition is turned into an `IBossDefinition` and run through the existing `buildBossEnemyTeam` + `applyBossSpecialMoves`, so no new enemy-building code.
- Exact names, pets, moves and dialogue are picked at implementation time from `pets.ts` and `moves.ts`.

### Modes
Add `training?: { trainerId, mode, round, totalRounds }` to `BattleConfig`.

| Mode | Rule | Rewards |
|------|------|---------|
| Standard | Normal fight | 1.0x coins and XP |
| Sparring | Pet HP restored to pre-fight values afterward, no penalty for fainting | 0 coins, 0.5x XP |
| Handicap | You plus your first pet only, no items | 1.5x coins and XP |
| Endurance | 3 rounds back to back, HP carries over, fresh enemy team each round | 2.0x coins and XP, paid out once at the end |

- A loss in any training mode returns you to the Training Zone (not Town).
- First win (any mode except Sparring) against each trainer grants a unique TM, plus an item or a pet, tracked by flag `training-first-win-<id>`.

### Changes to existing code
- `BattleManager.ts`: `training` on `BattleConfig`; reward multiplier in `calculateRewards`.
- `BattleScene.ts`: Sparring HP restore, Handicap item lock, Endurance chaining, first-win rewards panel, loss return scene.
- `CastleOfMastersScene.ts`: east door and label.
- `config.ts`: register scene.
- `bosses.ts` / `bossUtils.ts`: unchanged (reused).

### Not included
- Multiplayer sync beyond the existing `initSceneMultiplayer` hooks.
- New art; trainers reuse an existing NPC sprite (as `CastleRoomScene` does with `npc-edward`).

## Verification
1. `npx tsc --noEmit` clean.
2. Run the dev server, walk Castle hall -> Training Zone, and fight each trainer in each mode.
3. Check: level scaling at two player levels, Sparring leaves HP unchanged, Handicap blocks items, Endurance runs 3 rounds and pays once, first-win rewards pay once, loss returns to the zone.

## Defaults I chose (change any of these)
- Level offsets -3 / 0 / +4, team sizes 1 / 2 / 3.
- Coins: none in Sparring.
- First-win reward is not given for Sparring.
- Endurance is 3 rounds.
