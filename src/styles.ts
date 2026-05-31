import { css } from "lit";

export const cardStyles = css`
  :host {
    display: block;
  }

  ha-card {
    overflow: hidden;
    padding: 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 8px;
  }

  .title {
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .subtitle {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    margin-top: 2px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 500;
    background: var(--secondary-background-color);
    color: var(--secondary-text-color);
  }

  .status-pill.running {
    background: rgba(76, 175, 80, 0.16);
    color: var(--success-color, #43a047);
  }

  .status-pill.paused {
    background: rgba(255, 152, 0, 0.16);
    color: var(--warning-color, #ffa726);
  }

  .status-pill.door-open {
    background: rgba(244, 67, 54, 0.16);
    color: var(--error-color, #e53935);
  }

  .image-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px 4px;
    min-height: 140px;
  }

  .image-wrap img {
    max-width: 60%;
    max-height: 180px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
  }

  .image-wrap .image-placeholder {
    color: var(--secondary-text-color);
    font-size: 0.85rem;
    opacity: 0.6;
  }

  .progress-overlay {
    position: absolute;
    bottom: 8px;
    left: 16px;
    right: 16px;
    height: 4px;
    border-radius: 2px;
    background: var(--divider-color);
    overflow: hidden;
  }

  .progress-overlay .bar {
    height: 100%;
    background: var(--primary-color);
    transition: width 0.4s ease;
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 8px 16px;
  }

  .control {
    background: var(--secondary-background-color);
    border-radius: 12px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 64px;
  }

  .control.full {
    grid-column: 1 / -1;
  }

  .control .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--secondary-text-color);
  }

  .control .value {
    font-size: 1rem;
    color: var(--primary-text-color);
  }

  .control select,
  .control input[type="number"] {
    background: transparent;
    border: none;
    color: var(--primary-text-color);
    font: inherit;
    width: 100%;
    outline: none;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .temp-row input[type="range"] {
    flex: 1;
  }

  .temp-value {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    min-width: 56px;
    text-align: right;
  }

  .action-row {
    display: flex;
    gap: 8px;
    padding: 4px 16px 12px;
  }

  .btn {
    flex: 1;
    border: none;
    border-radius: 10px;
    padding: 10px 0;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    transition: background 0.15s ease, transform 0.05s ease;
  }

  .btn:active {
    transform: translateY(1px);
  }

  .btn.primary {
    background: var(--primary-color);
    color: var(--text-primary-color, white);
  }

  .btn.danger {
    background: var(--error-color, #e53935);
    color: white;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .sensor-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    padding: 4px 16px 16px;
  }

  .sensor {
    background: var(--secondary-background-color);
    border-radius: 10px;
    padding: 8px 10px;
  }

  .sensor .name {
    font-size: 0.7rem;
    color: var(--secondary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sensor .reading {
    font-size: 0.95rem;
    margin-top: 2px;
    color: var(--primary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  ha-switch {
    --switch-checked-color: var(--primary-color);
  }

  .empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--secondary-text-color);
  }
`;
