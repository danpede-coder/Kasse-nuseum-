# Briefing für Claude: Lichtsteuerung Zimmer Nehemia (Aqara FP400)

Ziel: Das Licht soll für zwei Personen (Dan, Caleb) im Alltag funktionieren. Es schaltet nur bei Dunkelheit. Wer im Bett liegt, wird nicht gestört. Alles läuft in **einer** Automation: `automation.nehemia_licht_steuerung_2_personen` (Code: `nehemia_licht_steuerung.yaml`, gleiche `id`). Das Türlicht gehört bewusst **nicht** dazu.

## Geräte (Home Assistant)

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
| Zimmertür | `binary_sensor.myggbett_door_window_sensor_tur_2` | „Zimmer leer“ (zu und ruhig = lange Leerzeit) und Beleg für Aufstehen |

Lampen:
- `light.hue_white_lamp_1` = Schranklicht (Hue). Wird zeitweise ausgesteckt, weil die Steckdose gebraucht wird.
- `light.hue_white_lamp_2` = Sofa-/Fensterlicht (Hue).
- `light.zimmer_nehemia_tur_licht` = Türlicht (Matter). Seit 13.10. **nicht** mehr in der Automatik: Es war ab 10.10. oft offline und hing bei Befehlen 37 s. Das 1-%-Orientierungslicht kommt vom Fensterlicht, ersatzweise vom Schranklicht.

**Haltezeiten der FP400 (Aqara-App):** Bettzonen ≥ 10 s, Schrank 15 s, übrige Zonen 5–10 s. Am 11.10. um 00:53 wurden sie auf 1–5 s gesenkt, danach flatterten die Bettzonen. Seit 12.10. stehen sie wieder auf: `number.spatial_multi_sensor_fp400_haltezeit` (Gesamt) 10, `_2` 15, `_3` 10, `_4` 10, `_5` 10, `_6` 10, `_7` 10, `_8` 5. Werte nicht ändern ohne neuen Test.

**Hue-Einschaltverhalten:** „Wiederherstellung nach Stromausfall“ einstellen und die Lampe vor dem Ausstecken ausschalten. Sonst kommt sie nach dem Einstecken mit 100 % zurück.

## Helfer

- **Bett-Merker** `input_boolean.nehemia_bett_dan`, `input_boolean.nehemia_bett_caleb`:
  - An, wenn die Bettzone `bett_entprellung` (45 s) lang belegt ist.
  - Aus, wenn sie `bett_nachlauf` (90 s) lang frei ist **und** das Aufstehen belegt ist: Eine Wachzone oder die Tür hat sich seit dem Abfallen der Bettzone verändert, oder eine Wachzone ist an. Zonenwechsel zählen erst ab 2 s nach dem Bett-Aus, damit ein gleichzeitiger Radar-Ausfall nicht als Aufstehen gilt. Bei Dan zählt Zone 8 nicht, weil sie sein Bett überlappt.
  - Ohne Beleg bleibt der Merker an, denn das Radar hat dann nur den Schläfer verloren. Gelöscht wird er durch `leer_lang` oder das nächste belegte Aufstehen.
- `binary_sensor.nehemia_jemand_wach` (Gruppe der Zonen 2, 3, 6, 7, 8): nur für den Gute-Nacht-Trigger.
- Dunkel: `input_boolean.nehemia_dunkel_gespeicherter_status` (gesetzt von „Nehemia Dunkelstatus aktualisieren“, Lux 20/60).
- Modi je Lampe: `input_select.nehemia_modus_{schrank,sofa}` = `automatik | manuell_an | manuell_aus`.
- Zahlen (`input_number.nehemia_…`), Werte belegt durch die Daten vom 08.–11.10.:

| Helfer | Wert | Begründung |
|---|---|---|
| `helligkeit_normal` | 50 % | |
| `helligkeit_nebenlampe` | 10 % | |
| `helligkeit_bett` | 8 % | Helligkeit, wenn jemand im Bett liegt. Bei Bedarf höher stellen. |
| `nachlaufzeit_zonenwechsel` | 300 s | Deckt 81 % der Aussetzer in der Mitte und alle Schrank-Aussetzer ab. Mit 60 s ging das Licht aus, obwohl jemand da war. |
| `leerzeit_zimmer` | 120 s | Licht-Nachlauf nach Gesamt-Aus, letzte Zone Schrank/Gang/iPad/Mitte. Wunsch 12.10.: Bei offener Tür blieb das Licht bis 20 min an. |
| `leerzeit_sofa` | 600 s | Letzte Zone Sofa. Ausdrücklich gewählt, obwohl Sitzende bis 17 min verloren werden (3–4 Fehl-Aus in 3,6 Tagen). |
| `tuer_ruhezeit` | 300 s | Tür zu und so lange unbewegt = jemand ist drin → lange Leerzeit. |
| `leerzeit_lang` | 20 min | Dann HomePod-Stopp, Merker und Modi zurück. Bett-Merker, letzte Zone Bett oder Tür zu und ruhig: Licht erst nach dem Dreifachen (60 min), weil Liegende bis 48 min verloren werden. |
| `bettschutz_freigabezeit` | 60 s | |
| `bett_entprellung` | 45 s | |
| `bett_nachlauf` | 90 s | |
| `gute_nacht_zeit` | 20 min | Nicht kürzer: Sofa-Sitzende werden bis 17 min verloren. |

## Grundprinzipien

1. **Sollzustand statt Ereignislogik.** Jeder Lauf berechnet Basiswerte → Zonen/Bett → wach → `ziel_*` → Ersatzlampen (`ziel_s2`/`ziel_f2`) und schaltet nur, wenn Soll und Ist auseinanderliegen (Prozent; 0 = aus; −1 = so lassen). `mode: queued`.
2. **Halten statt Ausschalten.** Eine Lampe wird nicht ausgeschaltet, solange eine ihrer Zonen vor weniger als der Nachlaufzeit noch belegt war (`h_*`). Liegt jemand im Bett, wird beim Halten trotzdem auf die Bett-Helligkeit gedimmt.
3. **Niemand wach und niemand im Bett → nichts ausschalten.** Ausschalten übernimmt nur „Zimmer leer“. Das `for`-Template von `leer` wird beim Gesamt-Aus einmal gerendert und wählt die Wartezeit nach der letzten Zone (noch an, sonst jüngstes `last_changed` von _2–_8):
   - Merker an, Bettzone oder Tür zu und ruhig → `leerzeit_lang` ×3; Sofa → `leerzeit_sofa`; sonst `leerzeit_zimmer`.
   - `leer` schaltet **nur das Licht** aus. `leer_lang` (nach max(`leerzeit_lang`, Wartezeit)) stoppt den HomePod und setzt Merker und Modi zurück.
   - Jede Bewegung schaltet das Licht sofort wieder an. Eine offene Tür allein ist kein Beweis (80 % der Gesamt-Aus liefen bei offener Tür), daher keine Türbedingung.
4. **„Beide im Bett“ nur echt.** Gehen beide Merker innerhalb von 60 s an, ist es meist eine Person zwischen den Betten („Zwilling“, 17 von 72 Starts). Das zählt erst nach 10 min als „beide“, auch nach einem HA-Neustart.
5. **Geist / Nachtmodus.** Liegen beide sicher (Merker und Rohzonen, ein gehaltener Merker zählt als „liegt“), schaltet Bewegung nur das Orientierungslicht 1 %.
   - Steht jemand auf, fällt seine Bettzone ab, und das gedimmte Licht kommt.
   - Ist eine Rohbettzone frei, wird gehalten statt ausgeschaltet.
6. **Ersatzlampen.**
   - Fehlt eine Lampe länger als 60 s (ausgesteckt/offline), übernimmt die andere ihre Rolle.
   - Orientierung (`ziel_t` = 1) gibt das Fenster mit 1 %, ist es weg der Schrank. Bei `ziel_t` = 0 wird ein nur gehaltenes Licht ≤ 2 % wieder ausgeschaltet.
   - Eine Lampe im Modus `manuell_aus` wird nicht ersetzt.
7. **Sensor-Neuverbindung ist kein Ereignis.** `bett_rein_*`, `bett_raus_*`, `leer` und `leer_lang` haben `not_from: [unavailable, unknown]`. Am 12.10. um 05:33 waren alle Zonen 0,3 s weg, danach wurde Dans Merker fälschlich gelöscht.
8. **Kurze Neuberechnung.** `zone_aus_kurz` rechnet 30 s nach dem Ende einer Wachzone neu. So geht das 1-%-Orientierungslicht nach Fehl-Blips nach 30 s aus statt nach 5 min. Gehaltene Lampen bleiben, denn `h_*` hält die volle Nachlaufzeit.
9. **Türlicht nicht wieder einbauen.** Ein Matter-Aufruf hing bei halb erreichbarem Gerät 37 s und staute die ganze Automation (11.10. 00:45–00:48: 3,5 min).

## Verhalten (bei Dunkelheit)

| Situation | Schranklicht | Fensterlicht |
|---|---|---|
| Wach am Sofa | Nebenlampe (nur wenn an und nicht mehr im Nachlauf) | normal |
| Wach am Schrank | normal | Nebenlampe (dito) |
| Wach in Mitte / Gang / iPad | normal | normal |
| Einer im Bett + anderer am Schrank | Bett-Helligkeit | 1 % |
| Einer im Bett + anderer woanders wach | aus | Bett-Helligkeit |
| Einer im Bett, sonst keiner wach | hell → Bett-Helligkeit, gedimmt bleibt | dito |
| Beide im Bett (sicher), keiner wach | aus | aus |
| Beide im Bett, Bewegung (Geist) | aus | 1 %, 30 s nach der Bewegung aus |
| Merker fast gleichzeitig (Zwilling, < 10 min) | wie „einer im Bett“ | |
| Schranklicht ausgesteckt | – | übernimmt Schrank-Sollwert |
| Fensterlicht ausgesteckt/offline | übernimmt Fenster-Sollwert und 1 % | – |
| Gute-Nacht-Zeit ohne Wache und jemand im Bett | aus | aus |
| Zimmer leer (2 / 10 / 60 min je letzter Zone) | aus | aus |
| Lange leer (`leer_lang`) | + HomePod stopp, Modi und Merker zurücksetzen | |

- **Gute-Nacht** ist ein Template-Trigger mit `now()` und ohne `for`. Er feuert, wenn ein Merker an ist und `jemand_wach` aus ist, beides seit `gute_nacht_zeit`.
  - Nach einem HA-Neustart ist er wieder scharf.
  - Nach einem Neuladen ist er nur scharf, wenn das Template beim Laden falsch ist. Neue Versionen deshalb einspielen, wenn niemand im Bett liegt.
- Bettschutz: Nach dem Aufstehen gibt es noch etwa 2,5 min gedimmtes Licht (90 s Bett-Nachlauf + 60 s Freigabe).
- Tagsüber schaltet die Automation nichts. Ausnahmen: „Zimmer leer“ und Gute-Nacht.
- **Nachttisch-Taste 4** setzt `manuell_an` (Leselicht). Schaltet danach eine **Automation oder ein Skript** die Lampe aus (Taste 1, Fokus, Fenster), springt der Modus zurück auf `automatik`. Bei manuellem Ausschalten bleibt der Modus. Manuell heißt: Hue-App, Schalter oder HA-App, auch über die Gruppe `light.schlafzimmer`; am Lampenzustand ist dann `context.parent_id` leer.
- **Taste 1** schaltet nur aus, die Automatik bleibt aktiv.

## Bekannte Grenzen (Sensor, nicht Code)

- **Sofa-Sitzende** verliert der FP400 6–17 min komplett, Gesamt ist dann auch aus. Dagegen hilft nur die Empfindlichkeit in der Aqara-App.
- **Raum Mitte (Zone 8)** überlappt Schrank und Bett Dan. Blips können nachts gedimmtes Licht bringen, wenn nur einer als liegend erkannt ist. Das Polygon in der Aqara-App korrigieren.
- **Bett Gang** ragt in beide Betten (Zwillinge), auch das in der Aqara-App korrigieren.
- **Morgens:** Liegt einer noch im Bett und der andere ist wach, aber von keiner Zone erkannt, schaltet Gute-Nacht nach 20 min aus (z. B. 11.10. 08:36). Eine Tageszeit-Regel gibt es bisher nicht; nur auf Wunsch einbauen.

## Regeln für Änderungen

1. Keine zweite Automation für dieselben Lampen anlegen.
2. In einem `- variables:`-Schritt darf keine Variable eine andere aus demselben Schritt lesen (HA sortiert die Schlüssel). Abgeleitete Werte gehören in einen späteren Schritt.
3. Helligkeiten und Zeiten über die `input_number`-Helfer ändern. Feste Konstanten im Code sind nur der Zwillingsschutz (60 s / 600 s), die Hue-Karenz (60 s), `lampe_weg` (61 s) und `zone_aus_kurz` (30 s).
4. **Vor dem Einspielen** die `ziel_*`-Templates gegen die Szenario-Matrix testen. Es sind 31 Fälle, darunter die Nacht 10./11.10., dazu 12 Fälle für das `leer`-`for`-Template:

| Fall | Erwartung |
|---|---|
| 22:47:10 Zwilling | 8 % statt aus |
| 00:51:17 Aufstehen mit Merker-Nachlauf | halten |
| Geist | Fenster 1 % |
| Geist + Fenster offline | Schrank 1 % |
| Bewegung vorbei | 1 % weg |
| `leer`: Zone 7, Tür offen / Sofa / Tür zu und ruhig / Merker | 120 / 600 / 3600 / 3600 s |
| Schrank ausgesteckt | Fenster übernimmt |
| gehaltener Merker + Blip | nur 1 % |
| `manuell_aus` | kein Ersatz |

   Lokal mit `jinja2` (Modus-`is_state` durch Variablen ersetzt), Stichproben per `ha_eval_template`.
5. **Nach dem Einspielen:**
   - `run_actions` ausführen und im Trace prüfen, dass alle Variablen gesetzt sind.
   - Im System-Log dürfen keine „undefined“-Warnungen stehen.
   - Die Live-Config muss gleich der Repo-YAML sein.
6. Wird die Automation im HA-Editor gespeichert, schreibt HA Template-Bedingungen in die Langform (`condition: template`). Das ist gleichwertig zur Kurzform im Repo.
7. Repo-YAML immer mit `id: "1791637610981"` pflegen, damit ein Einspielen die bestehende Automation ersetzt und keine zweite anlegt.
8. Für Rückblicke das Logbuch mit `compact=false` nutzen (zeigt, welcher Trigger geschaltet hat; ohne Context = manuell) und die Traces (`stored_traces: 300`, reicht für etwa eine Nacht).
9. Backup der alten (gelöschten) Automationen: `backup_alte_automationen.json`.
