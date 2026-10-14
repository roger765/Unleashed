# Plan: Mobile-Friendly Unleashed

## Context

The Unleashed game runs on Phaser 3.80 with a 1280×720 canvas and `Scale.FIT`. It already handles touch input (click-to-move, dialogue advance via tap), but lacks:
- Portrait mode protection
- On-screen buttons for keyboard shortcuts (E, R)
- Browser touch interference prevention
- Mobile-friendly text input for the character name screen
- Adequate touch target sizing on HUD buttons

**Goal:** Make the game navigable, interactable, and visually correct on tablet/mobile without altering desktop behaviour.

---

## Implementation Plan

### Phase 1 — `index.html` (zero risk, pure addition)

Update the viewport meta to block pinch-zoom and page scroll:
```html
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

Add to the `<style>` block:
```css
body, #game, canvas {
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  overscroll-behavior: none;
}
canvas { -webkit-touch-callout: none; }

#rotate-prompt {
  display: none;
  position: fixed; inset: 0; z-index: 9999;
  background: #1a1a2e;
  flex-direction: column; align-items: center; justify-content: center;
  color: #fff; font-family: Arial, sans-serif; font-size: 22px;
  text-align: center; gap: 24px;
}
#rotate-prompt svg { width: 64px; height: 64px; fill: #3498db;
  animation: rotate-hint 2s ease-in-out infinite; }
@keyframes rotate-hint {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-90deg); }
}
@media (orientation: portrait) {
  body.touch-device #rotate-prompt { display: flex; }
}
```

Add before `<div id="game">`:
```html
<div id="rotate-prompt">
  <svg viewBox="0 0 24 24">
    <path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48H24L20 15l-4-4h3c-.36-2.77-2-5.14-4.31-6.63l1.79-1.85zM4 9l4 4H5c.36 2.77 2 5.14 4.31 6.63l-1.79 1.85C4.23 19.93 1.89 16.76 1.53 13H0l4-4z"/>
  </svg>
  <span>Please rotate your device to landscape</span>
</div>
```

---

### Phase 2 — `src/main.ts` (3 lines)

Add before `new Phaser.Game(gameConfig)`:
```ts
if (navigator.maxTouchPoints > 0) {
  document.body.classList.add('touch-device');
}
```

---

### Phase 3 — `src/utils/mobile.ts` (new file)

```ts
export function isTouchDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}
```

---

### Phase 4 — `src/scenes/UIScene.ts`

**Critical file:** `src/scenes/UIScene.ts` — HUD buttons at lines 100–116, shutdown handler at lines 138–141.

#### 4a. Larger HUD hit areas

The 5 bottom-bar icons use `ICON_SIZE = 32`. On touch, 32px is too small. Replace:
```ts
.setInteractive({ useHandCursor: true })
```
with:
```ts
.setInteractive(
  new Phaser.Geom.Rectangle(-28, -28, 56, 56),
  Phaser.Geom.Rectangle.Contains,
)
.setData('cursor', 'pointer')
```

#### 4b. On-screen E/R floating action buttons

Add private fields:
```ts
private mobileEBtn: Phaser.GameObjects.Container | null = null;
private mobileRBtn: Phaser.GameObjects.Container | null = null;
```

At end of `create()`, after the keyboard ESC listener (line ~135):
```ts
if (isTouchDevice()) {
  this.createMobileActionButtons();
}
```

EventBus cleanup in the existing `shutdown` handler (add to lines 138–141):
```ts
EventBus.off('mobile-action-show', undefined, this);
EventBus.off('mobile-action-hide', undefined, this);
```

New private method:
```ts
private createMobileActionButtons(): void {
  this.mobileEBtn = this.makeFab(
    SCREEN_WIDTH - 80, SCREEN_HEIGHT - 120, 'E', 0x27ae60,
    () => EventBus.emit('mobile-interact'),
  );
  this.mobileEBtn.setVisible(false);

  this.mobileRBtn = this.makeFab(
    SCREEN_WIDTH - 80, SCREEN_HEIGHT - 60, 'R', 0xc0392b,
    () => EventBus.emit('mobile-fight'),
  );
  this.mobileRBtn.setVisible(false);

  EventBus.on('mobile-action-show', (data: { showE: boolean; showR: boolean }) => {
    this.mobileEBtn?.setVisible(data.showE);
    this.mobileRBtn?.setVisible(data.showR);
  }, this);

  EventBus.on('mobile-action-hide', () => {
    this.mobileEBtn?.setVisible(false);
    this.mobileRBtn?.setVisible(false);
  }, this);
}

private makeFab(x: number, y: number, label: string, color: number, cb: () => void) {
  const SIZE = 56;
  const c = this.add.container(x, y).setScrollFactor(0).setDepth(500);
  const bg = this.add.graphics();
  bg.fillStyle(color, 0.85);
  bg.fillCircle(0, 0, SIZE / 2);
  bg.lineStyle(2, 0xffffff, 0.4);
  bg.strokeCircle(0, 0, SIZE / 2);
  c.add(bg);
  c.add(this.add.text(0, 0, label, {
    fontSize: '22px', fontFamily: 'Arial Black, Arial', color: '#ffffff',
  }).setOrigin(0.5));
  c.setSize(SIZE, SIZE);
  c.setInteractive(new Phaser.Geom.Circle(0, 0, SIZE / 2), Phaser.Geom.Circle.Contains);
  c.on('pointerdown', () => { AudioManager.playSFX('click'); cb(); });
  return c;
}
```

---

### Phase 5 — Six world scenes (ForestScene + 5 others)

All six scenes follow the same pattern. Changes per scene:

**New import:**
```ts
import { isTouchDevice } from '../utils/mobile';
import { EventBus } from '../state/EventBus';
```

**New class field:**
```ts
private nearNpc = false;
```

**In `create()`, after `interactKey` / `fightKey` setup (e.g. ForestScene line ~218):**
```ts
if (isTouchDevice()) {
  EventBus.on('mobile-interact', this.onMobileInteract, this);
  EventBus.on('mobile-fight', this.onMobileFight, this);
}
this.events.on('shutdown', () => {
  EventBus.off('mobile-interact', this.onMobileInteract, this);
  EventBus.off('mobile-fight', this.onMobileFight, this);
  EventBus.emit('mobile-action-hide');
});
```

**New private handler methods (ForestScene example):**
```ts
private onMobileInteract(): void {
  if (this.forestQuestNpc && !this.forestDialogueBlocking) {
    this.forestQuestNpc.interact();
  }
}
private onMobileFight(): void {
  // Same guard as fightKey path in update()
  if (!this.forestDialogueBlocking) {
    this.startBossBattle(); // or equivalent fight starter
  }
}
```

**In `update()`, inside the `near` block (ForestScene lines ~238–263), after the existing keyboard logic:**
```ts
// Edge-triggered: emit once on enter, once on exit
if (near) {
  // ... existing code unchanged ...
  if (!this.nearNpc && isTouchDevice()) {
    const canFight = /* same flag check as fightKey block */;
    EventBus.emit('mobile-action-show', { showE: true, showR: canFight });
  }
  this.nearNpc = true;
} else {
  if (this.nearNpc && isTouchDevice()) {
    EventBus.emit('mobile-action-hide');
  }
  this.nearNpc = false;
  // ... existing hidePrompt() call unchanged ...
}
```

The `!this.nearNpc` guard ensures the EventBus fires once per proximity change, not 60×/sec.

---

### Phase 6 — `src/scenes/CharacterCreateScene.ts`

**Problem:** `this.input.keyboard!.on('keydown', ...)` at line 105 fires only on physical keyboards — silent on mobile.

**Solution:** On touch devices, inject an invisible `<input type="text">` DOM element. `font-size: 16px` is critical — iOS Safari zooms the viewport when any input with smaller font-size is focused.

Add field:
```ts
private domInput: HTMLInputElement | null = null;
```

Extract the keyboard handler block (lines 105–116) into `private setupKeyboardInput()` — no logic changes.

After drawing `inputBg` and `nameText`, replace the keyboard call with a conditional:
```ts
if (isTouchDevice()) {
  this.setupDomInput(cx, inputY);
} else {
  this.setupKeyboardInput();
}
```

New method (note: `inputY` = `topY + 30` = computed in `create()`):
```ts
private setupDomInput(cx: number, inputY: number): void {
  const canvas = this.game.canvas;
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / SCREEN_WIDTH;
  const scaleY = rect.height / SCREEN_HEIGHT;

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = MAX_NAME_LENGTH;
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');

  input.style.cssText = [
    'position: fixed',
    `left: ${rect.left + (cx - 130) * scaleX}px`,
    `top: ${rect.top + (inputY - 18) * scaleY}px`,
    `width: ${260 * scaleX}px`,
    `height: ${36 * scaleY}px`,
    'opacity: 0',
    'font-size: 16px',    // prevents iOS Safari viewport zoom on focus
    'border: none',
    'background: transparent',
    'color: transparent',
    'caret-color: transparent',
    'z-index: 100',
    'outline: none',
  ].join('; ');

  input.addEventListener('input', () => {
    this.playerName = input.value
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .slice(0, MAX_NAME_LENGTH);
    input.value = this.playerName;
    this.refreshNameDisplay();
    this.updateConfirmButton();
  });

  document.body.appendChild(input);
  this.domInput = input;

  // Tap on the visual input box → focus the DOM input (opens mobile keyboard)
  const zone = this.add.zone(cx, inputY, 260, 36).setInteractive();
  zone.on('pointerdown', () => input.focus());

  this.time.delayedCall(400, () => input.focus());

  this.events.on('shutdown', () => {
    this.domInput?.remove();
    this.domInput = null;
  });
}
```

---

### Phase 7 — `src/scenes/BattleScene.ts` (minor)

Battle already works via touch (buttons use `pointerdown`). Only fix is tap target size.

Add import:
```ts
import { isTouchDevice } from '../utils/mobile';
```

Add class fields:
```ts
private btnH = 40;
private btnStep = 52;
```

Set in `create()`:
```ts
this.btnH = isTouchDevice() ? 52 : 40;
this.btnStep = this.btnH + 12;
```

Replace hardcoded `height: 40` and `i * 50` spacing in `showSelectAttacker`, `showSelectMove`, `showSelectTarget`, `showItemSelect`, and `showItemTargetSelect` with `this.btnH` and `i * this.btnStep`.

---

## Files Changed

| File | Type |
|---|---|
| `index.html` | Viewport, CSS, rotate prompt HTML |
| `src/main.ts` | +3 lines: body class for touch detection |
| `src/utils/mobile.ts` | New utility file |
| `src/scenes/UIScene.ts` | Larger hit areas, FAB buttons, EventBus wiring |
| `src/scenes/ForestScene.ts` | Mobile EventBus, proximity emit |
| `src/scenes/ShrubWoodlandsScene.ts` | Same pattern |
| `src/scenes/StonyMountainsScene.ts` | Same pattern |
| `src/scenes/AquaIslesScene.ts` | Same pattern |
| `src/scenes/CaveScene.ts` | Same pattern |
| `src/scenes/PondScene.ts` | Same pattern |
| `src/scenes/CharacterCreateScene.ts` | DOM input branch for mobile |
| `src/scenes/BattleScene.ts` | Computed button height |

**Not changed:** `constants.ts`, `config.ts`, `Player.ts`, `NPC.ts`, `Button.ts`, `Panel.ts`, `DialogueBox.ts`, `EventBus.ts`

---

## Verification

1. `npm run dev` → open on phone/tablet or Chrome DevTools mobile emulation (375×667 or 768×1024)
2. **Portrait prompt:** Rotate to portrait → rotate overlay appears. Rotate back → disappears.
3. **Navigation:** Tap on ground → player walks to that location
4. **E/R buttons:** Walk near NPC → E button appears. Tap E → dialogue opens. Tap R (if unlocked) → battle starts.
5. **Dialogue advance:** Tap screen (not E button) → dialogue advances normally
6. **Battle:** All battle action buttons tappable, tall enough not to mis-tap
7. **Character creation:** Tap name input → mobile keyboard opens → type name → Phaser display updates live
8. **HUD bar:** All 5 menu icons tappable without precision (56px hit area vs 32px visual)
9. **Desktop regression:** All above features unchanged on a mouse/keyboard device
