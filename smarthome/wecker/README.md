# Wecker (Zimmer Nehemia)

Zwei getrennte Wecker (Dan, Caleb) mit Sonnenaufgang und sanftem Weckton.

| Baustein | Aufgabe |
|---|---|
| `input_datetime.wecker_dan` / `_caleb` | Weckzeit |
| `input_boolean.wecker_{dan,caleb}_aktiv` | Wecker an/aus |
| `input_boolean.wecker_{dan,caleb}_wochenende` | auch Sa/So |
| `automation.wecker_dan_caleb` | 20 min vorher Sonnenaufgang (nur wenn beide Lampen nicht an sind), zur Weckzeit Ton |
| `script.wecker_sonnenaufgang` | Fensterlicht 1→100 % in 20 Schritten (quadratisch), Schranklicht ab Minute 10; setzt beide Lampen auf `manuell_an` |
| `script.wecker_ton` | `wecker_sanft.mp3` per AirPlay auf `media_player.nehemia_homepod`, Lautstärke parallel 12 → 42 % |
| `script.wecker_stopp` | beendet Sonnenaufgang und Ton, Licht bleibt |
| Dashboard `wecker-nehemia` | Uhr, „Wecker aus“, Zeiten und Schalter je Person (fürs iPhone SE) |

- Ton: `ton.py` erzeugt `wecker.wav`, daraus MP3 **stereo, ohne ID3/Xing** (`ffmpeg -ac 2 -id3v2_version 0 -write_xing 0 -map_metadata -1`), sonst meldet pyatv „failed to init decoder“. Eingebunden per Raw-URL mit Commit-SHA.
- `play_media` blockiert, solange der Stream läuft – darum läuft die Lautstärke-Rampe parallel.
- Beide Wecker teilen sich das Licht (ein Zimmer); läuft der Sonnenaufgang schon, ignoriert der zweite Start ihn (`mode: single`).

## iPhone SE als Nachttisch-Display
1. HA-App installieren, anmelden, Dashboard „Wecker“ öffnen.
2. App → Einstellungen → Kiosk-Modus an, Startseite `/wecker-nehemia/wecker`.
3. iOS: Display → Automatische Sperre „Nie“, Ladegerät dran.
