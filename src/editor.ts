/**
 * The card's visual editor, built on Home Assistant's own `ha-form`.
 *
 * Before 0.3.0 this was hand-built DOM: a raw <select> of ovens, three text
 * inputs and fourteen checkboxes. It renders inside HA's card dialog
 * surrounded by Material fields and matched none of them — different font
 * metrics, focus rings and spacing, and it followed the browser's
 * `color-scheme` rather than the active theme.
 *
 * It also carried a dead control: `<ha-selector .selector=${{ image: {} }}>`.
 * Home Assistant has no `image` selector — it is not in the core registry and
 * there is no ha-selector-image in the frontend — so ha-selector rendered
 * nothing at all for it, silently. Only the paste-a-URL box beside it worked.
 * That is now a single text field that does.
 */
import { LitElement, html, TemplateResult, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

import {
  EDITOR_NAME,
  DEFAULT_SENSORS,
  SENSOR_LABELS,
  TOGGLE_DEFAULTS,
  ToggleKey,
} from "./const";
import { HomeConnectOvenCardConfig } from "./types";
import {
  findHomeConnectOvenDevices,
  getDeviceEntities,
  resolveEntities,
} from "./entity-resolver";
import { prettifyLabel } from "./format";
import {
  HaFormSchema,
  SelectOption,
  loadHaComponents,
} from "./ha-form";

// ha-form falls back to rendering the raw key name when it cannot find a
// label, so this map is required rather than decorative.
const EDITOR_LABELS: Record<string, string> = {
  device_id: "Oven device",
  name: "Card title (optional)",
  image_url: "Oven image (optional)",
  show_image: "Show image",
  show_controls: "Show controls",
  show_program_select: "Program selector",
  show_temperature: "Temperature",
  show_door: "Door state",
  show_child_lock: "Child lock",
  sensor_keys: "Standard readings",
  extra_entities: "Other oven entities",
};

/** "child_lock" → "Child lock", for a stored key with no curated label. */
function fallbackLabel(key: string): string {
  const words = prettifyLabel(key.replace(/_/g, " "));
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const IMAGE_HELPER =
  "An image address, or /local/oven.jpg from your www folder. Blank shows a built-in icon.";
const EXTRA_HELPER =
  "Any other sensor, switch, number or select on this oven.";
const NO_OVENS_HELPER =
  "No Home Connect ovens detected. Check the integration is installed and the oven is online.";
const PICK_OVEN_HELPER = "Pick your oven to see its readings.";

/** Which entities the form can offer, given the currently selected oven. */
interface EditorContext {
  deviceOptions: SelectOption[];
  readingOptions: SelectOption[];
  extraCandidates: string[];
  deviceHelper: string;
}

@customElement(EDITOR_NAME)
export class HomeConnectOvenCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: HomeConnectOvenCardConfig;

  // ha-form is handed the same schema and data objects until their contents
  // genuinely change, so it is not re-rendering rows on every hass tick.
  private _schema: HaFormSchema[] = [];
  private _schemaKey = "";
  private _data: Record<string, unknown> = {};
  private _dataKey = "";
  private _deviceHelper = "";

  public static styles = css`
    ha-form {
      display: block;
    }
  `;

  public connectedCallback(): void {
    super.connectedCallback();
    loadHaComponents();
  }

  public setConfig(config: HomeConnectOvenCardConfig): void {
    this._config = { ...config };
  }

  // Bound once as class fields: ha-form takes these as properties, and handing
  // it a fresh function identity on every render would invalidate them each
  // time for no gain.
  private _computeLabel = (schema: { name: string }): string =>
    EDITOR_LABELS[schema.name] || schema.name;

  private _computeHelper = (schema: { name: string }): string => {
    switch (schema.name) {
      case "device_id":
        return this._deviceHelper;
      case "image_url":
        return IMAGE_HELPER;
      case "extra_entities":
        return EXTRA_HELPER;
      default:
        return "";
    }
  };

  /**
   * What this oven can actually offer.
   *
   * Anything already stored is kept in the option lists even when it no longer
   * resolves — ha-form's select drops a value that is not among its options on
   * the next edit, which would silently delete part of the user's card.
   */
  private _context(): EditorContext {
    const config = this._config as HomeConnectOvenCardConfig;
    const ovens = findHomeConnectOvenDevices(this.hass);
    const deviceId = config.device_id;
    const deviceEntities = deviceId
      ? getDeviceEntities(this.hass, deviceId)
      : [];
    const resolved = deviceId
      ? resolveEntities(this.hass, deviceId, config.entities)
      : {};
    const resolvedIds = new Set(
      Object.values(resolved).filter(Boolean) as string[]
    );

    const stored = config.sensors ?? DEFAULT_SENSORS;
    const storedKeys = stored.filter((s) => !s.includes("."));
    const storedEntities = stored.filter((s) => s.includes("."));

    const deviceOptions: SelectOption[] = ovens.map((d) => ({
      value: d.id,
      label: d.model ? `${d.name} (${d.model})` : d.name,
    }));
    if (deviceId && !deviceOptions.some((o) => o.value === deviceId)) {
      deviceOptions.push({
        value: deviceId,
        label: "Device no longer available",
      });
    }

    const readingKeys = Object.keys(SENSOR_LABELS).filter(
      (key) => (resolved as Record<string, string | undefined>)[key]
    );
    for (const key of storedKeys) {
      if (!readingKeys.includes(key)) readingKeys.push(key);
    }
    const readingOptions: SelectOption[] = readingKeys.map((key) => ({
      value: key,
      label: SENSOR_LABELS[key] ?? fallbackLabel(key),
    }));

    const extraCandidates = deviceEntities
      .filter((e) => /^(sensor|binary_sensor|number|select|switch)\./.test(e))
      .filter((e) => !resolvedIds.has(e))
      .sort();
    for (const entityId of storedEntities) {
      if (!extraCandidates.includes(entityId)) extraCandidates.push(entityId);
    }

    let deviceHelper: string;
    if (!ovens.length) {
      deviceHelper = NO_OVENS_HELPER;
    } else if (!deviceId) {
      deviceHelper = PICK_OVEN_HELPER;
    } else {
      deviceHelper = `${deviceEntities.length} entities found for this oven.`;
    }

    return { deviceOptions, readingOptions, extraCandidates, deviceHelper };
  }

  private _buildSchema(ctx: EditorContext): HaFormSchema[] {
    return [
      {
        name: "device_id",
        selector: { select: { mode: "dropdown", options: ctx.deviceOptions } },
      },
      { name: "name", selector: { text: {} } },
      {
        // Empty name keeps the group's data flat — see HaFormGroupSchema.
        name: "",
        type: "expandable",
        title: "Appearance",
        icon: "mdi:palette-outline",
        schema: [
          { name: "image_url", selector: { text: {} } },
          { name: "show_image", selector: { boolean: {} } },
          { name: "show_controls", selector: { boolean: {} } },
          { name: "show_program_select", selector: { boolean: {} } },
          { name: "show_temperature", selector: { boolean: {} } },
          { name: "show_door", selector: { boolean: {} } },
          { name: "show_child_lock", selector: { boolean: {} } },
        ],
      },
      {
        name: "",
        type: "expandable",
        title: "Readings to show",
        icon: "mdi:format-list-bulleted",
        expanded: true,
        schema: [
          {
            name: "sensor_keys",
            selector: {
              select: { multiple: true, mode: "list", options: ctx.readingOptions },
            },
          },
          {
            name: "extra_entities",
            selector: {
              entity: { multiple: true, include_entities: ctx.extraCandidates },
            },
          },
        ],
      },
    ];
  }

  /**
   * The config, reshaped for the form.
   *
   * The whole config is spread in first and only the two scratch keys are
   * swapped out. That is what keeps `type` and the per-key `entities`
   * overrides alive: ha-form re-emits `{...this.data, [changed]: value}`, so
   * anything missing from `data` is lost on the first edit.
   */
  private _formData(): Record<string, unknown> {
    const config = this._config as HomeConnectOvenCardConfig;
    const sensors = config.sensors ?? DEFAULT_SENSORS;
    const data: Record<string, unknown> = { ...config };
    delete data.sensors;

    data.sensor_keys = sensors.filter((s) => !s.includes("."));
    data.extra_entities = sensors.filter((s) => s.includes("."));
    data.device_id = config.device_id ?? "";
    data.name = config.name ?? "";
    data.image_url = config.image_url ?? "";
    for (const key of Object.keys(TOGGLE_DEFAULTS) as ToggleKey[]) {
      data[key] = config[key] ?? TOGGLE_DEFAULTS[key];
    }
    return data;
  }

  private _valueChanged = (ev: CustomEvent): void => {
    // Stop the inner event so only our config-changed reaches the dialog.
    ev.stopPropagation();
    const value = { ...(ev.detail.value as Record<string, unknown>) };

    const keys = Array.isArray(value.sensor_keys)
      ? (value.sensor_keys as string[])
      : [];
    const extras = Array.isArray(value.extra_entities)
      ? (value.extra_entities as string[])
      : [];
    delete value.sensor_keys;
    delete value.extra_entities;
    // Built-in readings first, then added entities — the order the card draws
    // them anyway (tiles, then entity rows).
    const sensors = [...keys, ...extras];
    value.sensors = sensors;

    // Keep the saved YAML down to what actually differs from the card's own
    // defaults, so changing one setting doesn't write the other five.
    for (const key of Object.keys(TOGGLE_DEFAULTS) as ToggleKey[]) {
      if (value[key] === TOGGLE_DEFAULTS[key]) delete value[key];
    }
    if (sensors.join(" ") === DEFAULT_SENSORS.join(" ")) {
      delete value.sensors;
    }
    if (!value.name) delete value.name;
    if (!value.image_url) delete value.image_url;
    if (!value.device_id) delete value.device_id;

    const config = value as HomeConnectOvenCardConfig;
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  };

  protected render(): TemplateResult {
    // ha-form needs hass to resolve its selectors, so wait for it.
    if (!this.hass || !this._config) return html``;

    const ctx = this._context();
    this._deviceHelper = ctx.deviceHelper;

    const schemaKey = JSON.stringify([
      ctx.deviceOptions,
      ctx.readingOptions,
      ctx.extraCandidates,
    ]);
    if (schemaKey !== this._schemaKey) {
      this._schemaKey = schemaKey;
      this._schema = this._buildSchema(ctx);
    }

    const data = this._formData();
    const dataKey = JSON.stringify(data);
    if (dataKey !== this._dataKey) {
      this._dataKey = dataKey;
      this._data = data;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .schema=${this._schema}
        .data=${this._data}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-connect-oven-card-editor": HomeConnectOvenCardEditor;
  }
}
