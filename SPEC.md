# Unleashed — Full Game Specification

> Designed by Rog (42) and Teddy (9). Browser-based prototype. v1.0.
> Date: 2026-04-07

---

## 1. Game Overview

**Genre:** Top-down turn-based creature collector RPG
**Platform:** PC / Browser
**Players:** Single player (prototype) → Multiplayer added later
**Feel:** Prodigy Math Game meets Pokémon

The player is a young wizard who explores zones, battles wild creatures, captures pets, and defeats bosses. Pets fight alongside the player in turn-based battles. The world is colourful, friendly, and full of secrets.

---

## 2. Player Character

| Property      | Detail                                      |
|---------------|---------------------------------------------|
| Name          | Chosen by player at start                   |
| Appearance    | Choose hair type + skin colour              |
| Outfit        | Fixed: wizard outfit                        |
| Default weapon| Star staff (star in the middle)             |
| Starting moves| 2 × Normal-type attacks (no type advantage) |
| Typed attacks | Unlocked by equipping weapons/staffs        |

The player character fights in battle alongside their pets — they are an active member of the team.

---

## 3. Pets

### Pet Roster (Prototype)
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

### Team
- Active team: up to 4 creatures (player character + up to 3 pets, OR 4 pets)
- Extra pets: stored in Pet Book

### Levelling
- Pets level independently of the player
- No visible XP bar during gameplay
- Level-up notification shown after battle
- **Level cap:** 50 (prototype) — will be raised in later updates
- **XP from difficulty:** harder creatures grant more XP when defeated
- **Levelling curve:** lower-level creatures level up faster; higher-level creatures require progressively more XP per level

### Capturing
- Defeat a wild pet in battle → capture button appears
- Capture is **always guaranteed** — no random chance
- **Basic/common pets:** free to capture
- **Powerful pets:** costs coins
- Full team → captured pet goes straight to Pet Book storage
- **Quiz Tower rule:** must answer a quiz question to capture a pet here

---

## 4. Type System

```
Nature → beats → Water
Water  → beats → Rock
Rock   → beats → Wood
Wood   → beats → Nature
```

- **Normal type:** no advantages or weaknesses (player's starting attacks)
- Type advantages deal increased damage; type disadvantages deal reduced damage

---

## 5. Battle System

### Structure
- Turn-based: pick attacker → pick move → pick target
- Player chooses which of their creatures acts each turn
- Enemies have 1–4 creatures (including their character)

### Winning & Losing
- **Win:** Defeat all enemy creatures
- **Lose:** All your team is defeated
- **After battle:** All health fully regenerates

### Controls
- Mouse click OR keyboard shortcuts (1/2/3) to select moves/targets

### Battle Encounter (Overworld)
- Wild pets roam the zone
- Player walks within aggro radius → wild pet detects player
- Wild pet runs toward player (animation)
- On contact → battle begins

### Turn Actions
Each creature can either:
1. Use an attack move
2. Use an item (counts as their turn)

---

## 6. Moves & Attacks

- Player starts with 2 Normal-type moves
- Equipping a weapon/staff unlocks that weapon's typed moves
- Each pet has its own set of moves based on type and level
- Bosses have special moves not seen on regular enemies

### Miss Chance
- Every attack has a **1 in 5 chance (20%) to miss**
- A missed attack deals zero damage

### Attack Types

| Type    | How it works                                                              |
|---------|---------------------------------------------------------------------------|
| Direct  | Player chooses one target — hits that target only                         |
| Ranged  | Hits **all** of the opponent's creatures (their pets + their character)   |
| Chance  | Rolls a dice → randomly selects one target on the field. Player does not choose who gets hit |

---

## 7. Items

### Battle Items

| Item          | Effect                              | Target        |
|---------------|-------------------------------------|---------------|
| Health Potion | Heals over time (e.g. 10 HP/turn)  | Player & pets |
| Food          | Instant heal (e.g. 50–100 HP)      | Player & pets |

### Weapons & Staffs
- Found in chests OR bought in shop
- Equipping changes player's attack type

### Chests
- Found in zones and at tops of towers
- Contain: coins and/or weapons/staffs

---

## 8. Currency & Economy

| Currency | Earned By                    | Used For                               |
|----------|------------------------------|----------------------------------------|
| Coins    | Winning battles, opening chests | Weapons, staffs, items, capturing powerful pets |
| Spirits  | TBD (future)                 | Evolution system (next update)         |

- Items **cannot** be sold

---

## 9. Inventory (Bag)

- Bag icon in Mini Menu (bottom of screen)
- Click to open bag view
- **Unlimited** item storage
- Shows: all items owned, what is currently equipped, what can be equipped/de-equipped
- Player can equip and de-equip gear directly from the bag screen

---

## 10. UI Layout

### HUD (always visible)
- Coin count
- Spirit count

### Mini Menu (bottom of screen)
| Icon      | Function                        |
|-----------|---------------------------------|
| Pet Book  | Manage active team + storage    |
| Map       | View world zones                |
| Shop      | Buy items, weapons, staffs      |
| Bag       | View and manage all items       |

---

## 11. World

### Zones

| Zone                | Pet Types Found              | Notes              |
|---------------------|------------------------------|--------------------|
| Starting Town       | —                            | Hub. Key buildings |
| Leafy Forest        | Wood, Nature                 | Prototype zone. Contains sub-areas (see below) |
| Shrub Woodlands     | Wood, Nature                 | Future             |
| Stony Mountain      | Rock, occasional Wood/Nature | Future             |
| Aqua Isles          | Water, Nature                | Future             |

- Zones are finite — player reaches a border and enters the next zone
- Movement: click to move

### Leafy Forest — Sub-Areas

| Sub-Area     | Pet Types    | Description                                      |
|--------------|-------------|--------------------------------------------------|
| Main Forest  | Wood, Nature | Open woodland — the bulk of the zone             |
| Rocky Cave   | Rock         | Small cave area within the forest — Rock types spawn here |
| Forest Pond  | Water        | A pond clearing — Water types spawn here         |

This ensures all 4 pet types are accessible in the prototype's single zone.

### Starting Town — Key Buildings

| Building         | Function                                                       |
|------------------|----------------------------------------------------------------|
| Shop             | Buy weapons, staffs, Health Potions, Food                      |
| Quiz Tower       | Answer Maths/English/Science questions to advance floors. Loot chest at top. Must answer question to capture a pet here. |
| Boss Fight Tower | Defeat boss per floor to advance. Loot chest at top.           |
| Daily Spin Wheel | Spin once per real-life day. Land on a segment → receive a prize. Prizes have different rarities — common prizes appear more often, rare prizes less often. |

**Spin Wheel Prizes (by rarity):**

| Rarity | Prizes |
|--------|--------|
| Common | Coins (small amount), Food, Health Potion |
| Uncommon | Coins (larger amount), Spirits |
| Rare | Weapons / Staffs |

---

## 12. Boss Fights

- Each zone has one boss
- Boss is a trainer — they have pets AND fight themselves
- Boss is **stronger** than normal enemies: more HP, hits harder, special moves
- Boss **cannot** be captured
- **To unlock a zone boss:**
  1. Find an NPC somewhere in the zone
  2. Complete their challenge/quest
  3. Boss appears at a specific location in the zone
  4. Travel there → fight begins

---

## 13. Tutorial

1. Player spawns in Starting Town
2. Meets **Edward Dragon Master** (NPC)
3. Practice battle
4. Choose starter pet (Gravel, Leaf, Twig, or Wave)
5. Free to explore

---

## 14. Visual Style & Effects

- **Art style:** Prodigy Math Game — 2D vector cartoon, smooth outlines, bright saturated colours, rounded friendly shapes
- **View:** Top-down
- **Zone music:** Background music changes per zone
- **Battle music:** Separate battle track

### Key Visual Effects

| Moment          | Effect                                                              |
|-----------------|---------------------------------------------------------------------|
| Pet defeated    | Pet → ball of blue light → beam shoots upward → pet disappears      |
| Level up        | Notification appears after battle                                   |
| Capture         | Capture button appears after defeating wild pet                     |

---

## 15. Win Condition

### Prototype
- Defeat all bosses

### Full Game (Future)
- One boss per zone → completing all zones unlocks a final big boss
- Story mode narrative leads to the final boss
- Defeat final boss = game complete

---

## 16. Multiplayer (Post-Prototype)

- **PvP:** Battle another player's team
- **Co-op:** Two players explore the same world simultaneously
- Prototype is single player only

---

## 17. Prototype Scope — v1

### IN
- [ ] Starting Town with Shop, Quiz Tower, Boss Fight Tower
- [ ] One zone: Leafy Forest
- [ ] Tutorial (Edward Dragon Master)
- [ ] 20 pets (5 per type) — starters can be found in the wild
- [ ] Full battle system (turn-based, items, keyboard shortcuts)
- [ ] Proximity encounter system (wild pet chases player)
- [ ] Bag (unlimited, equip/de-equip)
- [ ] Pet Book (active team + storage)
- [ ] HUD (coins + spirits)
- [ ] One zone boss (unlocked via NPC quest)
- [ ] Blue light defeat animation
- [ ] Shop (weapons, staffs, potions, food)

### OUT (Later Updates)
- Zones 2–4
- Multiplayer
- Story mode & final boss
- Spirits / evolution
- Pets in shop

---

## 18. Open Questions / Future Decisions

| Topic                        | Status         |
|------------------------------|----------------|
| Pet evolution mechanics      | Spirits system — TBD |
| Individual zone boss names   | TBD            |
| NPC quest types per zone     | TBD            |
| Number of moves per pet      | TBD            |
| Damage numbers & balance     | TBD (tune during build) |
| Story / lore                 | TBD            |
| Final boss identity          | TBD            |
