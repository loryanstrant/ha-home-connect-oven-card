# Spec — Card editor on `ha-form`

*Status: approved 2026-08-23.*

## Problem

The card's visual editor is 306 lines of hand-built DOM producing browser-default controls: a
raw `<select>` of oven devices, three `<input type="text">` and fourteen
`<input type="checkbox">`. It renders inside Home Assistant's card-configuration dialog,
surrounded by HA Material fields, and does not look like any of them — different font metrics,
focus rings and spacing, and it follows the browser's `color-scheme` rather than the active
Home Assistant theme.

That is `standards/ux.md` **Consistency**: *"a new control matches the treatment of its
neighbours"*, *"reuse the app's existing primitives before inventing new ones"*.

Unlike the sibling Laundry Weather card, there is **no re-render bug to fix here**. This editor
is already a `LitElement`, so Lit patches the DOM in place and an open dropdown cannot be
destroyed by a `hass` assignment. The structural gain from `ha-form` is smaller but real: there
is no bespoke render path left for a future edit to get wrong.

The **Copy** rule (*"no raw identifiers where a name would do"*) is largely honoured already —
the device `<select>` shows device names and the extra-entity checkboxes show prettified
friendly names. What is gained is search, icons and secondary text in the entity picker.

## A dead control found while reading

`src/editor.ts` renders `<ha-selector .selector=${{ image: {} }}>` for the "Oven image" field.
**Home Assistant has no `image` selector.** It is not registered in
`homeassistant/helpers/selector.py` (which registers `media`, `file`, `icon`, `text`, … but not
`image`) and there is no `ha-selector-image.ts` in the frontend's `LOAD_ELEMENTS` map.
`ha-selector` renders nothing for an unknown key — zero height, no console error. The "browse
for a file" control shipped in 0.2.4 has never done anything; only the paste-a-URL text box
beside it works.

## Scope

The **card editor only** — `home-connect-oven-card-editor` in `src/editor.ts`, plus the shared
constants it needs. Not the card's rendering path.

This repo is the odd one out in the fleet: TypeScript with a Rollup build, not plain JS served
as-is. The source is edited and the bundle rebuilt (`npm ci && npm run build`); `dist/` is
gitignored and produced by CI on a `v*` tag.

## Constraints found before designing

**Two in-house references exist.** `ha-jokes`
(`custom_components/ha_jokes/www/ha-jokes-card.js`) and `HA-Laundry-Weather` v0.4.0 both use
`EDITOR_LABELS` + `EDITOR_HELPERS` + a memoised schema + one `ha-form` with a `value-changed`
listener that stops the inner event and re-emits `config-changed`. This spec follows them.

**`ha-form` nests data under a group's `name` unless the name is empty.** Its `getValue` is
`!item.name || item.flatten ? obj : obj[item.name]`, and its write-back path checks the same
condition. So `{ name: "", type: "expandable", … }` reads and writes the *top-level* config
object. The newer `flatten: true` flag does the same thing but is not used here, so `hacs.json`
keeps its `2024.4.0` minimum.

**HA's device selector cannot be narrowed to ovens.** `DeviceSelectorConfig` offers
`integration` / `manufacturer` / `model` / `model_id` filters and an `entity` sub-filter, but no
`include_devices`. Filtering by integration alone would offer every Home Connect appliance —
dishwasher, washing machine, coffee machine — and picking one gives a card that cannot render.
So the oven picker stays a curated list, rendered as an HA `select` dropdown: the same candidate
set `findHomeConnectOvenDevices()` produces today, with HA's styling.

**`include_entities` exists on the entity selector**, so the "other oven entities" field can
offer exactly the set the old checkbox grid did — that device's entities, minus the ones already
resolved as built-in readings — while gaining friendly names, icons and search.

**`computeHelper` exists**, so both of today's hint lines survive as per-field helper text
rather than being dropped.

**`customElements.whenDefined()` must not be called at module top level.** Home Assistant
replaces `window.customElements` with a scoped-registry polyfill while its core bundle boots, so
a top-level binding attaches to the native registry's method and may never fire.
`window.customElements` is re-read on every call.

**`ha-entity-picker` renders nothing outside `<home-assistant>`** — zero height, empty shadow
root, no console error. Newer HA components take `hass` from a Lit context provider rather than
a property. In production the editor lives inside the card dialog, so this only constrains the
test harness: it must attach the editor under `<home-assistant>` or it is testing a half-dead
form.

## Flow

Unchanged for the user: *Edit dashboard → the card → Edit* opens the same dialog with the same
settings. What changes is that every control is one of Home Assistant's own, the six show/hide
toggles and the reading pickers are folded into two collapsible sections, and the image field is
a single text box that actually works.

```
Oven device             [ Bosch Oven (Oven)              ▾ ]
                        36 entities found for this oven.
Card title (optional)   [                                  ]

▸ Appearance
    Oven image (optional)  [ https://…/oven.jpg            ]
                           Paste an image address, or /local/oven.jpg for a file
                           in your www folder. Leave blank for a built-in icon.
    Show image        [●]     Show controls     [●]
    Program selector  [●]     Temperature       [●]
    Door state        [●]     Child lock        [○]

▸ Readings to show
    Readings to show     ◉ Operation state   ◉ Remaining time
                         ◉ Program progress  ◉ Current temperature
                         ○ Active program    ○ Selected program
                         ○ Duration          ○ Door state
    Other oven entities  [ Cooling fan run time ×] [ + Add entity ]
                         Any other sensor, switch, number or select on this oven.
```

### States

- **No oven picked** — the dropdown reads "— Select an oven —"; the helper says
  "Pick your oven to see its readings."
- **No ovens at all** — the helper says "No Home Connect ovens detected. Check the integration
  is installed and the oven is online." (today's wording, kept).
- **Loading** — nothing renders until both `hass` and the config exist; the dialog shows its own
  spinner meanwhile.
- **Device gone** — a `device_id` that no longer resolves stays selected and stays in the option
  list, labelled "Device no longer available", so opening the editor cannot silently wipe it.

## Acceptance criteria

1. Every control is a Home Assistant component; no raw `<select>` or `<input>` survives anywhere
   in the editor's rendered tree.
2. The oven picker offers exactly the devices `findHomeConnectOvenDevices()` returns, by name
   and model, and stores the same `device_id` as today.
3. The built-in readings list offers only the readings the selected oven actually exposes — plus
   anything already stored, even if it no longer resolves.
4. "Other oven entities" is an HA entity picker limited to that oven's remaining entities, and
   it renders with **non-zero height**.
5. Both of today's hint lines survive as helper text on their fields.
6. The image field is a single working text field accepting a URL or a `/local/…` path. The dead
   `image` selector is gone.
7. Every stored config key round-trips unchanged — including `type`, the per-key `entities`
   overrides, and a `sensors` list mixing built-in keys with entity IDs. An existing dashboard
   needs no edit.
8. Editing one setting does not write the other five toggle defaults into the saved YAML: values
   equal to the card's own default are stripped before `config-changed` is emitted.
9. The `ha-form` element is the **same node object** across 20 consecutive `hass` assignments,
   and the editor still updates when the config genuinely changes.
10. Screenshots at desktop and ~380px show the editor matching the surrounding HA fields, with
    no clipped controls and no horizontal scroll.
11. `CARD_VERSION` and `package.json` `version` move together to `0.3.0`, and the rebuilt bundle
    demonstrably differs from the 0.2.4 one.

## Non-goals

- The card's rendering path. Only the editor changes.
- The per-key `entities` overrides — still YAML-only, now provably preserved rather than
  accidentally so.
- Migrating stored configs. Nothing about the stored shape changes, so there is nothing to
  migrate.
- Mobile parity work. This card has no separate mobile app; the Home Assistant Companion app
  renders the same web editor, so the ~380px check *is* the mobile check.
