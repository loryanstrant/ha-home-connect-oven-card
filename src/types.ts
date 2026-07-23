import { LovelaceCardConfig } from "custom-card-helpers";

export interface HomeConnectOvenCardConfig extends LovelaceCardConfig {
  type: string;
  device_id?: string;
  name?: string;
  image_url?: string;
  show_image?: boolean;
  show_controls?: boolean;
  show_program_select?: boolean;
  show_temperature?: boolean;
  show_door?: boolean;
  show_child_lock?: boolean;
  sensors?: string[];
  entities?: Partial<ResolvedEntities>;
}

export interface ResolvedEntities {
  power: string;
  door: string;
  active_program: string;
  selected_program: string;
  setpoint_temperature: string;
  duration: string;
  operation_state: string;
  remaining_program_time: string;
  program_progress: string;
  current_cavity_temperature: string;
  child_lock: string;
  start_button: string;
  stop_button: string;
  pause_button: string;
  resume_button: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  model: string | null;
  model_id: string | null;
  manufacturer: string | null;
}
