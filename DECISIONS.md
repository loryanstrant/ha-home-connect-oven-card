# Decisions

Dated, non-obvious choices and the quirks that forced them. One entry per
decision, each ending in a lesson worth carrying elsewhere.

## 2026-08-23 — The card editor is built on `ha-form`

The editor was 306 lines of hand-built DOM — a raw `<select>` of ovens, three text inputs,
fourteen checkboxes — rendering inside Home Assistant's card dialog surrounded by Material
fields. Different font metrics, focus rings and spacing, and it followed the browser's
`color-scheme` rather than the active theme. That is `standards/ux.md` *consistency*: reuse the
app's primitives, match the neighbours.

Unlike the sibling Laundry Weather card, **there was no re-render bug to fix here.** That card's
port was justified by a dropdown that flashed open and shut, because `set hass` reassigned
`innerHTML` and destroyed the control under the open popup. This editor has always been a
`LitElement`, so Lit patches in place and that fault cannot occur. The argument here was purely
that the controls did not match their surroundings — worth being honest about, because it is a
weaker argument and it still won.

Four things specific to this card:

- **Home Assistant has no `image` selector.** The "browse for a file" control shipped in 0.2.4
  rendered `<ha-selector .selector=${{ image: {} }}>`. There is no `image` in
  `homeassistant/helpers/selector.py`'s registry and no `ha-selector-image` in the frontend's
  `LOAD_ELEMENTS` map, so `ha-selector` rendered *nothing* — zero height, no console error. It
  had never done anything; only the paste-a-URL box beside it worked. It is now one text field
  that does.
- **The oven picker stays a curated list.** HA's device selector takes `integration` /
  `manufacturer` / `model` filters but has no `include_devices`, so filtering by integration
  would offer every Home Connect appliance — dishwasher, washing machine, coffee machine — and
  picking one gives a card that cannot render. A `select` selector fed from
  `findHomeConnectOvenDevices()` keeps today's candidate set and gains HA's styling.
- **Groups are unnamed on purpose.** `ha-form` reads a group's value with
  `!item.name || item.flatten ? obj : obj[item.name]`, so `{ name: "", type: "expandable" }`
  reads and writes the *top-level* config instead of nesting under a key. The newer
  `flatten: true` flag does the same but postdates the `2024.4.0` minimum in `hacs.json`, so the
  empty name is what keeps this card's data flat without a version bump.
- **Values equal to a default are stripped before saving.** `ha-form` re-emits every field on
  each edit, so renaming a card would otherwise write all six `show_*` booleans into the
  dashboard YAML and pin today's defaults into existing cards. `TOGGLE_DEFAULTS` in `const.ts`
  is now the single source both the card and the editor read, which is what makes the stripping
  safe.

**Two traps found while verifying, worth more than the port.**

`ha-entity-picker` renders *nothing* outside `<home-assistant>` — measured on DEV at **0px tall
in `document.body` versus 80px inside**, with no error either way. Newer HA components take
`hass` from a Lit context provider rather than a property. In production the editor lives inside
the card dialog so it is fine, but any harness that builds the editor directly must attach it
under `<home-assistant>` or it is testing a half-dead form while every other field renders
normally.

And `<home-assistant>`'s shadow root is Lit-managed: a node appended to it is **silently dropped
on the next render**, which happens several times a second as `hass` updates. The verification
harness re-attaches on a short interval. Playwright locators cannot hold a stable handle on a
node that keeps being re-appended either, so the screenshots are taken by reading the bounding
box in-page and clipping.

**Lesson:** a component that renders nothing is not obviously broken. Two separate dead controls
turned up here — HA's non-existent `image` selector in shipped code, and the entity picker in the
test harness — and neither logged anything. When a UI check builds elements outside their normal
parent, assert something rendered before trusting what did.
