# Wecker (Zimmer Nehemia)

Zwei getrennte Wecker (Dan, Caleb) mit Sonnenaufgang und sanftem Weckton.

| Baustein | Aufgabe |
|---|---|
| `input_datetime.wecker_dan` / `_caleb` | Weckzeit |
| `input_boolean.wecker_{dan,caleb}_aktiv` | Wecker an/aus |
| `input_boolean.wecker_{dan,caleb}_wochenende` | auch Sa/So |
| `automation.wecker_dan_caleb` | 20 min vorher Sonnenaufgang (nur wenn beide Lampen nicht an sind), zur Weckzeit Ton |
| `script.wecker_sonnenaufgang` | Fensterlicht 1→100 % in 20 Schritten (quadratisch), Schranklicht ab Minute 10; setzt beide Lampen auf `manuell_an` |
| `script.wecker_ton` | `wecker_sanft.mp3` per AirPlay auf `media_player.nehemia_homepod`, Lautstärke parallel von `lautstaerke_start` (0.12) bis `lautstaerke_max` (0.42) |
| `script.wecker_stopp` | beendet Sonnenaufgang und Ton, setzt `input_boolean.wecker_gestoppt` (kein Nachwecken heute), Licht bleibt |
| Dashboard `wecker-nehemia` | Panel-View mit `custom:wecker-display` + `quer: true` (Querformat fest; ein Bildschirm, kein Scrollen, Hoch-/Querformat, Nachtmodus 21–6 Uhr). Inline-Ressource `4d4338a04d144089aa9ae50bf3492764`, Code `wecker-display.js`, Vorschau `vorschau.png` |

- Ton: `ton.py` erzeugt `wecker.wav`, daraus MP3 **stereo, ohne ID3/Xing** (`ffmpeg -ac 2 -id3v2_version 0 -write_xing 0 -map_metadata -1`), sonst meldet pyatv „failed to init decoder“. Eingebunden per Raw-URL mit Commit-SHA.
- `play_media` blockiert, solange der Stream läuft – darum läuft die Lautstärke-Rampe parallel.
- **Nachwecken:** Weckzeit +5 min und +10 min: liegt die Person noch im Bett (`input_boolean.nehemia_bett_<p>` oder Bettzone Dan `…_belegung_5` / Caleb `…_belegung_4`) und `wecker_gestoppt` ist aus, kommt der Ton erneut mit 25→50 % bzw. 30→55 % (bewusst gedeckelt, der andere schläft evtl. noch). Der normale Ton-Trigger setzt `wecker_gestoppt` zurück.
- Beide Wecker teilen sich das Licht (ein Zimmer); läuft der Sonnenaufgang schon, ignoriert der zweite Start ihn (`mode: single`).

## iPhone SE als Nachttisch-Display
1. HA-App installieren, anmelden, Dashboard „Wecker“ öffnen.
2. App → Einstellungen → Kiosk-Modus an, Startseite `/wecker-nehemia/wecker`.
3. iOS: Display → Automatische Sperre „Nie“, Ladegerät dran.

## wecker-display
- Uhr + nächster Wecker; läuft Sonnenaufgang/Ton, ersetzt ein großer „Aus“-Knopf (`script.wecker_stopp`) Datum und nächsten Wecker.
- Weckzeit: eigene 24-h-Anzeige, darüber ein unsichtbares `<input type="time">` (öffnet das iOS-Drehrad) → `input_datetime.set_datetime`.
- Nach Code-Änderung: Ressource mit `ha_config_set_dashboard_resource(content=…, resource_id=4d4338a0…)` neu speichern, App auf dem SE neu laden.
