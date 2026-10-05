# Continuity Sheet

Ported from live-action script supervision, where the supervisor tracks action, eyelines, hand occupancy, wardrobe, props, hair, makeup, injuries, story day and take quality, then distributes the breakdown to each department.

In generative work there are no departments — the sheet *is* the department. It is the only thing standing between you and shots that quietly contradict each other.

---

## Per-shot record

```
SHOT 4C — Scene 4, setup C
────────────────────────────────────
Story day:        Day 2, evening
Location:         Kitchen, apartment
Characters:       MARA (canon v1), TOBIAS (canon v1)

REFERENCES USED
  Identity:       mara_canon.png, mara_3q_left.png
  Environment:    kitchen_master.png
  Previous frame: 4B_final.png

GEOGRAPHY
  Action line:    along the counter, camera north side
  Mara:           screen-left, facing right
  Tobias:         screen-right, facing left
  Eyeline (Mara): 12 degrees camera-right, off-screen
  Camera side:    north — DO NOT CROSS

WARDROBE
  Mara:           navy wool cardigan OVER white tee, buttoned to 3rd
                  button; silver ring left index; hair tied back
  Tobias:         grey work shirt, sleeves rolled to elbow,
                  top button open; no watch

MARKS
  Mara:           small burn scar inner left wrist (visible, sleeve pushed)
  Tobias:         none visible this shot

PROPS
  Coffee cup:     Tobias, right hand, half full, handle screen-right
                  (state last changed: 4A)
  Kitchen knife:  on board, blade pointing screen-left, untouched
                  since 3D

CONTINUITY STATE
  Mara:           dry, composed. No damage
  Tobias:         cut on right palm from 3D, unbandaged, not bleeding
                  → will be bandaged from scene 6 onward

LIGHT
  Single practical, pendant above counter, warm 2900K,
  hard top-down, deep shadow under brows

OUTPUT
  Approved take:  4C_v3.mp4
  Notes:          v1 drifted jaw, v2 lost the wrist scar
```

---

## The two fields people forget

### Story day and its direction of travel

Blood, dirt, sweat, bruising, stubble and costume damage progress across a film. It is not enough to record the current state — record where it is heading.

```
Tobias palm cut:
  3D  wound opens, bleeding
  4C  unbandaged, not bleeding      ← current
  6A  bandaged, clean
  9B  bandage grubby
  12  healed, thin pink line
```

Shots are almost never generated in story order. Without this ladder, scene 9 will show a fresh wound.

### Prop state and last change

Record the owner, the hand, the screen position, the orientation, the open/closed or full/empty state, **and the last shot in which that state changed**. A cup that is half full in the wide and full in the close-up is the classic tell, and it survives review far more often than a drifting face because nobody is looking at it.

---

## Scene-level blocking diagram

For any multi-character scene, keep an overhead sketch alongside the sheets. It does not need to be beautiful — normalised coordinates in text work fine.

```
SCENE 4 — kitchen

        [window]
            |
   MARA ----+---- TOBIAS
   (SL)   counter   (SR)
            |
      ======O======   ← camera, north side
         action line runs along the counter
         all setups stay north
```

The one job this does: it makes crossing the line a visible mistake rather than an invisible one.

---

## Environment sheet

One per location, written once and reused:

- Master establishing frame, approved
- Wall colour, flooring, furniture positions
- Practical light sources and their state — which are on
- Window direction and what is visible through it
- Set dressing that must persist, and dressing that may vary
- **What lies off-screen in each direction** — this is what the reverse angle will expose

That last line prevents the most expensive multi-character failure: generating a reverse shot into a room that was never designed, and getting a different room.

---

## Tooling reality

Continuity-checking tools exist and are improving — some will flag appearance, wardrobe, accessory and prop mismatches across a shot list, including shot-reverse-shot pairs.

They detect and flag. They do not reliably fix, and they remain weak on exactly the cases that matter most: marks under changing light, partially visible wardrobe, evolving blood and dirt, hand-to-hand prop transfers, and multi-character geography.

Human-approved continuity metadata, plus generation, plus automated comparison is the defensible model. Not automation alone.
