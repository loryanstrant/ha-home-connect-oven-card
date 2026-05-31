# Home Connect Oven Card

A visual Lovelace card for the **Home Connect** integration. Pick an oven device and get a single card with the product photo, power switch, program selector, target-temperature slider, door indicator, start/pause/stop buttons, and a configurable strip of sensor tiles.

## Quick start

1. Install via HACS, then refresh your browser.
2. Edit a dashboard → **Add Card** → search for **Home Connect Oven Card**.
3. Pick your oven from the device dropdown — entities are auto-resolved.

## Configuration

| Option | Type | Default |
| --- | --- | --- |
| `device_id` | string | — |
| `name` | string | device name |
| `image_url` | string | bundled lookup |
| `show_image` | bool | `true` |
| `show_controls` | bool | `true` |
| `show_program_select` | bool | `true` |
| `show_temperature` | bool | `true` |
| `show_door` | bool | `true` |
| `show_child_lock` | bool | `false` |
| `sensors` | array | operation_state, remaining_program_time, program_progress, current_cavity_temperature |
| `entities` | object | per-key entity overrides |

See the [README](README.md) for screenshots and full docs.
