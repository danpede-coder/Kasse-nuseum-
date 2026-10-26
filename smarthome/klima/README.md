# Klima-Timer (Zimmer Nehemia)

Aus-Timer: Die Klimaanlage `climate.klimaanlage` (tado) geht nach der eingestellten Dauer aus. Den Modus (Heizen/Kühlen …) stellt man am Thermostat ein.

## Bausteine

| Baustein | Aufgabe |
|---|---|
| `input_number.klima_timer_st` / `_min` | Dauer (0–12 h, 0–55 min in 5er-Schritten) |
| `script.klima_timer_start` | Bei Dauer > 0: schaltet die Klima ein, falls sie aus ist (letzter Modus, sonst bleibt der Modus unverändert), und startet `timer.klima_timer`. Code: `klima_timer_start.yaml` |
| `script.klima_timer_stop` | Bricht den Timer ab und schaltet aus |
| `automation.klima_timer_abgelaufen` | Bei `timer.finished`: Klima aus, Push ans iPhone |
| `custom:klima-timer-dial` | Karte (Inline-Ressource `518ef68698804389b3c592e095db3ffc`). Code: `klima-timer-dial.js` |

## Karte

Dashboard „Zuhause“ (`zuhause-nehemia`), Spalte Klima, unter dem Thermostat:

```yaml
type: custom:klima-timer-dial
name: Timer
max_minutes: 720   # Ring = 12 h, jeder Strich = 1 h
layout: horizontal # Ring links, Titel und Knopf rechts (≈ 175 px hoch, passt aufs iPad)
card_mod: { style: "<Glas-Stil wie die anderen Karten>" }
```

- Am Ring ziehen stellt die Dauer ein. Der Knopf startet bzw. stoppt, bei laufendem Timer erscheint der Countdown.
- `mode_entity` (optional, im Dashboard nicht genutzt) zeigt Pillen für die Optionen eines input_select. Die Ringfarbe folgt dem Modus (Heizen rot, Kühlen blau, über `mode_colors` änderbar, nur `#RRGGBB`). Solange der Timer läuft, sind die Pillen gesperrt.
- Ohne `mode_entity` sieht die Karte aus wie die ursprüngliche Version.
- Fehler der alten Version behoben (18.10.):
  - Ein Tipp auf Start oder auf die Mitte hat vorher die Dauer verstellt (z. B. auf 6 h), in Chromium wurde dann gar nicht gestartet. Jetzt reagiert nur noch der Ring.
  - Über 12 Uhr hinaus springt der Wert nicht mehr auf 0 bzw. das Maximum.
  - Nach einem View-Wechsel läuft der Countdown weiter.
- Nach einer Änderung am Code: Ressource mit `ha_config_set_dashboard_resource(content=…, resource_id=518ef…)` neu speichern und den Browser (iPad) neu laden.
