import { HomeAssistant } from "custom-card-helpers";
import { ENTITY_KEY_PATTERNS } from "./const";
import { DeviceInfo, ResolvedEntities } from "./types";

interface HassDevice {
  id: string;
  name: string | null;
  name_by_user: string | null;
  model: string | null;
  manufacturer: string | null;
}

interface HassEntity {
  entity_id: string;
  device_id: string | null;
  platform?: string;
}

interface HassExt extends HomeAssistant {
  devices?: Record<string, HassDevice>;
  entities?: Record<string, HassEntity>;
}

export function getDeviceInfo(
  hass: HomeAssistant,
  deviceId: string
): DeviceInfo | null {
  const ext = hass as HassExt;
  const device = ext.devices?.[deviceId];
  if (!device) return null;
  return {
    id: device.id,
    name: device.name_by_user || device.name || "Oven",
    model: device.model,
    manufacturer: device.manufacturer,
  };
}

export function getDeviceEntities(
  hass: HomeAssistant,
  deviceId: string
): string[] {
  const ext = hass as HassExt;
  if (!ext.entities) return [];
  return Object.values(ext.entities)
    .filter((e) => e.device_id === deviceId)
    .map((e) => e.entity_id);
}

export function resolveEntities(
  hass: HomeAssistant,
  deviceId: string,
  overrides: Partial<ResolvedEntities> = {}
): Partial<ResolvedEntities> {
  const entityIds = getDeviceEntities(hass, deviceId);
  const resolved: Partial<ResolvedEntities> = { ...overrides };
  for (const [key, patterns] of Object.entries(ENTITY_KEY_PATTERNS)) {
    const k = key as keyof ResolvedEntities;
    if (resolved[k]) continue;
    const match = entityIds.find((id) =>
      patterns.some((re) => re.test(id))
    );
    if (match) resolved[k] = match;
  }
  return resolved;
}

export function findHomeConnectOvenDevices(hass: HomeAssistant): DeviceInfo[] {
  const ext = hass as HassExt;
  if (!ext.devices || !ext.entities) return [];
  const homeConnectDeviceIds = new Set<string>();
  for (const ent of Object.values(ext.entities)) {
    if (ent.platform === "home_connect" && ent.device_id) {
      homeConnectDeviceIds.add(ent.device_id);
    }
  }
  const ovens: DeviceInfo[] = [];
  for (const id of homeConnectDeviceIds) {
    const d = ext.devices[id];
    if (!d) continue;
    const entityIds = getDeviceEntities(hass, id);
    const isOven = entityIds.some(
      (e) =>
        /_oven_/i.test(e) ||
        /_current_cavity_temperature$/.test(e) ||
        /_setpoint_temperature$/.test(e)
    );
    if (!isOven) continue;
    ovens.push({
      id: d.id,
      name: d.name_by_user || d.name || "Oven",
      model: d.model,
      manufacturer: d.manufacturer,
    });
  }
  return ovens;
}
