export const CARD_VERSION = "0.1.0";
export const CARD_NAME = "home-connect-oven-card";
export const EDITOR_NAME = "home-connect-oven-card-editor";

export const DEFAULT_SENSORS = [
  "operation_state",
  "remaining_program_time",
  "program_progress",
  "current_cavity_temperature",
];

export const ENTITY_KEY_PATTERNS: Record<string, RegExp[]> = {
  power: [/_power$/],
  door: [/_door$/],
  active_program: [/_active_program$/],
  selected_program: [/_selected_program$/],
  setpoint_temperature: [/_setpoint_temperature$/, /_oven_temperature$/],
  duration: [/_duration$/],
  operation_state: [/_operation_state$/],
  remaining_program_time: [/_remaining_program_time$/],
  program_progress: [/_program_progress$/],
  current_cavity_temperature: [/_current_cavity_temperature$/],
  child_lock: [/_child_lock$/],
  start_button: [/_start_program$/],
  stop_button: [/_stop_program$/],
  pause_button: [/_pause_program$/],
  resume_button: [/_resume_program$/],
};
