# Unleashed — Game Design Document

> A top-down, click-to-move, turn-based creature collector RPG.
> Designed by Rog (42) and Teddy (9). First game. Target platform: PC/browser.

---

## DOD Check — Design Status

- [x] Core concept & genre
- [x] Player character
- [x] Starter pets
- [x] Type system
- [x] Battle system basics
- [x] Items
- [x] Economy
- [x] World zones
- [x] Inventory system
- [x] Controls & platform detail
- [x] Art style & sound
- [x] Win condition (big picture)
- [x] Multiplayer detail
- [x] Boss fight structure
- [x] Capture mechanic detail
- [x] Prototype scope locked

---

## 1. Core Concept

- Pokémon-style creature collector RPG
- Top-down view, click-to-move
- Single player OR multiplayer (multiplayer details TBD)

---

## 2. Player Character

- Player chooses: name, hair type, skin colour
- Fixed wizard outfit
- Default weapon: star staff (star in the middle)
- Can fight alongside their pets in battle
- Starts with 2 Normal-type attacks (no type advantage/weakness)
- Equipping weapons/staffs unlocks typed attacks

---

## 3. Pets

### Roster (Prototype)
- **20 pets total** — 5 per type (Rock, Nature, Wood, Water)
- Starter pets can also be found in the wild
- Names TBD — naming session pending

### Starter Pets (choose one from Edward Dragon Master)

| Name   | Type   |
|--------|--------|
| Gravel | Rock   |
| Leaf   | Nature |
| Twig   | Wood   |
| Wave   | Water  |

---

## 4. Type System

Four types in a balanced circle:

```
Nature → beats → Water
Water  → beats → Rock
Rock   → beats → Wood
Wood   → beats → Nature
```

- Normal type = no advantages or weaknesses (player's starting attacks)

---

## 5. Battle System

- Turn-based: pick attacker → pick move → pick target
- Player selects which pet or character to act each turn
- Up to 4 creatures on your team (managed in Pet Book outside battle)
- Enemies have 1–4 creatures including their own character
- Win = defeat all opponents
- Lose = all your team defeated
- Health fully regenerates after every battle
- Items can be used in battle as your turn action instead of attacking

### Miss Chance
- Every attack has a 1 in 5 chance (20%) to miss → deals zero damage

### Attack Types
- **Direct:** Player chooses one target — hits that target only
- **Ranged:** Hits all of the opponent's creatures (their pets + their character) — does NOT hit your own team
- **Chance:** Randomly targets one creature — dice roll, player does not choose

---

## 6. Battle Items

| Item           | Effect                          | Target        |
|----------------|---------------------------------|---------------|
| Health Potion  | Heals over time (e.g. 10 HP/turn) | Player & pets |
| Food           | Instant heal (e.g. 50–100 HP)  | Player & pets |

---

## 7. Levelling

- No visible XP bar during gameplay
- Level up notification appears after battle when it occurs
- Pets level separately from player
- **Level cap:** 50 (prototype) — raised in later updates
- **XP from difficulty:** harder creatures grant more XP when defeated
- **Levelling curve:** lower-level creatures level up faster; higher levels require progressively more XP

---

## 8. Currency & Economy

| Currency | Used For                                         |
|----------|--------------------------------------------------|
| Coins    | Buying weapons, staffs, items, capturing pets    |
| Spirits  | Future evolution system (next update)            |

- Earning coins: winning battles, opening chests
- Cannot sell items

---

## 9. Shop (Prototype)

- Weapons & staffs
- Health Potions & Food
- Pets NOT available in prototype (future update)

---

## 10. Weapons & Staffs

- Bought in shop OR found in chests
- Chests also contain coins
- Equipping different gear changes player's attack type

---

## 11. World Zones

| Zone               | Pet Types Found                  |
|--------------------|----------------------------------|
| Starting Town (hub)| —                                |
| Leafy Forest       | Wood, Nature (+ sub-areas below) |
| Shrub Woodlands    | Wood, Leaf (Nature)              |
| Stony Mountain     | Rock, occasional Wood/Nature     |
| Aqua Isles         | Water, Nature                    |

- Zones are finite — you reach a border and enter next zone
- Movement: click to move

### Leafy Forest — Sub-Areas

| Sub-Area     | Pet Types    | Description                              |
|--------------|-------------|------------------------------------------|
| Main Forest  | Wood, Nature | Open woodland — bulk of the zone         |
| Rocky Cave   | Rock         | Small cave within the forest             |
| Forest Pond  | Water        | Pond clearing — Water types spawn here   |

---

## 12. Starting Town — Key Buildings

| Building         | Function                                                                 |
|------------------|--------------------------------------------------------------------------|
| Quiz Tower       | Answer questions (Maths, English, or Science) to advance floors. Loot chest at top |
| Boss Fight Tower | Defeat boss per floor to advance. Loot chest at top                     |
| Daily Spin Wheel | Spin once per real-life day. Prize depends on where the wheel lands.    |

---

## 13. HUD (On-Screen Always)

- Coin count
- Spirit count

---

## 14. Mini Menu (Bottom of Screen)

- Pet Book
- Map
- Shop
- Bag

---

## 15. Capturing Pets

- Defeat creature in battle → capture button appears
- Costs coins to capture
- Quiz Tower: must answer a question to capture a pet

---

## 16. Tutorial

- Spawn in → meet Edward Dragon Master → practice battle → choose starter

---

## 17. Inventory System

- Bag icon lives in the Mini Menu (bottom of screen)
- Click it to open your bag and see all items
- Unlimited item storage — keep everything you find
- Shows what is currently equipped
- Shows what can be equipped
- Items can be equipped and de-equipped from the bag screen

---

## 18. Controls & Platform

- Platform: PC/browser
- World movement: click to move
- Battle input: mouse click OR keyboard shortcuts (press 1/2/3 to pick moves)
- Battle trigger — proximity encounter:
  - Player walks within range of a wild pet
  - Wild pet detects the player and runs toward them (animation)
  - On contact → battle begins

---

## 19. Art Style & Sound

### Art Style
- Reference: Prodigy Math Game
- Style: 2D vector cartoon — smooth clean outlines, bright saturated colours, rounded friendly shapes, expressive characters
- Top-down world view consistent with this style

### Sound
- Reference: Prodigy Math Game audio style (upbeat, magical, fun)
- Background music changes depending on which zone the player is in
- Battle music separate from exploration music
- Sound effects: hits, level-up, capture, etc.

### Visual Effects
- **Pet defeat animation:** Pet collapses into a ball of blue light → a beam of blue light shoots upward → pet disappears from the field

---

## 20. Win Condition

### Prototype Win Condition
- Defeat all the bosses

### Full Game (Future)
- One boss per zone
- After all zones are cleared → a final big boss unlocks
- Story mode connected to the final boss arc
- **TBD:** Full story details to be designed later

---

## 21. Multiplayer

- PvP battles: players can fight each other with their teams
- Co-op exploration: two players in the same world at the same time
- Both modes intended for the full game
- **Prototype:** Single player only — multiplayer added after prototype is complete

---

## 22. Boss Fight Structure

- Boss is a trainer — they have their own pets plus fight alongside them
- Boss cannot be captured
- Boss is stronger than regular enemies: extra health, hits harder, has special moves
- To unlock the boss: player must complete a task within the zone first
- After completing the task, the boss appears at a specific area inside that zone
- Player travels to that area and the fight begins there (not in the Boss Fight Tower)
- **Task to unlock boss:** Find an NPC in the zone → they give you a challenge or quest → complete it → boss unlocks

### Note on Boss Fight Tower (Starting Town)
- Separate from zone bosses — this is a standalone challenge tower in town
- Floor-by-floor boss gauntlet with loot chest at the top

---

## 23. Capture Mechanic Detail

- Defeat a wild pet in battle → capture button appears
- **Capture is always guaranteed** — no random chance of failure
- **Cost by rarity:**
  - Basic/common pets → free to capture
  - Powerful pets → costs coins
- **Full team rule:** If your active team already has 4 pets, the new pet goes straight into the Pet Book (storage)
- Quiz Tower special rule: must answer a quiz question to capture a pet there

---

## 24. Prototype Scope

### IN — Prototype v1
- Starting Town hub with Shop, Quiz Tower, Boss Fight Tower
- One explorable zone: Leafy Forest
- Tutorial with Edward Dragon Master
- 20 pets (5 per type) — starters can be found in the wild
- Full battle system (turn-based, items, mouse + keyboard shortcuts)
- Proximity encounter — wild pet chases player → battle starts
- Bag (unlimited, equip/de-equip), Pet Book, HUD (coins + spirits)
- One zone boss (unlocked via NPC quest)
- Blue light defeat animation

### OUT — Added Later
- Remaining zones (Shrub Woodlands, Stony Mountain, Aqua Isles)
- Multiplayer (co-op + PvP)
- Story mode & final boss
- Spirits / evolution system
- Pets available in shop
