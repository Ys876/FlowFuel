# Motion specs

Written before implementation, per the build spec. Implementation must match these
exactly. All springs use Framer Motion `type: "spring"`, `damping`/`stiffness` derived
from Apple's `response`/`damping` pair (converted via `stiffness = (2*pi/response)^2`,
`dampingRatio` passed through as Framer's `damping` on a mass of 1, using
`useSpring`/`animate` with explicit `stiffness`/`damping` rather than CSS).

---

## 1. Camera capture button → photo result sheet

### A. Feel audit (pre-build estimate)
| Dimension | Score | Evidence |
|---|---|---|
| Response | 4/5 | `whileTap` scale fires on pointer-down via Framer's press gesture, not click |
| Directness | 3/5 | Sheet is not dragged into existence by the tap itself — opens via spring, but the *dismiss* drag is 1:1 |
| Interruptibility | 3/5 (pre-build risk) | Requires explicit care: dismiss must cancel the in-flight fetch, not just hide the sheet |
| Spring behavior | 4/5 | Drawer preset (damping 0.8, response 0.3s) planned from the start |
| Spatial consistency | 3/5 | Anchoring to a bottom-fixed camera button is easy; true "grows from the button" would need shared-element geometry, deferred to a simpler edge-anchored slide-up |
| Materials | 4/5 | Scrim + translucent sheet planned |
| Reduced motion | 3/5 (pre-build risk) | Easy to forget the cancel-fetch path under instant mode if not built explicitly |

### B. Interaction redesign
- **Happy path:** pointer-down on camera button → button scales to 0.94 instantly (spring, no delay) → on release, camera capture UI opens inline (not the sheet yet) → user takes photo → sheet slides up from the bottom edge (anchored under the tab bar, not literally from the button, since the button is fixed to the tab bar and the sheet's home is the same screen-bottom region) with a scrim fade-in → sheet shows a loading state immediately → when Gemini responds, content cross-fades in inside the already-open sheet (sheet does not re-animate open).
- **Interrupt/reverse path:** user drags the sheet down (or taps the scrim) at any point, including mid-request. The drag follows the pointer 1:1 via `useMotionValue` + pointer capture. On release past a threshold (or with sufficient downward velocity), an `AbortController` tied to the in-flight `fetch` is aborted immediately, and the sheet continues its spring from the live drag position/velocity to closed. No error toast for a user-initiated cancel.
- **Edge/rubber-band:** dragging the sheet *up* past its resting position rubber-bands (resistance curve, not a hard stop). Dragging down past the dismiss threshold before release still rubber-bands slightly if released before the velocity/position projection says "dismiss."
- **Reduced-motion fallback:** sheet appears/disappears via opacity crossfade only (150ms), no vertical translation; scrim fades with it. Cancel-on-dismiss behavior is unchanged (still aborts the fetch), only the visual transition changes.

### C. Motion spec
- Properties animated: `transform: translateY()` and `opacity` only (sheet + scrim). Camera button: `transform: scale()` only.
- Spring: drawer preset — damping 0.8, response 0.3s (stiffness ≈ 438, damping ≈ 34 at mass 1) for open/close. Bounce is never allowed on this sheet (a meal-photo result is not a playful surface) — damping stays critical-to-slightly-over regardless of gesture velocity.
- Velocity handoff: on drag release, the sheet's exit animation starts from `useMotionValue`'s current value with the pointer's last velocity passed as the spring's initial velocity, so it doesn't "catch up" from a standing start.
- Confirmed: no CSS transitions, no `@keyframes` anywhere in this flow — all motion via Framer Motion `motion.div` + spring configs.

### D. Materials and hierarchy
- Sheet surface: translucent (`backdrop-filter: blur(20px)` + semi-opaque background), sitting above a solid dimming scrim (`rgba(0,0,0,0.35)`, itself not translucent/blurred — never stack two blurred layers).
- Camera button itself: solid, not translucent (it's a primary action target, needs full contrast against the camera viewfinder behind it).

### E. Implementation checklist
- [ ] `motion.button` for camera trigger, `whileTap={{ scale: 0.94 }}`, `transition={{ type: "spring", stiffness: 500, damping: 30 }}`.
- [ ] `PointerEvent`-based drag on the sheet using Framer's `drag="y"` with `dragElastic` tuned for rubber-banding beyond bounds, `onPointerDown` calls `setPointerCapture`.
- [ ] `AbortController` created when the fetch to `/api/analyze-photo` starts; stored in a ref; `onDragEnd` (or scrim tap) calls `.abort()` before triggering close.
- [ ] Velocity from Framer's `PanInfo.velocity.y` passed into the exit spring's `velocity` option.
- [ ] `prefers-reduced-motion` media query read via a hook; when true, render sheet with `transition={{ duration: 0.15 }}` opacity-only, skip the `y` transform entirely.
- [ ] [NEEDS INPUT] Whether the sheet should also close automatically after showing results for N seconds, or stay open until dismissed — not specified.

### F. Do / Don't
**Do:**
1. Abort the in-flight request the instant a dismiss gesture crosses its threshold, not after the close animation finishes.
2. Keep the camera button's press-feedback independent of network state — it must feel instant even if the sheet takes a moment to mount.
3. Let the scrim and sheet animate on the same spring/duration so they read as one motion, not two.
4. Preserve whatever partial drag position the user left the sheet in in reduced-motion mode's fallback if they'd already started dragging before the setting was read.
5. Show the loading state inside the sheet immediately on open, never a blank sheet.

**Don't:**
1. Don't wait for the Gemini response before opening the sheet — that turns a direct-manipulation flow into a spinner-gated modal.
2. Don't let a completed-but-now-stale Gemini response render into a sheet the user has already dismissed and reopened for a second photo.
3. Don't use a generic modal-fade for this — it's specified as a bottom sheet with drag dismissal, not a dialog.
4. Don't apply bounce/overshoot on open — this is a results surface, not a playful toy.
5. Don't forget `touch-action: none` on the drag handle area, or the browser's native scroll will fight the pointer capture.

---

## 2. Dining balance widget edit

### A. Feel audit (pre-build estimate)
| Dimension | Score | Evidence |
|---|---|---|
| Response | 4/5 | Tap target itself gets `whileTap` press feedback |
| Directness | 4/5 | Numbers become editable in place, layout barely shifts |
| Interruptibility | 4/5 | Tapping away commits or cancels cleanly, no competing async work to interrupt |
| Spring behavior | 4/5 | Move/reposition preset (damping 1.0, response 0.4s) for the small layout shift from display → input |
| Spatial consistency | 5/5 | No new surface is created; edit happens in the widget's own footprint |
| Materials | 4/5 | Widget stays on its existing card surface, no new scrim/blur needed |
| Reduced motion | 4/5 | Crossfade digits/input swap is simple to gate |

### B. Interaction redesign
- **Happy path:** tap anywhere on the balance widget → `whileTap` scale (0.98) on press → on release, the static numbers cross-fade into editable inputs *in place* (same position, same font size where possible) using `layout` animation so surrounding content reflows via spring, not a snap. Keyboard opens (native, since inputs are real `<input type="number">`). Editing updates a local draft value live.
- **Interrupt/reverse path:** tapping outside the widget (or pressing a checkmark affordance) commits the draft to IndexedDB and animates back to display mode along the same layout path (enter/exit same path, principle 7). Pressing an explicit cancel (or the OS back gesture, where applicable) discards the draft and reverts, same visual path in reverse — no separate "cancel" animation shape.
- **Edge/rubber-band:** not gesture-driven (it's a tap + type interaction, not a drag), so no rubber-banding is applicable here; the one motion is the shared-layout transition, handled by Framer's `layout` prop.
- **Reduced-motion fallback:** instant swap between display and edit states, no layout animation, same commit/cancel logic.

### C. Motion spec
- Properties animated: `layout` (Framer computes transform under the hood — this still resolves to transform/opacity, no width/height keyframes) and `opacity` for the numeral-to-input crossfade.
- Spring: move/reposition preset — damping 1.0, response 0.4s (critically damped, stiffness ≈ 247, damping ≈ 31). No bounce; this is a value edit, not a toy.
- Velocity handoff: not applicable, no drag gesture involved.
- Confirmed: no CSS transitions/keyframes; `layout` + `AnimatePresence` with spring `transition` only.
- Not used anywhere: rubber-band spring (edit interaction is not a scroll/drag boundary).

### D. Materials and hierarchy
- No new translucent surface — the widget stays on its existing card background. No scrim, since nothing else is being backgrounded (this isn't a takeover of the screen).

### E. Implementation checklist
- [ ] Wrap the display/edit swap in a single `layoutId`-sharing parent so Framer treats it as one continuous element, not enter+exit of two.
- [ ] `whileTap={{ scale: 0.98 }}` on the tappable wrapper, spring `{ stiffness: 500, damping: 30 }`.
- [ ] Real `<input>` elements for editing (accessibility, native numeric keyboard on mobile) with `inputMode="decimal"`.
- [ ] Commit-on-blur and commit-on-outside-tap both call the same `saveDraft()` path so there's one source of truth for "done editing."
- [ ] `prefers-reduced-motion`: swap `layout`/spring transition for `transition={{ duration: 0 }}`.

### F. Do / Don't
**Do:**
1. Keep the numbers in exactly the same on-screen position through the transition — the whole point is "edit in place."
2. Auto-select/focus the first input the instant edit mode mounts.
3. Validate input (non-negative numbers) inline without blocking typing.
4. Commit on blur so tapping a nav tab while editing doesn't lose the value.
5. Keep the tap target for the whole widget at least 44×44pt, not just the numeral text.

**Don't:**
1. Don't navigate to a separate screen/route for this edit — spec explicitly rules that out.
2. Don't animate the containing card's size/position — only the numeral-to-input content should move.
3. Don't clear the draft value if the keyboard's "done" vs. tapping outside are handled by different code paths — unify them.
4. Don't use a modal/dialog pattern (no scrim) — this isn't a takeover.
5. Don't let the resting layout position be computed from a stale measurement — remeasure on every open in case the balance numbers' digit-count changed (e.g. 9 → 10 dollars shifts width).

---

## 3. Macro tracker toggle

### A. Feel audit (pre-build estimate)
| Dimension | Score | Evidence |
|---|---|---|
| Response | 5/5 | Toggle thumb moves on pointer-down/release, independent of the card animation |
| Directness | 3/5 | The toggle itself is direct; the card's materialize is a consequence, not directly manipulated |
| Interruptibility | 3/5 (risk) | Rapid re-toggling before the card animation finishes must not queue/stack animations |
| Spring behavior | 4/5 | Drawer-like materialize planned (scale + opacity), not a plain conditional render |
| Spatial consistency | 4/5 | Card should grow from roughly the toggle's row, not the top of the viewport |
| Materials | 3/5 | Card is solid, not translucent, so no scrim needed — but hierarchy needs care against the rest of the dashboard |
| Reduced motion | 4/5 | Straightforward instant show/hide fallback |

### B. Interaction redesign
- **Happy path:** press the toggle → thumb slides on pointer-down/up (not on the eventual state commit) so it feels instant even before the boolean actually flips → state flips → dashboard's macro card materializes: scales up from 0.9→1 and fades in, expanding the layout around it via `layout` on sibling cards so nothing snaps.
- **Interrupt/reverse path:** flipping the toggle off before the materialize finishes reverses the *same* animation from its current in-flight scale/opacity value (not from 1 down to 0 from a standing start) — i.e. the dematerialize starts wherever the materialize currently is.
- **Edge/rubber-band:** not applicable (not a drag surface).
- **Reduced-motion fallback:** instant show/hide of the card, no scale/opacity animation; toggle thumb still animates minimally (or snaps) per system convention — toggle motion is small enough that a snap is acceptable under reduced motion.

### C. Motion spec
- Properties animated: `transform: scale()` and `opacity` on the macro card; `transform: translateX()` on the toggle thumb; sibling cards reflow via `layout`.
- Spring: rotation/reveal-style preset — damping 0.8, response 0.4s (stiffness ≈ 247, damping ≈ 25) for the card; toggle thumb uses a snappier spring, damping 0.8, response ~0.2s (stiffness ≈ 987, damping ≈ 50), since it's a small, low-mass element that should feel crisp.
- Velocity handoff: not applicable — this isn't a drag gesture, but the *interrupt* case still requires reading the current animated value (Framer's `AnimatePresence`/`motion` value at time of interrupt) as the new animation's start, exactly like a velocity handoff would, just without drag velocity involved.
- Confirmed: no CSS transitions/keyframes; `AnimatePresence` + spring `transition` for the card, `motion.span` spring for the thumb.

### D. Materials and hierarchy
- Macro card: solid surface, matches the dashboard's other cards — no translucency, no scrim, since it's a peer element materializing among peers, not a surface taking over the screen.

### E. Implementation checklist
- [ ] Toggle thumb as `motion.span` with `animate={{ x: on ? thumbWidth : 0 }}`, spring `{ stiffness: 987, damping: 50 }`, driven by local state updated on pointer-down-equivalent (Framer `whileTap` plus an immediate state flip on `onPointerDown`, confirmed then reconciled on release).
- [ ] Macro card wrapped in `AnimatePresence` with `initial={{ opacity: 0, scale: 0.9 }}`, `animate={{ opacity: 1, scale: 1 }}`, `exit={{ opacity: 0, scale: 0.9 }}`, spring transition as above.
- [ ] Sibling dashboard cards get `layout` so they reflow with a spring instead of jumping when the macro card's presence changes.
- [ ] Persist `macroTrackerOn` to IndexedDB `profile` store on toggle, optimistically flipping UI state before the write resolves.
- [ ] `prefers-reduced-motion`: `AnimatePresence` transition becomes `{ duration: 0 }` (or a very short opacity-only fade), thumb transition duration shortened but not removed entirely (it's a small, cheap animation).

### F. Do / Don't
**Do:**
1. Flip the toggle thumb's visual state on pointer-down, before the underlying IndexedDB write or React state settles.
2. Let the macro card's exit animation reverse from wherever its entrance currently is if toggled off mid-animation.
3. Hide the macro card entirely from the DOM (not just visually) when off, matching the spec's "fully hidden from nav and dashboard when off" requirement.
4. Keep the toggle's tap target at least 44×44pt even though the visual switch is smaller.
5. Make the nav-level macro tab/link (if any) appear/disappear with the same on/off state, not a separate toggle.

**Don't:**
1. Don't leave the macro card in the DOM with `display: none` or `visibility: hidden` when off — spec requires it fully absent, not disabled-and-visible.
2. Don't let re-toggling quickly queue up multiple animations — always animate from the current live value, never reset-then-replay.
3. Don't use a plain conditional `{on && <Card/>}` with no transition at all — spec explicitly wants a materialize/dematerialize, not a snap.
4. Don't bounce the card in — this is a settings-driven reveal, not a playful gesture result.
5. Don't tie the toggle's own visual feedback to the card animation's completion — they're independent per the redesign.
