# Briefing für Claude: Lichtsteuerung Zimmer Nehemia (Aqara FP400)

Ziel: Das Licht soll für zwei Personen (Dan, Caleb) im Alltag funktionieren. Es schaltet nur bei Dunkelheit. Wer im Bett liegt, wird nicht gestört.

## Geräte (Home Assistant, Matter)

| Zone (Aqara-App) | Entity | Rolle |
|---|---|---|
| Gesamt | `binary_sensor.spatial_multi_sensor_fp400_belegung` | Raum belegt |
| Schrank | `…_belegung_2` | wach |
| Sofa | `…_belegung_3` | wach |
| Bett Caleb | `…_belegung_4` | Bett |
| Bett Dan | `…_belegung_5` | Bett |
| Bett Gang | `…_belegung_6` | wach |
| Wand iPad | `…_belegung_7` | wach |
| Raum Mitte (weiße Fläche) | `…_belegung_8` | wach |
| Ausgang, Kante | – | kommen nicht über Matter in HA an |
| Helligkeit | `sensor.spatial_multi_sensor_fp400_beleuchtungsstarke` | Lux |

Lampen: `light.hue_white_lamp_1` = Schranklicht, `light.hue_white_lamp_2` = Sofa-/Fensterlicht, `light.zimmer_nehemia_tur_licht` = Türlicht (nur Orientierung).

## Helfer

- Gruppen: `binary_sensor.nehemia_bett_belegt` (Betten), `binary_sensor.nehemia_jemand_wach` (alle Wach-Zonen)
- Dunkel: `input_boolean.nehemia_dunkel_gespeicherter_status` (wird von „Nehemia Dunkelstatus aktualisieren“ gesetzt, Lux 20/60 mit Hysterese)
- Modi je Lampe: `input_select.nehemia_modus_{schrank,sofa,tuerlicht}` = `automatik | manuell_an | manuell_aus`
- Zahlen: `input_number.nehemia_helligkeit_{normal,nebenlampe,bett}`, `…_nachlaufzeit_zonenwechsel`, `…_bettschutz_freigabezeit`, `…_leerzeit_zimmer`, `…_gute_nacht_zeit`

## Regeln (Automation „Nehemia Licht Steuerung (2 Personen)“)

Bei jedem Ereignis wird der Sollzustand aus den aktuellen Zuständen neu berechnet (`mode: restart`). Eine Lampe wird nur geschaltet, wenn ihr Modus auf `automatik` steht.

| Situation (dunkel) | Schranklicht | Sofalicht | Türlicht |
|---|---|---|---|
| Wach am Sofa | Nebenlampe (nur wenn schon an) | normal | aus |
| Wach am Schrank | normal | Nebenlampe (nur wenn schon an) | aus |
| Wach in Mitte / Gang / iPad | normal | normal | aus |
| Jemand im Bett + anderer am Schrank | Bett-Helligkeit | aus | 1 % |
| Jemand im Bett + anderer woanders wach | aus | Bett-Helligkeit | 1 % |
| Einer im Bett, sonst keiner wach | gedimmt, falls an | gedimmt, falls an | aus |
| Beide im Bett | aus | aus | aus |
| Seit Gute-Nacht-Zeit keiner wach | aus | aus | aus |
| Zimmer leer (Leerzeit) | aus + HomePod stopp | aus | aus |

- Bettschutz: Nach dem Aufstehen bleibt das Licht noch für die Bettschutz-Freigabezeit gedimmt (z. B. nachts zur Toilette).
- Tagsüber (nicht dunkel) schaltet die Automation nichts. Nur „Zimmer leer“ schaltet weiterhin aus.
- Nachttisch-Taste 4 setzt den Modus auf `manuell_an` (zum Lesen). Ist das Zimmer 5 Minuten leer, springen alle Modi zurück auf `automatik`.

## Regeln für Änderungen

1. Keine zweite Automation für dieselben Lampen anlegen. Alles läuft über diese eine.
2. Neue Zone: in die Gruppe `nehemia_jemand_wach` aufnehmen, in die Trigger `zone_an`/`zone_aus` eintragen und in `z_mitte` (oder als eigene Variable) ergänzen.
3. Helligkeiten und Zeiten nur über die `input_number`-Helfer ändern, nicht im Code.
4. Vor dem Speichern die Sollwert-Logik mit `ha_eval_template` und Testfällen prüfen (siehe Tabelle).
5. HA speichert `variables` alphabetisch sortiert. Neue Variablen so benennen, dass sie alphabetisch nach allen Variablen kommen, die sie lesen (Beispiel: `z_*` → `z_wach` → `ziel_*`).
6. Die Automationen „Fokus“ und „Nehemia bei offene Fenster …“ schalten die Lampen einmalig aus. Das ist gewollt und kein Konflikt.
7. Backup der alten (gelöschten) Automationen: `backup_alte_automationen.json`.
