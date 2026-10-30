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
| Zimmertür | `binary_sensor.myggbett_door_window_sensor_tur_2` | „Lange leer“ (zu und ruhig = 60 min) und Beleg für Aufstehen |

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
- Dunkel: `input_boolean.nehemia_dunkel_gespeicherter_status`, gesetzt von „Nehemia Dunkelstatus aktualisieren“ (`nehemia_dunkelstatus.yaml`, seit 17.10.: Lux + Sonnenstand + Regen):
  - **Sonne hell:** `sun.sun` elevation über `sonne_hell_hoehe` (5°). Ausnahme Regen-Abend: `weather.forecast_home_2` meldet Regen/Schnee/Hagel, die Sonne sinkt (`rising` false) und steht unter `sonne_regen_hoehe` (10°).
  - **Dunkel (an):** Lux unter `lux_dunkel_schwelle` (20) **und** (Sonne nicht hell **oder** Lux unter `lux_rollo_schwelle` (4) = Rollladen unten, von Hand, nicht in HA).
  - **Hell (aus):** Lux über `lux_hell_schwelle` (60) **oder** (Sonne hell **und** Lux über 4).
  - Dazwischen bleibt der Wert (Hysterese). Die 4-lx-Trigger sind entprellt (dunkel 1 min, hell 2 min).
  - Grund: Der FP400 misst sehr wenig. An trüben Morgen zeigte er bei 5–9° nur 6–12 lx, mit Lux allein wurde es erst 1,5–3,8 h nach Sonnenaufgang „hell“. Dadurch ging das Licht am 15.–17.10. tagsüber an. Lampen erhöhen den Lux-Wert nicht.
- Modi je Lampe: `input_select.nehemia_modus_{schrank,sofa}` = `automatik | manuell_an | manuell_aus`.
- Zahlen (`input_number.nehemia_…`), Werte belegt durch die Daten vom 08.–11.10.:

| Helfer | Wert | Begründung |
|---|---|---|
| `helligkeit_normal` | 50 % | |
| `helligkeit_nebenlampe` | 10 % | |
| `helligkeit_bett` | 8 % | Helligkeit, wenn jemand im Bett liegt. Bei Bedarf höher stellen. |
| `nachlaufzeit_zonenwechsel` | 300 s | Deckt 81 % der Aussetzer in der Mitte und alle Schrank-Aussetzer ab. Mit 60 s ging das Licht aus, obwohl jemand da war. |
| `leerzeit_zimmer` | 120 s | Licht-Nachlauf nach Gesamt-Aus, **immer** (Wunsch 15.10.: „überall 2 min“). Risiko gewählt: Sofa-Sitzende und Liegende, die das Radar verliert, sitzen bis zur nächsten Bewegung im Dunkeln (13.–15.10. wären es 2 Fälle gewesen). |
| `leerzeit_sofa` | 600 s | Nur noch für `leer_lang` (letzte Zone Sofa). |
| `tuer_ruhezeit` | 300 s | Nur noch für `leer_lang`: Tür zu und so lange unbewegt = jemand ist drin → 60 min. |
| `leerzeit_lang` | 20 min | Dann HomePod-Stopp, Merker und Modi zurück. Bett-Merker, letzte Zone Bett oder Tür zu und ruhig: erst nach dem Dreifachen (60 min), weil Liegende bis 48 min verloren werden. |
| `bettschutz_freigabezeit` | 60 s | |
| `bett_entprellung` | 45 s | |
| `bett_nachlauf` | 90 s | |
| `gute_nacht_zeit` | 12 min | Auf Wunsch 28.10. von 20 verkürzt. Risiko: Sofa-Sitzende werden bis 17 min verloren und können dann im Dunkeln sitzen, wenn der andere im Bett liegt. |
| `lux_dunkel_schwelle` / `lux_hell_schwelle` | 20 / 60 lx | Reine Lux-Grenzen (Hysterese). |
| `lux_rollo_schwelle` | 4 lx | Darunter gilt der Rollladen als unten (Tag mit Rollladen unten ≈ 1 lx, offen trüb ≥ 6 lx). |
| `sonne_hell_hoehe` | 5° | Ab hier zählt die Sonne als hell (≈ 40 min nach Sonnenaufgang). Abends wird es bei 3–4° dunkel. |
| `sonne_regen_hoehe` | 10° | Bei Regen am Abend gilt die Sonne schon unter 10° nicht mehr als hell. |

## Grundprinzipien

1. **Sollzustand statt Ereignislogik.** Jeder Lauf berechnet Basiswerte → Zonen/Bett → wach → `alles_aus` → `ziel_*` → Ersatzlampen (`ziel_s2`/`ziel_f2`) und schaltet nur, wenn Soll und Ist auseinanderliegen (Prozent; 0 = aus; −1 = so lassen). `mode: queued`.
2. **Halten statt Ausschalten.** Eine Lampe wird nicht ausgeschaltet, solange eine ihrer Zonen vor weniger als der Nachlaufzeit noch belegt war (`h_*`). Liegt jemand im Bett, wird beim Halten trotzdem auf die Bett-Helligkeit gedimmt.
3. **Niemand wach und niemand im Bett → nichts ausschalten.** Ausschalten übernimmt nur „Zimmer leer“:
   - `leer` schaltet **nur das Licht** aus, immer `leerzeit_zimmer` (2 min) nach Gesamt-Aus (seit 15.10., Wunsch des Nutzers).
   - `leer_lang` stoppt den HomePod und setzt Merker und Modi zurück. Sein `for`-Template wird beim Gesamt-Aus einmal gerendert und wählt die Wartezeit nach der letzten Zone (noch an, sonst jüngstes `last_changed` von _2–_8): Merker an, Bettzone oder Tür zu und ruhig → `leerzeit_lang` ×3; sonst max(`leerzeit_lang`, `leerzeit_sofa` bzw. `leerzeit_zimmer`).
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
10. **Hue-Gruppe als Fallback.** HA verwirft Befehle an Lampen, die gerade `unavailable` sind (Hue-Zigbee-Aussetzer; am 13.10. 249 Zustandswechsel in 13 h, das Fensterlicht blieb 08:08–11:19 an). Die Hue-Raumgruppe `light.schlafzimmer` bleibt erreichbar und schaltet per Groupcast.
   - Schritt `&gruppe_aus`: Gruppe aus (ohne Transition), wenn eine Lampe `unavailable`/`unknown` ist und jede Lampe `automatik` oder aus ist. Er steht immer nach den Einzelbefehlen.
   - Er läuft in `leer`, in `leer_lang` (nach dem Modus-Reset) und als Schritt 4 bei `alles_aus` (Gute Nacht oder beide liegen sicher) mit `ziel_s2` = `ziel_f2` = 0. Schritt 4 sendet nur, solange die Bridge die Gruppe als an meldet; der Gute-Nacht-Trigger sendet immer.
   - Nicht bei „einer im Bett“: Dort ist ziel 0 einer fehlenden Lampe nur geraten (`s_an`/`f_an` falsch), sie kann gewollt gedimmt brennen. Deshalb steht die Bedingung als `alles_aus` in einem eigenen Schritt, den `ziel_s`/`ziel_f` und Schritt 4 lesen.
   - `light.schlafzimmer` darf nur Lampe 1 und 2 enthalten (Hue-App, Raum „Schlafzimmer“). Vor Änderungen am Hue-Raum prüfen, sonst schaltet die Automation fremde Lampen aus.

## Verhalten (bei Dunkelheit)

| Situation | Schranklicht | Fensterlicht |
|---|---|---|
| Wach am Sofa | normal (seit 15.10., Wunsch: beide 50 %) | normal |
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
| Zimmer leer (2 min nach Gesamt-Aus) | aus | aus |
| Lange leer (`leer_lang`) | + HomePod stopp, Modi und Merker zurücksetzen | |
| Lampe unerreichbar (Hue-Aussetzer) bei leer, lange leer, Gute-Nacht, beide sicher | über `light.schlafzimmer` aus | dito |

- **Gute-Nacht** ist ein Template-Trigger mit `now()` und ohne `for`. Er feuert, wenn ein Merker an ist und `jemand_wach` aus ist, beides seit `gute_nacht_zeit`.
  - Nach einem HA-Neustart ist er wieder scharf.
  - Nach einem Neuladen ist er nur scharf, wenn das Template beim Laden falsch ist. Neue Versionen deshalb einspielen, wenn niemand im Bett liegt.
- Bettschutz: Nach dem Aufstehen gibt es noch etwa 2,5 min gedimmtes Licht (90 s Bett-Nachlauf + 60 s Freigabe).
- Tagsüber schaltet die Automation nichts. Ausnahmen: „Zimmer leer“ und Gute-Nacht.
- **Manuell einschalten** (Siri/HomeKit direkt an der Hue-Bridge, Hue-App, Schalter, HA-App; `context.parent_id` leer) setzt per `automation.licht_manuell_an_erkannt_siri_hue_app` den Modus der Lampe auf `manuell_an` (nur `off` → `on`, nicht aus `unavailable`; Dimmen einer brennenden Lampe zählt ab 25/255, außer als Hue-Nachmeldung < 10 s nach einem Automations-Befehl). Code: `nehemia_licht_manuell.yaml`.
- **Nachttisch-Taste 4** setzt `manuell_an` (Leselicht). Schaltet danach eine **Automation oder ein Skript** die Lampe aus (Taste 1, Fokus, Fenster), springt der Modus zurück auf `automatik`. Bei manuellem Ausschalten bleibt der Modus. Manuell heißt: Hue-App, Schalter oder HA-App, auch über die Gruppe `light.schlafzimmer`; am Lampenzustand ist dann `context.parent_id` leer. Die Automation nutzt die Gruppe nur als Fallback und nie, solange eine Lampe mit `manuell_*` brennt.
- **Taste 1** schaltet nur aus, die Automatik bleibt aktiv. Die Skripte `alles_aus` und `alles_aus_ausser_musik` schalten seit 13.10. neben `light.gesamtes_licht` auch `light.schlafzimmer` aus (Hue-Gruppe, wirkt auch bei unerreichbaren Lampen).

## Bekannte Grenzen (Sensor, nicht Code)

- **Sofa-Sitzende** verliert der FP400 6–17 min komplett, Gesamt ist dann auch aus. Seit „überall 2 min“ geht das Licht dann nach 2 min aus und bei der nächsten Bewegung wieder an. Dagegen hilft nur die Empfindlichkeit in der Aqara-App.
- **Raum Mitte (Zone 8)** überlappt Schrank und Bett Dan. Blips können nachts gedimmtes Licht bringen, wenn nur einer als liegend erkannt ist. Das Polygon in der Aqara-App korrigieren.
- **Bett Gang** ragt in beide Betten (Zwillinge), auch das in der Aqara-App korrigieren.
- **Morgens:** Liegt einer noch im Bett und der andere ist wach, aber von keiner Zone erkannt, schaltet Gute-Nacht nach 12 min aus (z. B. 11.10. 08:36). Eine Tageszeit-Regel gibt es bisher nicht; nur auf Wunsch einbauen. Eine dabei unerreichbare Lampe geht seit V6 über die Hue-Gruppe mit aus; eine Regel in der Variable `gute_nacht` gilt auch für den Fallback.
- **Hue-Funk:** Seit 12.10. melden beide Lampen an der Bridge `zigbee_connectivity: connectivity_issue`. Die Bridge funkt auf Zigbee-Kanal 25, im Zimmer stehen zwei Apple-Thread-Border-Router (Apple TV, HomePod), dazu FP400 und Türlicht (Matter). Abhilfe: Zigbee-Kanal in der Hue-App auf 15 oder 20, 2,4-GHz-WLAN fest auf Kanal 1, Einschaltverhalten der Lampen „Letzter Zustand“ (steht auf `safety` = 100 % nach Stromausfall).
- **Hue-Aussetzer (Gruppen-Fallback):**
  - Noch nicht bestätigt: ob der Groupcast eine Lampe mit `connectivity_issue` wirklich erreicht.
  - Die Bridge setzt die Lampen nach dem Gruppen-Aus sofort auf aus (13.10. 11:19). Geht der Groupcast verloren und meldet die Bridge beim Wiederverbinden nicht den echten Zustand, steht die Lampe in HA auf aus und brennt. Kein Trigger reagiert auf aus → an, Schritt 4 sendet bei Gruppe aus nicht erneut; nur `leer_lang` fängt das.
  - Kein zweiter Versuch: Gute-Nacht feuert einmal, `leer` nach 2 min auch. Mögliche Erweiterung: bei `lampe_zurueck` im lange leeren Zimmer eine eingeschaltet zurückkehrende Lampe ausschalten.
  - Brennt bei `leer` eine Lampe mit `manuell_*`, gibt es dort keinen Groupcast; `leer_lang` holt ihn nach dem Modus-Reset nach. Eine ausgesteckte Lampe mit `manuell_aus` blockiert Schritt 4 (Zustand unbekannt).

## Regeln für Änderungen

1. Keine zweite Automation für dieselben Lampen anlegen.
2. In einem `- variables:`-Schritt darf keine Variable eine andere aus demselben Schritt lesen (HA sortiert die Schlüssel). Abgeleitete Werte gehören in einen späteren Schritt.
3. Helligkeiten und Zeiten über die `input_number`-Helfer ändern. Feste Konstanten im Code sind nur der Zwillingsschutz (60 s / 600 s), die Hue-Karenz (60 s), `lampe_weg` (61 s) und `zone_aus_kurz` (30 s).
4. **Vor dem Einspielen** die `ziel_*`-Templates gegen die Szenario-Matrix testen. Es sind 31 Fälle, darunter die Nacht 10./11.10., dazu 12 Fälle für das `leer_lang`-`for`-Template und 26 für den Gruppen-Fallback:

| Fall | Erwartung |
|---|---|
| 22:47:10 Zwilling | 8 % statt aus |
| 00:51:17 Aufstehen mit Merker-Nachlauf | halten |
| Geist | Fenster 1 % |
| Geist + Fenster offline | Schrank 1 % |
| Bewegung vorbei | 1 % weg |
| `leer`: jede Lage | 120 s |
| `leer_lang`: Zone 7, Tür offen / Sofa / Tür zu und ruhig / Merker | 1200 / 1200 / 3600 / 3600 s |
| Schrank ausgesteckt | Fenster übernimmt |
| gehaltener Merker + Blip | nur 1 % |
| `manuell_aus` | kein Ersatz |
| Gruppe: `leer`, Fenster unavailable | Gruppen-Aus |
| Gruppe: `leer`, Fenster unavailable + Sofa `manuell_an` | kein Gruppen-Aus (erst `leer_lang`) |
| Gruppe: Gute-Nacht, Fenster unavailable, Gruppe in HA aus | Gruppen-Aus |
| Gruppe: Geist, Schrank unavailable | Fenster 1 %, kein Gruppen-Aus |
| Gruppe: einer liegt, keiner wach, beide Lampen unavailable | kein Gruppen-Aus |
| Gruppe: beide sicher, Fenster unavailable, Gruppe aus | kein erneutes Senden |
| Schritt 4 feuert | jede erreichbare Belegung der fehlenden Lampe hat Ziel 0 |

   Lokal mit `jinja2` (Modus-`is_state` durch Variablen ersetzt), Stichproben per `ha_eval_template`.
5. **Nach dem Einspielen:**
   - `run_actions` ausführen und im Trace prüfen, dass alle Variablen gesetzt sind.
   - Im System-Log dürfen keine „undefined“-Warnungen stehen.
   - Die Live-Config muss gleich der Repo-YAML sein.
   - Nach dem nächsten Hue-Aussetzer im Logbuch prüfen: Ging die Lampe beim Gruppen-Aus wirklich aus, und meldet HA sie nach dem Wiederverbinden mit dem echten Zustand?
6. Wird die Automation im HA-Editor gespeichert, schreibt HA Template-Bedingungen in die Langform (`condition: template`). Das ist gleichwertig zur Kurzform im Repo.
7. Repo-YAML immer mit `id: "1791637610981"` pflegen, damit ein Einspielen die bestehende Automation ersetzt und keine zweite anlegt.
8. Für Rückblicke das Logbuch mit `compact=false` nutzen (zeigt, welcher Trigger geschaltet hat; ohne Context = manuell; ein Aus über die Hue-Gruppe steht an der Lampe ohne `parent_id`, den Context trägt `light.schlafzimmer`) und die Traces (`stored_traces: 300`, reicht für etwa eine Nacht).
9. Backup der alten (gelöschten) Automationen: `backup_alte_automationen.json`.

## Putzmodus (30.10.)
- `input_boolean.nehemia_putzmodus` (Siri ueber HomeKit-Bridge „HASS Bridge OV“, iPad-Kachel „Putzmodus“ unter „Pflanzen gegossen“ (rechte Spalte, Dashboard `zuhause-nehemia`)).
- Automation `nehemia_putzmodus.yaml`: an → beide Modi `manuell_an` + 100 %; aus → Modi `automatik` (Lichtsteuerung rechnet neu); nach 2 h automatisch aus; nach Hue-Aussetzer wird nachgezogen.
