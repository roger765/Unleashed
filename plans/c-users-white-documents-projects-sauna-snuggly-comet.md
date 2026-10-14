# Lighting consultant review: fixture-by-fixture validation, then re-procure

## Context
Rog reviewed the 14 Oct procurement output and found the inputs weren't properly vetted. Specifically:
- The procurement agents searched against the generic performance specs in `Lighting Fixture Schedule.xlsx` (Rev A, 8 Oct 2026). They never had the actual Allera reference products.
- Those reference products are almost all **Unios**, an Australian brand: Ion R, EQ Comfort, Kobe G2, Vespa G2, Akira G2, Titanium, Halo, Luna Flex, Pluto, Firefly, Kipos.
- Unios products often have phase-cut options and are sold by AU retailers. Hence the poor hit rate last round.
- Some Rev A specs also drifted from Allera's intent. For example, Allera's D1 is IP54 at 2700K, while D2 and D3 (EQ Comfort) are 3000K only and IP44.

I now act as lighting consultant. We walk through **every code on the Allera plan**, one decision at a time, in interview mode. The output is a new version of the fixture schedule. Then procurement is re-run against the validated schedule.

- **Working folder (from now on):** `C:\Users\white\Documents\Projects\Sauna Club\Build\Procurement\09 - Electrical & Lighting\Local Lighting\`
- **Primary input:** `Build\Architectural finish schedules\Allera Lighting Plan.pdf` (Rev 2, layout and legend), plus `Allera lighting VM SAUNA CLUB SELECTION SCHEDULE 05.06.26.pdf` (codes, IP, qty, dimming).
- **Primary output:** a new version of `Local Lighting\Lighting Fixture Schedule.xlsx`.

## Standing rules (apply to every decision)
- **Colour temperature:**
  - Venue (guest-facing) areas are **2700K**.
  - **Task lighting** goes in back-of-house work areas: office, laundry, plant room, and probably store/bins, prep and kitchen, to confirm when we reach them. Task means higher output, even and uniform, and neutral CCT acceptable.
- Every fitting must be phase-cut (trailing edge) dimmable, wired back to the central dimming point. No DALI.
- AU supplier and RCM only. No IP substitution downward.
- Beam angle can flex.
- Drivers are sourced later with the electrician.

## Prescriptive in function, not fixture (Rog, 14 Oct)
- Questions confirm the **light's job, location, ambience and critical specs**: aperture, output, beam, CCT, CRI, IP, glare and dimming.
- No brand or model choices in the interview. Allera products are style and performance references only. Product selection happens in procurement.

## Interview format, one fixture per turn
For each code I present a short context card:
1. **Where:** rooms and quantities, counted from the Allera plan.
2. **Allera intent:** product, wattage, beam, CCT, IP and finish, from the legend and the VM schedule.
3. **Rev A schedule says:** and any drift from Allera.
4. **Consultant check:** against the standing rules (CCT, task vs venue, IP for the location, phase-cut availability, CRI, glare), plus anything the location demands, such as wet zones, heat or sightlines.
5. **Recommendation:** keep the Allera product, keep it and change a parameter, or switch to an alternative.

Then **one AskUserQuestion with one decision**, with the recommended option first. A fixture with two separate issues gets two consecutive questions, never a combined one.

After each answer, append the decision to `Local Lighting\Lighting Review Decision Log.md`. Record the code, decision, reason, and date. This keeps progress even if the session is interrupted.

## Fixture order and known context (from plan read)
| # | Code | Where (plan) | Allera product | Known issue to raise |
|---|---|---|---|---|
| 1 | D1 | Laundry 2, DDA 2, Prep 2 | Unios Ion R Medium 13/15W, 60°, 2700K, IP54, 92mm | Laundry and Prep are task areas: CCT, output, beam |
| 2 | D2 | Plant 2, Store/Bins 2 | EQ Comfort 10W, 60°, 3000K, IP44, 92mm | Task lighting. Rev A made it switched-only at IP20 |
| 3 | D3 | Male 4, Female 4, Changerooms 2, Cafe 3, Kitchen 6, corridors/retail 4 | EQ Comfort 60 8W, 50°, 3000K, IP44, 54mm | EQ Comfort is 3000K/4000K only, which conflicts with the 2700K venue rule. Kitchen is a task area. Rev A's showers IP65 split doesn't match the plan |
| 4 | D4 | Town Square / Grandstand handrails, 4 + 4 | Planet Lighting Snap 1.4W asymmetric, 2700K | Phase-cut availability. Balustrade detail |
| 5 | D5 | Canyon Plunge, aimed accent | Unios Kobe G2 15W, 15°, honeycomb, IP20 | Rev A lifted it to IP65 over the pool. Confirm |
| 6 | D6 → SVC | Hearth 6, Retreat 3 (scrapped) | Planet SOLO RGBW | Replace with sauna service light: type, qty, control |
| 7 | CL1 | Changerooms / lockers circulation, 4 | Unios Akira G2 direct/indirect 144W | Rev A added IP44 (Allera had none). Validate |
| 8 | P1 | Reception desk, 1 | Southdrawn Tile Linear 2560mm, terracotta | Price ($2.1k) vs alternatives |
| 9 | P2 | Towel Drop, 1 | Unios Titanium Starlight 5W, 800mm, black | Confirm |
| 10 | W1 | Above doorways, 9 (owned Ecojas) | was RBW Pastille | Ecojas 0-10V driver vs phase-cut (cross-cutting decision) |
| 11 | W2 | Male 3, Female 3, Waiting/Retail 2, Cafe 3, other 1 (owned Ecojas) | was Unios Pluto Medium | Suitability in wet vanity zone, IP54 |
| 12 | W3 | Changeroom cubicles and showers 10 (owned Ecojas) | was Unios Pluto Small | Shower-zone IP: Ecojas IP54 |
| 13 | W4 | Town Square beams, 6 clusters of 4 = 24 | Unios Vespa G2 Large 36W, 45x120°, IP65 | Vespa is 3000K/4000K and CRI 80+, which conflicts with 2700K/CRI90 |
| 14 | W5 | Refreshment 3, Studio 2, Towel Drop 1 (owned Ecojas) | was Lip Wall Light 24W | Studio may need task or flexible light |
| 15 | W6 | Step Ramp, 2 | Unios Nola step light 3W, 3000K, 24V | Unfunded. 3000K vs 2700K |
| 16 | L1 | Hearth and Retreat sauna perimeter (owned Ecojas RGBW) | Luna Flex Mini SAUNA | Owned. DMX in cabins vs central phase-cut |
| 17 | L2 | Canyon planters 2, changeroom bench 1 | Luna Flex Mini 10W/m IP68 | Rev A says IP67. Allera VM says IP68 |
| 18 | L3 | Showers over heads, changerooms south wall, female, reception edge | CR100 plaster-in + Halo 12W/m | Allera drawing error L3/L4 at Platform Lounge (open item 5) |
| 19 | L4 | Canyon Plunge north wall, Refreshment | Halo Super High 12–15W/m IP67 + channel | Confirm |
| 20 | L5 | Entry vestibule | Luna Flex Top RGBW 13W/m | Use spare owned Ecojas strip? |
| 21–23 | G1–G3 | Garden planters (owned Ecojas) | Firefly / Kipos | Owned, 24V, 3000K outdoor. Confirm 3000K is acceptable outdoors |

The cross-cutting decisions (Ecojas 0-10V drivers, DMX in the saunas) are each asked once, at the first fixture they affect, and then applied wherever else they come up.

## Output: Lighting Fixture Schedule, Rev B
- Before overwriting, back up the current file as `Lighting Fixture Schedule - Rev A.xlsx`. The file is open in Excel (lock file present), so ask Rog to close it before writing.
- Keep the Rev A tab structure: Fixture Schedule, Wall Light Allocation, Drivers & Control Gear, Open Items, Quantity Reconciliation.
- Add columns: **Reference product (Allera)**, **Decision (keep / modify / alternative)**, **Approved alternative**, **Decision note**.
- Update the header to Revision B, 14 Oct 2026, with control set to phase-cut central dimming and DALI/DMX removed per the decisions.
- Build with the existing scratchpad venv (openpyxl). Use the pattern from `scratchpad\build_cart.py`.

## Then: re-run procurement
- The approach is set once the schedule is approved, but follows this outline:
  - Brief Sonnet agents with the **exact reference product plus the approved spec**. Search the reference brand's AU stockists first (Unios via Urban Lighting, Special Lights, Allera-independent stockists), then equivalents.
  - Regenerate the cart and the RFQ (dot points, pictures, no supplier names) in the new folder.
- The superseded 14 Oct cart, RFQ and shortlist in `Local Lighting\` are replaced, not edited.

## Verification
- The decision log has one entry per Allera code, with no gaps.
- Rev B quantities reconcile against the plan counts. Re-count from the plan render.
- Every Rev B line passes the standing rules: CCT per zone, phase-cut, IP equal or higher than the location needs.
- Open Rev B and re-read it with openpyxl to confirm headers and rows, then show Rog a summary before procurement starts.
