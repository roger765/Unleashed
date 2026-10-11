# Light & Shadow: new types, castle basement, two new zones

## Summary
Add two new pet types (Light, Shadow) and two new zones themed on them. Access is gated behind the Castle of Masters: beat the three masters, unlock a basement, beat three basement trainers, then step through a portal to the new zones.

## Types
- **Light** and **Shadow**, each weak to the other (each deals 1.5x to the other, takes 0.5x from the other).
- Neutral (1.0x) against Nature, Water, Rock, Wood and Normal, in both directions.
- Existing four-type cycle (Nature > Water > Rock > Wood > Nature) is unchanged.
- Touches: `PetType` enum, `advantageMap` (becomes multi-target), `AssetFactory` sprites, `PetBookUI`, item attack/resist fields, pets, moves.

## Progression
1. Defeat all three Castle masters: `castle-guardian-boots`, `castle-guardian-chest`, `castle-guardian-helmet`.
2. Basement in the Castle of Masters unlocks.
3. Basement has three trainers, fought in order:
   1. **Trainer 1:** team uses all four original types (Rock, Nature, Wood, Water).
   2. **Trainer 2:** team of Light pets.
   3. **Trainer 3:** team of Shadow pets.
4. Defeating all three opens a portal.
5. The portal leads to the two new zones (Light zone, Shadow zone).

## Zones
- One Light zone and one Shadow zone, each spawning wild pets of its type (plus a few Normal).
- Added to the map UI (`MapUI.ts` zones array; append, do not insert, as connection lines use fixed indices).

## Assumptions (change if wrong)
- Zone names are placeholders: "Sunlit Meadows" (Light), "Gloomhollow" (Shadow).
- Portal is the only way in; the zones are not on the regular overworld path.
- Basement trainers are one-time fights tracked with `boss-defeated-<id>` flags, like the other bosses.
- Basement trainers count toward `ALL_REGISTERED_BOSS_IDS` but not `OVERWORLD_ZONE_BOSS_IDS` (Prism Wilds unlock unchanged).
- First pass content: about 5-6 pets and 4-5 moves per new type, one weapon and one armour piece per type.

## Decisions
- **Return:** the player can go back through the portal; it drops them in the Castle basement.
- **Zone bosses:** one boss per zone (Light boss, Shadow boss), plus one final boss that unlocks after both zones are cleared.
- **Difficulty:** content is centred on level 40, above the Castle masters (28-36).
- **Availability:** Light and Shadow pets also spawn rarely in the existing zones, and the shop sells related items.
- **Old-zone spawns:** Light and Shadow pets spawn rarely (about 1%, level-capped) in existing zones. An equipped charm raises that chance.
- **Charms:** a new equippable item category (none exists today) with its own dedicated equip slot. Charms come in tiers, and a higher tier raises the Light/Shadow spawn chance more. Needs the slot, shop entries, and a hook into the wild spawn roll. At minimum a Light and a Shadow charm in each tier. Tier count and boost values are set at the planning stage.
- **Shop:** Light and Shadow weapons, armour, capture lures and evolution stones.
- **Final boss:** a third area behind a sealed gate. Clearing each zone's boss grants a half-key; both together open the gate. The boss team has Light and Shadow pets plus one pet of each original type.
- **Charm tiers:** 3 tiers per type (Light, Shadow), boosting the spawn chance about 2x, 4x and 8x over the 1% base.
- **Lures:** a consumable that raises Light or Shadow spawn chance for a timed window; stacks with charms.
- **Evolution stones:** Light and Shadow evolutions need a stone plus the usual spirit cost.
- **Basement layout:** three separate rooms, one per trainer, matching the master chambers. Return state needs handling for the extra rooms.
- **First-pass scope:** capture support, shop items and evolution entries are included for the new pets.
