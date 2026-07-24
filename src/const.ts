export const CARD_VERSION = "0.2.3";
export const CARD_NAME = "home-connect-oven-card";
export const EDITOR_NAME = "home-connect-oven-card-editor";

export const DEFAULT_SENSORS = [
  "operation_state",
  "remaining_program_time",
  "program_progress",
  "current_cavity_temperature",
];

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
