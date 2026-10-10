# Briefing für Claude: Lichtsteuerung Zimmer Nehemia (Aqara FP400)

Ziel: Das Licht soll für zwei Personen (Dan, Caleb) im Alltag funktionieren. Es schaltet nur bei Dunkelheit. Wer im Bett liegt, wird nicht gestört. Alles läuft in **einer** Automation: `automation.nehemia_licht_steuerung_2_personen` (Code: `nehemia_licht_steuerung.yaml`, gleiche `id`).

## Geräte (Home Assistant, Matter)

| Zone (Aqara-App) | Entity | Rolle |
|---|---|---|
| Gesamt | `binary_sensor.spatial_multi_sensor_fp400_belegung` | Raum belegt |
| Schrank | `…_belegung_2` | wach |
| Sofa | `…_belegung_3` | wach |
| Bett Caleb | `…_belegung_4` | Bett (Empfindlichkeit 3) |
| Bett Dan | `…_belegung_5` | Bett (Empfindlichkeit 3) |
| Bett Gang | `…_belegung_6` | wach |
| Wand iPad | `…_belegung_7` | wach |
| Raum Mitte (weiße Fläche) | `…_belegung_8` | wach |
| Ausgang, Kante | – | kommen nicht über Matter in HA an |
| Zimmertür | `binary_sensor.myggbett_door_window_sensor_tur_2` | für „Zimmer leer“ |

Lampen: `light.hue_white_lamp_1` = Schranklicht, `light.hue_white_lamp_2` = Sofa-/Fensterlicht, `light.zimmer_nehemia_tur_licht` = Türlicht (nur Orientierung).

## Helfer

- Bett-Merker (entprellt): `input_boolean.nehemia_bett_dan`, `input_boolean.nehemia_bett_caleb`. Sie gehen an, wenn die Bettzone `bett_entprellung` (45 s) lang belegt ist, und aus, wenn sie `bett_nachlauf` (90 s) lang frei ist.
- Gruppe `binary_sensor.nehemia_jemand_wach` (Zonen 2, 3, 6, 7, 8) wird nur für den Gute-Nacht-Trigger genutzt.
- Dunkel: `input_boolean.nehemia_dunkel_gespeicherter_status` (gesetzt von „Nehemia Dunkelstatus aktualisieren“, Lux 20/60).
- Modi je Lampe: `input_select.nehemia_modus_{schrank,sofa,tuerlicht}` = `automatik | manuell_an | manuell_aus`.
- Zahlen: `input_number.nehemia_helligkeit_{normal,nebenlampe,bett}`, `…_nachlaufzeit_zonenwechsel` (60 s), `…_bettschutz_freigabezeit` (60 s), `…_bett_entprellung` (45 s), `…_bett_nachlauf` (90 s), `…_leerzeit_zimmer` (120 s), `…_leerzeit_lang` (20 min), `…_gute_nacht_zeit` (20 min).

## Grundprinzipien

1. **Sollzustand statt Ereignislogik.** Jeder Lauf berechnet Basiswerte → Zonen/Bett → wach → `ziel_*` (Prozent; 0 = aus; −1 = so lassen) und schaltet nur, wenn Soll und Ist auseinanderliegen. `mode: queued`.
2. **Halten statt Ausschalten.** Eine Lampe wird nicht gedimmt oder ausgeschaltet, solange eine ihrer Zonen vor weniger als der Nachlaufzeit noch belegt war (`h_*`). Das fängt das Flattern der FP400-Zonen ab und ist neustartsicher.
3. **Niemand wach und niemand im Bett → nichts ausschalten.** Ausschalten übernimmt nur „Zimmer leer“. Das gilt nur, wenn sich die Tür in den letzten Leerzeit + 5 min bewegt hat, sonst nach 20 min (`leer_lang`). So löscht ein Radar-Aussetzer bei einer ruhig sitzenden Person kein Licht.
4. **Geist-Erkennung.** Liegen laut Merkern und Rohzonen beide im Bett, zählt eine Wach-Zone nicht für die Lampen, nur das Türlicht geht auf 1 %. Steht jemand auf, fällt seine Bettzone ab, und das gedimmte Licht kommt.

## Verhalten (bei Dunkelheit)

| Situation | Schranklicht | Sofalicht | Türlicht |
|---|---|---|---|
| Wach am Sofa | Nebenlampe (nur wenn an und Schrank-/Mitte-Zone nicht mehr im Nachlauf) | normal | aus |
| Wach am Schrank | normal | Nebenlampe (dito) | aus |
| Wach in Mitte / Gang / iPad | normal | normal | aus |
| Einer im Bett + anderer am Schrank | Bett-Helligkeit | aus | 1 % |
| Einer im Bett + anderer woanders wach | aus | Bett-Helligkeit | 1 % |
| Einer im Bett, sonst keiner wach | hell → Bett-Helligkeit, gedimmt bleibt | dito | aus |
| Beide im Bett, keiner wach (auch „Geist“) | aus | aus | aus bzw. 1 % bei Geist |
| Gute-Nacht-Zeit ohne Wache und jemand im Bett | aus | aus | aus |
| Zimmer leer (bestätigt) | aus + HomePod stopp, Modi und Merker zurücksetzen | aus | aus |

- Bettschutz: Nach dem Aufstehen gibt es noch etwa 2,5 min gedimmtes Licht (90 s Bett-Nachlauf + 60 s Freigabe).
- Tagsüber schaltet die Automation nichts. Ausnahmen: „Zimmer leer“ und Gute-Nacht.
- Nachttisch-Taste 4 setzt `manuell_an` (Leselicht). Schaltet danach eine **Automation oder ein Skript** die Lampe aus (Taste 1, Fokus, Fenster), springt der Modus zurück auf `automatik`. Bei manuellem Ausschalten (App, Schalter) bleibt der Modus.
- Taste 1 schaltet nur aus. Die Automatik bleibt aktiv.

## Regeln für Änderungen

1. Keine zweite Automation für dieselben Lampen anlegen.
2. In einem `- variables:`-Schritt darf keine Variable eine andere aus demselben Schritt lesen (HA sortiert die Schlüssel). Abgeleitete Werte gehören in einen späteren Schritt.
3. Helligkeiten und Zeiten nur über die `input_number`-Helfer ändern.
4. Vor dem Einspielen die `ziel_*`-Templates mit `ha_eval_template` gegen die Szenario-Matrix testen (siehe oben). Danach `run_actions` ausführen und im Trace prüfen, dass alle Variablen gesetzt sind und das System-Log keine „undefined“-Warnungen zeigt.
5. Repo-YAML immer mit `id: "1791637610981"` pflegen, damit ein Einspielen die bestehende Automation ersetzt und keine zweite anlegt.
6. Das Polygon „Raum Mitte“ (Zone 8) überlappt den Schrank und Bett Dan. Das muss in der Aqara-App korrigiert werden, nicht im Code.
7. Backup der alten (gelöschten) Automationen: `backup_alte_automationen.json`.
