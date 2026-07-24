import { LitElement, html, TemplateResult, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

import { EDITOR_NAME, DEFAULT_SENSORS } from "./const";
import { HomeConnectOvenCardConfig } from "./types";
import {
  findHomeConnectOvenDevices,
  getDeviceEntities,
  resolveEntities,
} from "./entity-resolver";

const SENSOR_CHOICES: { key: string; label: string }[] = [
  { key: "operation_state", label: "Operation state" },
  { key: "remaining_program_time", label: "Remaining time" },
  { key: "program_progress", label: "Program progress" },
  { key: "current_cavity_temperature", label: "Current temperature" },
  { key: "active_program", label: "Active program" },
  { key: "selected_program", label: "Selected program" },
  { key: "duration", label: "Duration" },
  { key: "door", label: "Door state" },
];

@customElement(EDITOR_NAME)
export class HomeConnectOvenCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: HomeConnectOvenCardConfig;

  public static styles = css`
    .row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    label {
      font-size: 0.85rem;
      color: var(--secondary-text-color);
    }
    select,
    input[type="text"] {
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font: inherit;
    }
    .toggles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--secondary-background-color);
      border-radius: 8px;
    }
    .sensors {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .sensor-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: var(--secondary-background-color);
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .hint {
      font-size: 0.78rem;
      color: var(--secondary-text-color);
      margin-top: 4px;
    }
  `;

  public setConfig(config: HomeConnectOvenCardConfig): void {
    this._config = { ...config };
  }

  private _update(patch: Partial<HomeConnectOvenCardConfig>): void {
    this._config = { ...(this._config as HomeConnectOvenCardConfig), ...patch };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleSensor(key: string, checked: boolean): void {
    const current = new Set(this._config?.sensors ?? DEFAULT_SENSORS);
    if (checked) current.add(key);
    else current.delete(key);
    this._update({ sensors: Array.from(current) });
  }

  // Resolve a picked media item to a servable URL and store it as image_url.
  private async _pickMedia(ev: CustomEvent): Promise<void> {
    const value = ev.detail?.value as
      | { media_content_id?: string }
      | undefined;
    const mediaContentId = value?.media_content_id;
    if (!mediaContentId) return;
    try {
      const res = (await this.hass.callWS({
        type: "media_source/resolve_media",
        media_content_id: mediaContentId,
      })) as { url?: string };
      if (res?.url) this._update({ image_url: res.url });
    } catch (err) {
      // Leave the existing value if the media can't be resolved.
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    const ovens = findHomeConnectOvenDevices(this.hass);
    const selectedSensors = new Set(
      this._config.sensors ?? DEFAULT_SENSORS
    );

    const resolved = this._config.device_id
      ? resolveEntities(this.hass, this._config.device_id)
      : {};
    const allEntities = this._config.device_id
      ? getDeviceEntities(this.hass, this._config.device_id)
      : [];
    // Every other entity on the device that isn't already one of the known
    // sensor keys — so any Home Connect entity can be added as a tile.
    const resolvedIds = new Set(
      Object.values(resolved).filter(Boolean) as string[]
    );
    const extraEntities = allEntities
      .filter((e) => /^(sensor|binary_sensor|number|select|switch)\./.test(e))
      .filter((e) => !resolvedIds.has(e))
      .sort();

    return html`
      <div class="row">
        <label>Oven device</label>
        <select
          @change=${(e: Event) =>
            this._update({
              device_id: (e.target as HTMLSelectElement).value || undefined,
            })}
        >
          <option value="">— Select an oven —</option>
          ${ovens.map(
            (d) => html`<option
              value=${d.id}
              ?selected=${d.id === this._config?.device_id}
            >
              ${d.name} ${d.model ? `(${d.model})` : ""}
            </option>`
          )}
        </select>
        ${ovens.length === 0
          ? html`<div class="hint">
              No Home Connect ovens detected. Make sure the integration is
              installed and the device is online.
            </div>`
          : html`<div class="hint">
              Detected ${ovens.length} Home Connect oven${ovens.length === 1
                ? ""
                : "s"}.
              ${allEntities.length} entities found for the selected device.
            </div>`}
      </div>

      <div class="row">
        <label>Card title (optional)</label>
        <input
          type="text"
          .value=${this._config.name ?? ""}
          placeholder="Defaults to the device name"
          @input=${(e: Event) =>
            this._update({
              name: (e.target as HTMLInputElement).value || undefined,
            })}
        />
      </div>

      <div class="row">
        <label>Oven image (optional)</label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{ media: {} }}
          @value-changed=${this._pickMedia}
        ></ha-selector>
        <input
          type="text"
          .value=${this._config.image_url ?? ""}
          placeholder="…or paste an image URL / path"
          @input=${(e: Event) =>
            this._update({
              image_url: (e.target as HTMLInputElement).value || undefined,
            })}
        />
        <div class="hint">
          Browse your media to pick a photo, or paste any image URL. Leave blank
          to show a built-in oven icon.
        </div>
      </div>

      <div class="row">
        <label>Sections</label>
        <div class="toggles">
          ${this._renderToggle("show_image", "Show image", true)}
          ${this._renderToggle("show_controls", "Show controls", true)}
          ${this._renderToggle(
            "show_program_select",
            "Program selector",
            true
          )}
          ${this._renderToggle("show_temperature", "Temperature", true)}
          ${this._renderToggle("show_door", "Door state", true)}
          ${this._renderToggle("show_child_lock", "Child lock", false)}
        </div>
      </div>

      <div class="row">
        <label>Sensors to display</label>
        <div class="sensors">
          ${SENSOR_CHOICES.map((s) => {
            const entityId = (
              resolved as Record<string, string | undefined>
            )[s.key];
            const disabled = !entityId;
            return html`<label class="sensor-chip">
              <input
                type="checkbox"
                .checked=${selectedSensors.has(s.key)}
                ?disabled=${disabled}
                @change=${(e: Event) =>
                  this._toggleSensor(
                    s.key,
                    (e.target as HTMLInputElement).checked
                  )}
              />
              <span>${s.label}</span>
            </label>`;
          })}
        </div>
        <div class="hint">
          Greyed-out sensors aren't exposed by the selected device.
        </div>
      </div>

      ${extraEntities.length
        ? html`<div class="row">
            <label>Other device entities</label>
            <div class="sensors">
              ${extraEntities.map((entityId) => {
                const name =
                  (this.hass.states[entityId]?.attributes
                    ?.friendly_name as string) || entityId;
                return html`<label class="sensor-chip">
                  <input
                    type="checkbox"
                    .checked=${selectedSensors.has(entityId)}
                    @change=${(e: Event) =>
                      this._toggleSensor(
                        entityId,
                        (e.target as HTMLInputElement).checked
                      )}
                  />
                  <span>${name}</span>
                </label>`;
              })}
            </div>
            <div class="hint">
              Any other sensor, switch, number or select exposed by the oven.
            </div>
          </div>`
        : ""}
    `;
  }

  private _renderToggle(
    key: keyof HomeConnectOvenCardConfig,
    label: string,
    defaultValue: boolean
  ): TemplateResult {
    const current =
      this._config && key in this._config
        ? Boolean(this._config[key])
        : defaultValue;
    return html`<div class="toggle">
      <span>${label}</span>
      <input
        type="checkbox"
        .checked=${current}
        @change=${(e: Event) =>
          this._update({
            [key]: (e.target as HTMLInputElement).checked,
          } as Partial<HomeConnectOvenCardConfig>)}
      />
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-connect-oven-card-editor": HomeConnectOvenCardEditor;
  }
}
