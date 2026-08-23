// Minimal typings for Home Assistant's `ha-form` and the selectors this card
// uses. `custom-card-helpers` does not ship them, and pulling in the frontend
// source is not an option, so these follow the repo's existing habit of
// declaring the shape locally (see HassExt in entity-resolver.ts).
//
// Kept deliberately narrow: only the selectors the editor actually renders.

export interface SelectOption {
  value: string;
  label: string;
}

export type Selector =
  | { text: Record<string, never> }
  | { boolean: Record<string, never> }
  | {
      select: {
        mode?: "list" | "dropdown" | "box";
        multiple?: boolean;
        options: SelectOption[];
      };
    }
  | {
      entity: {
        multiple?: boolean;
        include_entities?: string[];
      };
    };

export interface HaFormSelectorSchema {
  name: string;
  selector: Selector;
}

/**
 * A `grid` or `expandable` group.
 *
 * `name` is deliberately the empty string wherever these are used. ha-form
 * reads a group's value with `!item.name || item.flatten ? obj : obj[item.name]`
 * and writes it back under the same condition, so an unnamed group reads and
 * writes the *top-level* config object instead of nesting under a key. The
 * newer `flatten: true` flag does the same thing but arrived long after the
 * 2024.4.0 minimum this card declares in hacs.json, so the empty name is what
 * keeps the data flat here.
 */
export interface HaFormGroupSchema {
  name: string;
  type: "grid" | "expandable";
  title?: string;
  icon?: string;
  expanded?: boolean;
  column_min_width?: string;
  schema: HaFormSchema[];
}

export type HaFormSchema = HaFormSelectorSchema | HaFormGroupSchema;

interface CardWithConfigElement {
  getConfigElement?: () => unknown;
}

/**
 * Force Home Assistant to load the frontend chunk that defines `ha-form` and
 * `ha-entity-picker`.
 *
 * In practice the editor is only ever built from the card dialog, which has
 * already loaded that chunk — this is Mushroom's belt-and-braces and costs
 * nothing. `window.customElements` is re-read on every call rather than
 * captured, and this must never become a top-level
 * `customElements.whenDefined()`: Home Assistant swaps the registry for a
 * scoped-registry polyfill while its core bundle boots, so a captured
 * reference can point at the wrong registry and a top-level binding may never
 * fire.
 */
export function loadHaComponents(): void {
  const registry = window.customElements;
  if (!registry) return;
  if (!registry.get("ha-form")) {
    const tile = registry.get("hui-tile-card") as unknown as
      | CardWithConfigElement
      | undefined;
    if (tile && tile.getConfigElement) tile.getConfigElement();
  }
  if (!registry.get("ha-entity-picker")) {
    const entities = registry.get("hui-entities-card") as unknown as
      | CardWithConfigElement
      | undefined;
    if (entities && entities.getConfigElement) entities.getConfigElement();
  }
}
