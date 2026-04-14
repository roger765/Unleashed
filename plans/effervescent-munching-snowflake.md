# Unleashed — Full Build Plan

> Browser-based top-down turn-based creature collector RPG
> Tech: Phaser 3 + TypeScript + Vite
> Designers: Rog & Teddy | Builder: Claude

---

## Project Structure

```
Unleashed/
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── src/
│   ├── main.ts                    # Phaser game bootstrap
│   ├── config.ts                  # GameConfig
│   ├── constants.ts               # Screen size, tile size
│   ├── types/                     # Interfaces & enums (pet, move, item, player, battle)
│   ├── data/                      # All game data (pets, moves, items, bosses, quizzes, xp-table, shop, spin-wheel)
│   ├── state/
│   │   ├── GameState.ts           # Singleton player state
│   │   ├── SaveManager.ts         # localStorage save/load
│   │   └── EventBus.ts            # Cross-scene communication
│   ├── scenes/
│   │   ├── BootScene.ts           # Splash
│   │   ├── PreloadScene.ts        # Asset generation + loading bar
│   │   ├── MainMenuScene.ts       # Title, New Game / Continue
│   │   ├── CharacterCreateScene.ts
│   │   ├── TutorialScene.ts       # Edward → practice battle → starter pick
│   │   ├── TownScene.ts           # Starting Town hub
│   │   ├── ForestScene.ts         # Leafy Forest (Wood/Nature)
│   │   ├── CaveScene.ts           # Rocky Cave sub-area (Rock)
│   │   ├── PondScene.ts           # Forest Pond sub-area (Water)
│   │   ├── BattleScene.ts         # Turn-based battle UI
│   │   ├── ShopScene.ts           # Buy items/weapons
│   │   ├── QuizTowerScene.ts      # Quiz floors + loot
│   │   ├── BossTowerScene.ts      # Boss gauntlet
│   │   └── UIScene.ts             # HUD overlay (coins, spirits, mini menu)
│   ├── entities/
│   │   ├── Player.ts              # Click-to-move sprite
│   │   ├── WildPet.ts             # Roaming AI + aggro detection
│   │   ├── NPC.ts                 # Dialogue trigger
│   │   └── Chest.ts               # Loot container
│   ├── battle/
│   │   ├── BattleManager.ts       # Turn sequencing, win/loss
│   │   ├── Combatant.ts           # Battle entity wrapper
│   │   ├── MoveExecutor.ts        # Damage calc, type effectiveness, miss chance
│   │   ├── BattleAI.ts            # Enemy decisions
│   │   └── CaptureManager.ts      # Post-battle capture flow
│   ├── ui/                        # Button, Panel, DialogueBox, PetBookUI, BagUI, MapUI, SpinWheelUI, HealthBar, Toast
│   ├── fx/                        # DefeatEffect (blue light), HitEffect
│   ├── assets/
│   │   └── AssetFactory.ts        # Programmatic sprite/texture generation
│   ├── audio/
│   │   ├── AudioManager.ts        # BGM/SFX manager
│   │   └── ToneGenerator.ts       # Web Audio procedural sounds
│   └── utils/                     # math helpers, tween presets
└── assets/                        # (generated at runtime — no external files needed)
```

---

## Asset Strategy

All assets generated **programmatically** — zero external dependencies:

- **Sprites**: Phaser Graphics API → `generateTexture()`. Player = circle head + rectangle body + staff. Pets = type-themed shapes (rock=angular grey, nature=green circles, wood=brown rectangles, water=blue teardrops). Each pet gets a distinct silhouette.
- **Tilemaps**: 2D arrays rendered as colored tile grids. Buildings = labeled rectangles with collision.
- **UI**: Graphics-drawn panels, buttons, bars. Nine-slice style rounded rects.
- **Audio**: Web Audio API synthesized tones. Simple chord loops for BGM, short bursts for SFX.

---

## Build Phases

### Phase 0: Project Scaffolding
- npm init, install phaser + typescript + vite
- index.html, main.ts, config.ts, constants.ts
- **Verify**: `npm run dev` → colored canvas in browser, no errors

### Phase 1: Data Layer & Game State
- All TypeScript types/enums (PetType, AttackCategory, ItemType, interfaces)
- All game data files (20 pets, ~25 moves, items, xp-table, quizzes, bosses, shop, spin-wheel)
- GameState singleton, SaveManager, EventBus, math utils
- **Verify**: Console round-trip test — create state, add pet, save, reload, confirm integrity

### Phase 2: Scenes & Asset Generation
- BootScene → PreloadScene → MainMenuScene
- AssetFactory: generates all sprites and textures programmatically
- Button and Panel UI components
- **Verify**: Main menu renders with title + New Game / Continue buttons

### Phase 3: Character Creation & Player Movement
- CharacterCreateScene (name, hair colour, skin colour)
- Player entity with click-to-move
- Test room to verify movement
- **Verify**: Create character → walk around by clicking

### Phase 4: Starting Town
- TownScene with procedural tilemap, 4 buildings (Shop, Quiz Tower, Boss Tower, Spin Wheel)
- UIScene (parallel): HUD (coins/spirits) + Mini Menu (Pet Book, Map, Shop, Bag)
- Zone exit path to forest (blocked until Phase 7)
- **Verify**: Walk around town, see HUD, interact with building doors

### Phase 5: Battle System (Core) ⭐ Largest phase
- BattleScene: full battle UI (pick attacker → pick move → pick target)
- BattleManager: turn loop, win/loss, XP awards
- MoveExecutor: damage calc, type effectiveness (1.5x/0.5x), 20% miss
- BattleAI: enemy turn logic
- Combatant: battle entity wrapper
- DefeatEffect (blue light ball → beam → disappear), HitEffect
- HealthBar animation, Toast (level-up)
- Keyboard shortcuts (1/2/3/4)
- **Verify**: Trigger test battle, full flow through to victory/defeat

### Phase 6: Tutorial
- TutorialScene: Edward Dragon Master → dialogue → practice battle → starter selection
- DialogueBox (typewriter text, portraits)
- NPC entity
- **Verify**: New game flows through complete tutorial into town

### Phase 7: Leafy Forest & Wild Encounters
- ForestScene (Wood/Nature), CaveScene (Rock), PondScene (Water)
- WildPet entity: roam AI, aggro radius, chase → battle trigger
- Zone transitions (town↔forest, forest↔cave, forest↔pond)
- **Verify**: Walk from town to forest, encounter wild pet, battle, navigate sub-areas

### Phase 8: Capture, Pet Book, Bag
- CaptureManager: post-battle capture (free for common, coins for powerful)
- PetBookUI: active team + storage, swap pets
- BagUI: view items, equip/de-equip weapons (changes player's battle moves)
- MapUI: zone layout, current location
- Wire Mini Menu buttons
- **Verify**: Capture pet, manage team, equip weapon → see new moves in battle

### Phase 9: Shop, Battle Items, Economy
- ShopScene: buy weapons/potions/food
- Battle item usage (Health Potion = HoT, Food = instant heal) as turn action
- Coin rewards from battles (scaled by difficulty)
- Chest entity in zones
- **Verify**: Buy item, use in battle, earn coins from victory, open chest

### Phase 10: Quiz Tower
- QuizTowerScene: floor progression, multiple-choice questions, quiz-capture mechanic
- 30+ questions across Maths/English/Science
- Loot chest at top
- **Verify**: Enter tower, answer questions, progress floors, get loot

### Phase 11: Boss Fights
- BossTowerScene: multi-floor boss gauntlet
- Zone boss in ForestScene (NPC quest → boss unlock → fight)
- Enhanced BattleAI for bosses
- **Verify**: Complete tower floors, complete zone quest, defeat zone boss

### Phase 12: Daily Spin Wheel
- SpinWheelUI: animated wheel, weighted prizes, 24h cooldown
- **Verify**: Spin, receive prize, blocked on re-spin until next day

### Phase 13: Audio & Polish
- AudioManager + ToneGenerator (procedural BGM per zone + battle, SFX)
- Smooth scene transitions (fade)
- Camera deadzone + lerp
- Particle effects, type-coloured text, battle entrance animation
- **Verify**: Audio plays and crossfades, transitions are smooth

### Phase 14: Save/Load & Win Condition
- Auto-save on key events, manual save from pause menu
- Continue from main menu restores full state
- Win condition: defeat zone boss → congratulations → postgame continues
- Pause menu (Escape): Resume, Save, Volume, Quit to Menu
- Edge cases: lose → return to town, empty team guards, insufficient coins
- **Verify**: Full playthrough: tutorial → explore → battle → capture → shop → towers → boss → win. Save, reload, resume.

---

## Architecture Decisions

1. **Parallel UIScene** — HUD persists across world scenes without recreation
2. **Singleton GameState** — lives outside scenes, serializable for save/load
3. **EventBus** — decouples scenes (e.g. `coins-changed` updates HUD)
4. **Battle logic separated from rendering** — BattleManager/MoveExecutor are pure logic; BattleScene handles UI only
5. **Data-driven content** — all pets/moves/items/quizzes in `src/data/`; balancing never touches game logic
6. **AssetFactory** — single point to swap generated art for real art later (same texture keys)
7. **Arcade Physics** — gravity: 0, used for click-to-move and pet chase/collision

---

## Verification (End-to-End)

Full playthrough checklist:
- [ ] New Game → Character Creation → Tutorial → Choose starter
- [ ] Walk around Starting Town, enter all buildings
- [ ] Walk to Leafy Forest, encounter wild pets, win battle
- [ ] Capture a pet, view in Pet Book, swap team members
- [ ] Visit Rocky Cave and Forest Pond, encounter type-specific pets
- [ ] Buy items from Shop, use in battle
- [ ] Open treasure chests
- [ ] Complete Quiz Tower
- [ ] Progress through Boss Fight Tower
- [ ] Complete zone quest, defeat zone boss
- [ ] Spin daily wheel
- [ ] Level up to near-cap, experience XP curve
- [ ] Save, close, reopen, Continue — state preserved
- [ ] Win condition triggers after all bosses defeated
