export const CARD_VERSION = "0.3.0";
export const CARD_NAME = "home-connect-oven-card";
export const EDITOR_NAME = "home-connect-oven-card-editor";

export const DEFAULT_SENSORS = [
  "operation_state",
  "remaining_program_time",
  "program_progress",
  "current_cavity_temperature",
];

// The card's own defaults for the show/hide settings. Read by both the card
// (when filling in a partial config) and the editor (which strips any value
// equal to its default before saving, so editing one setting doesn't write
// the other five into the dashboard YAML). One source of truth is what makes
// that stripping safe.
export const TOGGLE_DEFAULTS = {
  show_image: true,
  show_controls: true,
  show_program_select: true,
  show_temperature: true,
  show_door: true,
  show_child_lock: false,
} as const;

export type ToggleKey = keyof typeof TOGGLE_DEFAULTS;

// The built-in readings the card can draw as tiles, in the order they are
// offered in the editor. Keys match ENTITY_KEY_PATTERNS below.
export const SENSOR_LABELS: Record<string, string> = {
  operation_state: "Operation state",
  remaining_program_time: "Remaining time",
  program_progress: "Program progress",
  current_cavity_temperature: "Current temperature",
  active_program: "Active program",
  selected_program: "Selected program",
  duration: "Duration",
  door: "Door state",
};

// Patterns are tried in order per key; the first pattern to find an entity
// wins. The cloud "home_connect" names come first, with Home Connect Local
// ("homeconnect_ws") fallbacks second. Local fallbacks are domain-anchored
// (^button./^sensor./^number.) so they don't grab same-suffix entities of
// another domain.
export const ENTITY_KEY_PATTERNS: Record<string, RegExp[]> = {
  power: [/_power$/],
  door: [/_door$/],
  active_program: [/_active_program$/],
  selected_program: [/_selected_program$/],
  setpoint_temperature: [/_setpoint_temperature$/, /_oven_temperature$/],
  duration: [/^number\..*_duration$/, /_duration$/],
  operation_state: [/_operation_state$/],
  remaining_program_time: [/_remaining_program_time$/],
  program_progress: [/_program_progress$/],
  current_cavity_temperature: [
    /_current_cavity_temperature$/,
    /^sensor\..*_current_temperature$/,
  ],
  child_lock: [/_child_lock$/],
  start_button: [/_start_program$/, /^button\..*_start$/],
  stop_button: [/_stop_program$/, /^button\..*_abort$/, /^button\..*_stop$/],
  pause_button: [/_pause_program$/, /^button\..*_pause$/],
  resume_button: [/_resume_program$/, /^button\..*_resume$/],
};
