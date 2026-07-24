import { LitElement, html, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

import { CARD_NAME, CARD_VERSION, DEFAULT_SENSORS, EDITOR_NAME } from "./const";
import {
  HomeConnectOvenCardConfig,
  ResolvedEntities,
  DeviceInfo,
} from "./types";
import { getDeviceInfo, resolveEntities } from "./entity-resolver";
import { cardStyles } from "./styles";
import { prettifyLabel } from "./format";

type EntityRow = HTMLElement & { hass?: unknown };
interface CardRowHelpers {
  createRowElement: (config: unknown) => EntityRow;
}

const w = window as unknown as {
  customCards?: Array<{
    type: string;
    name: string;
    description: string;
    preview?: boolean;
  }>;
};
w.customCards = w.customCards || [];
w.customCards.push({
  type: CARD_NAME,
  name: "Home Connect Oven Card",
  description: "A visual card for Home Connect ovens with controls and sensors",
  preview: true,
});

console.info(
  `%c HOME-CONNECT-OVEN-CARD %c v${CARD_VERSION} `,
  "color:white;background:#3b82f6;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#3b82f6;background:white;padding:2px 6px;border-radius:0 4px 4px 0;"
);

@customElement(CARD_NAME)
export class HomeConnectOvenCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: HomeConnectOvenCardConfig;
  @state() private _imageFailed = false;
  @state() private _rowHelpers?: CardRowHelpers;
  private _rowCache = new Map<string, EntityRow>();

  private async _ensureRowHelpers(): Promise<void> {
    const loader = (window as unknown as {
      loadCardHelpers?: () => Promise<CardRowHelpers>;
    }).loadCardHelpers;
    if (this._rowHelpers || !loader) return;
    this._rowHelpers = await loader();
    this.requestUpdate();
  }

  public static styles = cardStyles;

  public static async getConfigElement(): Promise<HTMLElement> {
    await import("./editor");
    return document.createElement(EDITOR_NAME);
  }

  public static getStubConfig(): Partial<HomeConnectOvenCardConfig> {
    return {
      type: `custom:${CARD_NAME}`,
      show_image: true,
      show_controls: true,
      show_program_select: true,
      show_temperature: true,
      show_door: true,
      sensors: DEFAULT_SENSORS,
    };
  }

  public setConfig(config: HomeConnectOvenCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    // Give a changed image URL a fresh chance to load.
    if (config.image_url !== this._config?.image_url) this._imageFailed = false;
    this._config = {
      show_image: true,
      show_controls: true,
      show_program_select: true,
      show_temperature: true,
      show_door: true,
      show_child_lock: false,
      sensors: DEFAULT_SENSORS,
      ...config,
    };
  }

  public getCardSize(): number {
    return 6;
  }

  private get _deviceId(): string | undefined {
    return this._config?.device_id;
  }

  private get _device(): DeviceInfo | null {
    if (!this.hass || !this._deviceId) return null;
    return getDeviceInfo(this.hass, this._deviceId);
  }

  private get _entities(): Partial<ResolvedEntities> {
    if (!this.hass || !this._deviceId) return {};
    return resolveEntities(this.hass, this._deviceId, this._config?.entities);
  }

  private _stateOf(entityId?: string): string | undefined {
    if (!entityId) return undefined;
    return this.hass.states[entityId]?.state;
  }

  private _attr(entityId: string | undefined, attr: string): unknown {
    if (!entityId) return undefined;
    return this.hass.states[entityId]?.attributes?.[attr];
  }

  private _call(
    domain: string,
    service: string,
    data: Record<string, unknown>
  ): void {
    this.hass.callService(domain, service, data);
  }

  private _formatProgramName(
    raw?: string,
    stateObj?: { entity_id: string; state: string; attributes: Record<string, unknown> }
  ): string {
    if (!raw) return "—";
    // Prefer Home Assistant's own localized label when the integration ships
    // a translation for this option — so we match what HA shows elsewhere.
    const fes = (this.hass as unknown as {
      formatEntityState?: (s: unknown, v?: string) => string;
    }).formatEntityState;
    if (stateObj && typeof fes === "function") {
      const localized = fes.call(this.hass, stateObj, raw);
      if (localized && localized !== raw) return localized;
    }
    // Cloud Home Connect: "Cooking.Oven.Program.HeatingMode.HotAir" → "Hot Air"
    const dotted = raw.match(/Program\.(?:[^.]+\.)*([^.]+)$/);
    if (dotted) return dotted[1].replace(/([A-Z])/g, " $1").trim();
    // Favourites: "favorite_001" → "Favorite 1"
    const fav = raw.match(/^favou?rite[_-]?0*(\d+)$/i);
    if (fav) return `Favorite ${parseInt(fav[1], 10)}`;
    // Home Connect Local (homeconnect_ws) snake_case, e.g.
    // "cooking_oven_program_heating_mode_hot_air" → "Heating Mode Hot Air".
    // Strip the leading category so only the program part remains.
    const cleaned = raw
      .replace(/^cooking_[a-z0-9]+_program_/, "")
      .replace(/^oven_program_/, "")
      .replace(/^cooking_oven_program_/, "")
      .replace(/_/g, " ")
      .trim();
    if (!cleaned) return raw;
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private _formatRemainingTime(stateVal?: string): string {
    if (!stateVal || stateVal === "unknown" || stateVal === "unavailable")
      return "—";
    const seconds = parseInt(stateVal, 10);
    if (Number.isNaN(seconds)) return stateVal;
    if (seconds <= 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  }

  private _operationLabel(): {
    label: string;
    cls: string;
  } {
    const op = this._stateOf(this._entities.operation_state) || "inactive";
    const door = this._stateOf(this._entities.door);
    if (door === "on") return { label: "Door open", cls: "door-open" };
    if (op.includes("run")) return { label: "Running", cls: "running" };
    if (op.includes("pause")) return { label: "Paused", cls: "paused" };
    if (op.includes("finish")) return { label: "Finished", cls: "running" };
    if (op.includes("ready")) return { label: "Ready", cls: "" };
    if (op.includes("inactive")) return { label: "Off", cls: "" };
    return { label: op.replace(/_/g, " "), cls: "" };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    if (!this._deviceId) {
      return html`<ha-card>
        <div class="empty">
          Configure this card by selecting a Home Connect oven device.
        </div>
      </ha-card>`;
    }

    const device = this._device;
    if (!device) {
      return html`<ha-card>
        <div class="empty">Device not found. Open the card editor to re-select.</div>
      </ha-card>`;
    }

    const ent = this._entities;
    const op = this._operationLabel();
    const image = this._config.image_url ?? null;
    const progressRaw = this._stateOf(ent.program_progress);
    const progress = progressRaw ? parseFloat(progressRaw) : NaN;

    return html`<ha-card>
      ${this._renderHeader(device, op)}
      ${this._config.show_image !== false
        ? this._renderImage(image, progress, op.cls)
        : nothing}
      ${this._config.show_controls !== false
        ? this._renderControls(ent)
        : nothing}
      ${this._renderActions(ent, op.label)}
      ${this._renderSensors(ent)}
    </ha-card>`;
  }

  private _renderHeader(
    device: DeviceInfo,
    op: { label: string; cls: string }
  ): TemplateResult {
    return html`<div class="header">
      <div>
        <div class="title">${this._config?.name || device.name}</div>
        <div class="subtitle">
          ${[device.manufacturer, device.model_id || device.model]
            .filter(Boolean)
            .join(" • ") || "Home Connect"}
        </div>
      </div>
      <div class="status-pill ${op.cls}">${op.label}</div>
    </div>`;
  }

  private _renderImage(
    image: string | null,
    progress: number,
    stateCls = ""
  ): TemplateResult {
    const showImage = image && !this._imageFailed;
    return html`<div class="image-wrap ${stateCls}">
      ${showImage
        ? html`<img
            src=${image}
            alt="Oven"
            loading="lazy"
            @error=${() => {
              this._imageFailed = true;
            }}
          />`
        : html`<ha-icon class="oven-icon" icon="mdi:toaster-oven"></ha-icon>`}
      ${!Number.isNaN(progress) && progress > 0 && progress < 100
        ? html`<div class="progress-overlay">
            <div class="bar" style="width:${progress}%"></div>
          </div>`
        : nothing}
    </div>`;
  }

  private _renderControls(ent: Partial<ResolvedEntities>): TemplateResult {
    const showProgram =
      this._config?.show_program_select !== false &&
      (ent.selected_program || ent.active_program);
    const showTemp =
      this._config?.show_temperature !== false && ent.setpoint_temperature;
    const showDoor = this._config?.show_door !== false && ent.door;
    const showChildLock = this._config?.show_child_lock && ent.child_lock;

    if (!showProgram && !showTemp && !showDoor && !showChildLock && !ent.power) {
      return html``;
    }

    return html`<div class="controls">
      ${ent.power ? this._renderPowerControl(ent.power) : nothing}
      ${showDoor ? this._renderDoorControl(ent.door!) : nothing}
      ${showProgram
        ? this._renderProgramControl(
            ent.selected_program || ent.active_program!
          )
        : nothing}
      ${showTemp ? this._renderTempControl(ent.setpoint_temperature!) : nothing}
      ${showChildLock ? this._renderChildLockControl(ent.child_lock!) : nothing}
    </div>`;
  }

  private _renderPowerControl(entityId: string): TemplateResult {
    const state = this._stateOf(entityId);
    const on = state === "on";
    return html`<div class="control">
      <div class="label">Power</div>
      <div class="switch-row">
        <span class="value">${on ? "On" : "Off"}</span>
        <ha-switch
          .checked=${on}
          @change=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this._call("switch", target.checked ? "turn_on" : "turn_off", {
              entity_id: entityId,
            });
          }}
        ></ha-switch>
      </div>
    </div>`;
  }

  private _renderDoorControl(entityId: string): TemplateResult {
    const state = this._stateOf(entityId);
    const open = state === "on";
    return html`<div class="control">
      <div class="label">Door</div>
      <div class="value">
        <ha-icon
          icon=${open ? "mdi:door-open" : "mdi:door-closed"}
          style="vertical-align:middle;margin-right:6px;color:${open
            ? "var(--error-color)"
            : "var(--success-color, #43a047)"}"
        ></ha-icon>
        ${open ? "Open" : "Closed"}
      </div>
    </div>`;
  }

  private _renderProgramControl(entityId: string): TemplateResult {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return html``;
    const options = (stateObj.attributes?.options as string[]) || [];
    const current = stateObj.state;
    return html`<div class="control full">
      <div class="label">Program</div>
      <select
        @change=${(e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          this._call("select", "select_option", {
            entity_id: entityId,
            option: value,
          });
        }}
      >
        ${options.length === 0
          ? html`<option>${this._formatProgramName(current, stateObj)}</option>`
          : options.map(
              (opt) => html`<option
                value=${opt}
                ?selected=${opt === current}
              >
                ${this._formatProgramName(opt, stateObj)}
              </option>`
            )}
      </select>
    </div>`;
  }

  private _renderTempControl(entityId: string): TemplateResult {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return html``;
    const min = Number(stateObj.attributes?.min ?? 30);
    const max = Number(stateObj.attributes?.max ?? 275);
    const step = Number(stateObj.attributes?.step ?? 5);
    const unit = (stateObj.attributes?.unit_of_measurement as string) || "°C";
    const value = Number(stateObj.state) || min;

    return html`<div class="control full">
      <div class="label">Target temperature</div>
      <div class="temp-row">
        <input
          type="range"
          min=${min}
          max=${max}
          step=${step}
          .value=${String(value)}
          @change=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            this._call("number", "set_value", {
              entity_id: entityId,
              value: Number(v),
            });
          }}
        />
        <span class="temp-value">${value}${unit}</span>
      </div>
    </div>`;
  }

  private _renderChildLockControl(entityId: string): TemplateResult {
    const state = this._stateOf(entityId);
    const on = state === "on";
    return html`<div class="control">
      <div class="label">Child lock</div>
      <div class="switch-row">
        <span class="value">${on ? "Locked" : "Unlocked"}</span>
        <ha-switch
          .checked=${on}
          @change=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this._call("switch", target.checked ? "turn_on" : "turn_off", {
              entity_id: entityId,
            });
          }}
        ></ha-switch>
      </div>
    </div>`;
  }

  private _renderActions(
    ent: Partial<ResolvedEntities>,
    opLabel: string
  ): TemplateResult {
    const hasStart = !!ent.start_button;
    const hasStop = !!ent.stop_button;
    const hasPause = !!ent.pause_button;
    const hasResume = !!ent.resume_button;
    if (!hasStart && !hasStop && !hasPause && !hasResume) return html``;

    const running = /running/i.test(opLabel);
    const paused = /paused/i.test(opLabel);

    return html`<div class="action-row">
      ${hasStart
        ? html`<button
            class="btn primary"
            ?disabled=${running}
            @click=${() =>
              this._call("button", "press", {
                entity_id: ent.start_button,
              })}
          >
            Start
          </button>`
        : nothing}
      ${hasPause && running
        ? html`<button
            class="btn"
            @click=${() =>
              this._call("button", "press", {
                entity_id: ent.pause_button,
              })}
          >
            Pause
          </button>`
        : nothing}
      ${hasResume && paused
        ? html`<button
            class="btn"
            @click=${() =>
              this._call("button", "press", {
                entity_id: ent.resume_button,
              })}
          >
            Resume
          </button>`
        : nothing}
      ${hasStop
        ? html`<button
            class="btn danger"
            ?disabled=${!running && !paused}
            @click=${() =>
              this._call("button", "press", {
                entity_id: ent.stop_button,
              })}
          >
            Stop
          </button>`
        : nothing}
    </div>`;
  }

  private _renderSensors(ent: Partial<ResolvedEntities>): TemplateResult {
    const wanted = this._config?.sensors ?? DEFAULT_SENSORS;
    if (!wanted.length) return html``;
    // Known keys → compact status tiles; raw entity_ids (added device
    // entities) → native interactive rows (toggles, selects, numbers…).
    const tiles: TemplateResult[] = [];
    const rowEntities: string[] = [];
    for (const key of wanted) {
      if (key.includes(".")) {
        rowEntities.push(key);
      } else {
        const tile = this._renderSensorTile(key, ent);
        if (tile) tiles.push(tile);
      }
    }
    return html`
      ${tiles.length
        ? html`<div class="sensor-list">${tiles}</div>`
        : nothing}
      ${rowEntities.length ? this._renderEntityRows(rowEntities) : nothing}
    `;
  }

  private _renderEntityRows(entityIds: string[]): TemplateResult {
    if (!this._rowHelpers) {
      this._ensureRowHelpers();
      return html``;
    }
    const rows = entityIds.map((entityId) => {
      if (!this.hass.states[entityId]) return nothing;
      let row = this._rowCache.get(entityId);
      if (!row) {
        const friendly = this.hass.states[entityId].attributes
          ?.friendly_name as string | undefined;
        row = this._rowHelpers!.createRowElement({
          entity: entityId,
          name: prettifyLabel(friendly || entityId),
        });
        this._rowCache.set(entityId, row);
      }
      row.hass = this.hass;
      return html`<div class="entity-row">${row}</div>`;
    });
    return html`<div class="entity-rows">${rows}</div>`;
  }

  private _renderSensorTile(
    key: string,
    ent: Partial<ResolvedEntities>
  ): TemplateResult | null {
    const isCustomEntity = key.includes(".");
    const entityId = isCustomEntity
      ? key
      : (ent as Record<string, string | undefined>)[key];
    if (!entityId) return null;
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return null;
    const friendly =
      (stateObj.attributes?.friendly_name as string) ||
      key.replace(/_/g, " ");
    let reading: string;
    if (key === "remaining_program_time") {
      reading = this._formatRemainingTime(stateObj.state);
    } else if (key === "program_progress") {
      reading = `${Math.round(Number(stateObj.state) || 0)}%`;
    } else if (key === "operation_state") {
      reading = stateObj.state.replace(/_/g, " ");
    } else if (key === "duration" || /^number\..*_duration$/.test(entityId)) {
      reading = this._formatDurationSeconds(stateObj.state);
    } else {
      const fes = (this.hass as unknown as {
        formatEntityState?: (s: unknown) => string;
      }).formatEntityState;
      if (typeof fes === "function") {
        reading = fes.call(this.hass, stateObj);
      } else {
        const unit = stateObj.attributes?.unit_of_measurement as string;
        reading = unit ? `${stateObj.state} ${unit}` : stateObj.state;
      }
    }
    return html`<div class="sensor">
      <div class="name">
        ${prettifyLabel(friendly.replace(/^.*?_/, "").replace(/_/g, " "))}
      </div>
      <div class="reading">${reading}</div>
    </div>`;
  }

  // A duration in seconds → "1 h 0 min" / "45 min".
  private _formatDurationSeconds(stateVal?: string): string {
    if (!stateVal || stateVal === "unknown" || stateVal === "unavailable")
      return "—";
    const total = Math.round(parseFloat(stateVal));
    if (Number.isNaN(total)) return stateVal;
    const h = Math.floor(total / 3600);
    const m = Math.round((total % 3600) / 60);
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "home-connect-oven-card": HomeConnectOvenCard;
  }
}
