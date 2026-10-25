// Wecker-Display fuers iPhone SE am Nachttisch: ein Bildschirm, kein Scrollen.
// Uhr, naechster Wecker, je Person Weckzeit + An/Aus + Sa/So, waehrend des Weckens ein grosser Aus-Knopf.
const PERSONEN = [
  { id: "dan", name: "Dan" },
  { id: "caleb", name: "Caleb" },
];
const LAEUFT = ["script.wecker_sonnenaufgang", "script.wecker_ton"];
// Lampenleiste: nur das Wichtigste (Schrank, Fenster, Alles aus wie der Knopf am iPad)
const LICHT = [
  { k: "schrank", name: "Schrank", entity: "light.hue_white_lamp_1", icon: "bulb" },
  { k: "fenster", name: "Fenster", entity: "light.hue_white_lamp_2", icon: "bulb" },
  { k: "aus", name: "Alles aus", icon: "moon" },
];
const ICON = {
  bulb: '<path d="M9 21h6M10 18h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
};
const TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "M\u00e4r", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const pad = (n) => String(n).padStart(2, "0");

// Hintergrund wie das iPad-Dashboard (zuhause-nehemia): Wetterbild + Farbkugeln + Abdunkelung
const ORBS = "radial-gradient(circle closest-side,rgba(200,230,46,.22) 0,rgba(200,230,46,0) 100%) 5% 10%/70vmax 70vmax no-repeat," +
  "radial-gradient(circle closest-side,rgba(109,74,255,.5) 0,rgba(109,74,255,0) 100%) 85% 40%/75vmax 75vmax no-repeat," +
  "radial-gradient(circle closest-side,rgba(74,222,128,.32) 0,rgba(74,222,128,0) 100%) 95% 95%/60vmax 60vmax no-repeat," +
  "linear-gradient(rgba(12,12,14,.45),rgba(12,12,14,.45))";
const SCHNEE_NACHT = "https://raw.githubusercontent.com/danpede-coder/Kasse-nuseum-/838635e6a1253ff6a249f94c69ce100a123f7431/smarthome/dashboard/wetter/schnee_nacht.jpg";
const SCHLECHT = ["rainy", "pouring", "lightning", "lightning-rainy", "snowy", "snowy-rainy", "hail", "fog"];

class WeckerDisplay extends HTMLElement {
  setConfig(config) {
    this._config = { offset: 0, ...config };
  }

  getCardSize() {
    return 12;
  }

  connectedCallback() {
    this._build();
    this._tick = setInterval(() => this._update(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _build() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const personen = PERSONEN.map(
      (p) => `
      <div class="person" data-p="${p.id}">
        <div class="name">${p.name}</div>
        <label class="zeitbox"><span class="zeit"></span><input class="zeitin" type="time" step="300" aria-label="Weckzeit ${p.name}"></label>
        <div class="pillen">
          <button class="pille aktiv" aria-label="Wecker ${p.name} an/aus"></button>
          <button class="pille we" aria-label="${p.name} auch Sa/So">Sa/So</button>
        </div>
      </div>`
    ).join("");
    const licht = LICHT.map(
      (l) => `<button class="lk" data-k="${l.k}" aria-label="${l.name}">
        <svg viewBox="0 0 24 24">${ICON[l.icon]}</svg><span class="lt">${l.name}</span><span class="ls"></span></button>`
    ).join("");
    root.innerHTML = `
      <style>
        :host { display: block; position: relative; }
        .bg { position: fixed; inset: 0; background: #141416 center/cover no-repeat; transition: filter 1s; }
        .bg::after { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,0); transition: background 1s; }
        .wrap {
          --fg: #F5F5F7; --dim: rgba(255,255,255,.6); --acc: #FFC400; --off: rgba(255,255,255,.12);
          position: relative;
          box-sizing: border-box;
          height: calc(100dvh - ${Number(this._config?.offset) || 0}px);
          padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right))
                   max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
          color: var(--fg);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif;
          display: grid; grid-template-rows: 1fr auto; gap: 12px; overflow: hidden;
          -webkit-user-select: none; user-select: none;
        }
        .wrap.nacht { --fg: #d9a27a; --dim: rgba(217,162,122,.55); --acc: #d9783a; --off: rgba(217,162,122,.12); }
        :host(.nacht) .bg::after { background: rgba(0,0,0,.62); }
        .oben { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; }
        .uhr { text-shadow: 0 2px 18px rgba(0,0,0,.45); font-size: min(24vw, 30vh); font-weight: 200; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .datum, .naechster { text-shadow: 0 1px 8px rgba(0,0,0,.5); }
        .datum { margin-top: 6px; font-size: min(5vmin, 4.5vh); color: var(--dim); }
        .naechster { margin-top: 10px; font-size: min(5vmin, 4.5vh); color: var(--acc); text-align: center; }
        .stopp {
          display: none; margin-top: 14px; border: 0; border-radius: 999px; background: var(--acc); color: #000;
          font: inherit; font-size: min(9vmin, 8vh); font-weight: 600; padding: 0.35em 1.6em;
        }
        .wrap.weckt .stopp { display: block; }
        .wrap.weckt .datum, .wrap.weckt .naechster { display: none; }
        .licht { display: flex; gap: 8px; margin-top: min(4vh, 18px); width: 100%; max-width: 300px; justify-content: center; }
        .lk { flex: 1 1 0; min-width: 0; max-width: 68px; padding: 7px 0 6px; border-radius: 18px; border: 1px solid rgba(255,255,255,.18);
          background: rgba(18,18,22,.62); backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);
          color: var(--fg); font: inherit; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .lk svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
        .lt { font-size: 11px; font-weight: 600; }
        .ls { font-size: 10px; color: var(--dim); min-height: 12px; }
        .lk.an { background: var(--acc); color: #000; border-color: transparent; box-shadow: 0 0 18px rgba(255,196,0,.35); }
        .lk.an .ls { color: rgba(0,0,0,.6); }
        .lk.off { opacity: .4; }
        .unten { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
        .person { min-width: 0; background: rgba(18,18,22,.62); border: 1px solid rgba(255,255,255,.18); border-radius: 22px;
          backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 16px 32px rgba(0,0,0,.35); padding: 10px 10px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: opacity .3s; }
        .person.aus { opacity: .75; }
        .person.aus .zeit { color: rgba(255,255,255,.55); }
        .name { font-size: 16px; font-weight: 600; color: rgba(255,255,255,.85); }
        .wrap.nacht .name { color: var(--fg); }
        .zeitbox { position: relative; display: block; text-align: center; min-width: 0; overflow: hidden; }
        .zeit { text-shadow: 0 1px 6px rgba(0,0,0,.5); font-size: min(12vw, 10vh); font-weight: 400; font-variant-numeric: tabular-nums; line-height: 1.15; }
        /* natives Feld unsichtbar darueber: Tipp oeffnet das iOS-Drehrad, Anzeige bleibt 24 h */
        .zeitin { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; padding: 0; margin: 0; font-size: 16px; min-width: 0; max-width: 100%; box-sizing: border-box; }
        .pillen { display: flex; gap: 6px; }
        .pille { border: 0; border-radius: 999px; padding: 7px 12px; font: inherit; font-size: 14px; font-weight: 600; background: rgba(255,255,255,.16); color: rgba(255,255,255,.8); }
        .pille.an { background: var(--acc); color: #000; }
        /* Querformat: per config quer: true erzwungen, sonst automatisch bei Breite > Hoehe */
        .wrap.quer { grid-template-rows: none; grid-template-columns: 1.3fr 1fr; }
        .wrap.quer .unten { grid-template-columns: none; grid-template-rows: 1fr 1fr; }
        .wrap.quer .person { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "name pillen" "zeit pillen";
        align-items: center; row-gap: 0; padding: 8px 14px; }
        .wrap.quer .name { grid-area: name; }
        .wrap.quer .zeitbox { grid-area: zeit; text-align: left; }
        .wrap.quer .pillen { grid-area: pillen; }
        .wrap.quer .zeit { font-size: min(8vw, 13vh); }
        .wrap.quer .pillen { flex-direction: column; }
        .wrap.quer .uhr { font-size: min(17vw, 42vh); }
      </style>
      <div class="bg"></div>
      <div class="wrap" lang="de">
        <div class="oben">
          <div class="uhr"></div>
          <div class="datum"></div>
          <div class="naechster"></div>
          <button class="stopp">Aus</button>
          <div class="licht">${licht}</div>
        </div>
        <div class="unten">${personen}</div>
      </div>`;
    this._el = (s) => root.querySelector(s);
    this._el(".stopp").addEventListener("click", () => this._call("script", "turn_on", { entity_id: "script.wecker_stopp" }));
    root.querySelectorAll(".lk").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.k;
      if (k === "schrank") this._call("light", "toggle", { entity_id: "light.hue_white_lamp_1" });
      else if (k === "fenster") this._call("light", "toggle", { entity_id: "light.hue_white_lamp_2" });
      else this._call("script", "turn_on", { entity_id: "script.alles_aus" });
    }));
    root.querySelectorAll(".person").forEach((box) => {
      const p = box.dataset.p;
      box.querySelector(".zeitin").addEventListener("change", (e) => {
        if (e.target.value) this._call("input_datetime", "set_datetime", { entity_id: `input_datetime.wecker_${p}`, time: `${e.target.value}:00` });
      });
      box.querySelector(".aktiv").addEventListener("click", () => this._call("input_boolean", "toggle", { entity_id: `input_boolean.wecker_${p}_aktiv` }));
      box.querySelector(".we").addEventListener("click", () => this._call("input_boolean", "toggle", { entity_id: `input_boolean.wecker_${p}_wochenende` }));
    });
  }

  // gleiche Bildwahl wie der Stil der iPad-mod-card
  _hintergrund() {
    const st = this._hass.states;
    const w = this._on("input_boolean.wetter_vorschau_gewitter") ? "lightning-rainy"
      : this._on("input_boolean.wetter_vorschau_regen") ? "rainy"
      : this._on("input_boolean.wetter_vorschau_schnee") ? "snowy"
      : st["weather.forecast_home_2"]?.state;
    const sonne = st["sun.sun"];
    const n = sonne?.state === "below_horizon";
    const img = ["rainy", "pouring"].includes(w) ? "regen"
      : ["lightning", "lightning-rainy"].includes(w) ? "gewitter"
      : ["snowy", "snowy-rainy", "hail"].includes(w) ? "schnee"
      : w === "fog" ? "nebel" : n ? "nacht" : w === "sunny" ? "sonne" : "wolken";
    const e = Number(sonne?.attributes?.elevation ?? 90);
    let gl = "";
    if (e >= -5 && e <= 8 && !SCHLECHT.includes(w)) {
      gl = sonne?.attributes?.rising
        ? "linear-gradient(180deg,rgba(255,170,120,.32) 0%,rgba(255,200,150,.18) 45%,rgba(255,220,180,0) 80%),"
        : "linear-gradient(180deg,rgba(255,120,60,.42) 0%,rgba(255,90,90,.22) 45%,rgba(255,150,80,0) 85%),";
    }
    const extra = img === "schnee" && n ? `url('${SCHNEE_NACHT}') center/cover no-repeat,` : "";
    return `${ORBS},${gl}${extra}url('/local/wetter/${img}.jpg?v=5') center/cover no-repeat,` +
      `url('https://homeassistant.tail0809b0.ts.net/local/wetter/${img}.jpg?v=5') center/cover no-repeat,#141416`;
  }

  _call(domain, service, data) {
    if (this._hass) this._hass.callService(domain, service, data);
  }

  _on(id) {
    return this._hass?.states[id]?.state === "on";
  }

  // Naechster Weckzeitpunkt je Person (Date) oder null
  _naechster(p) {
    const st = this._hass?.states[`input_datetime.wecker_${p}`];
    if (!st || !this._on(`input_boolean.wecker_${p}_aktiv`)) return null;
    const [h, m] = st.state.split(":").map(Number);
    if (Number.isNaN(h)) return null;
    const we = this._on(`input_boolean.wecker_${p}_wochenende`);
    const jetzt = new Date();
    for (let d = 0; d < 8; d++) {
      const t = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + d, h, m);
      const tag = t.getDay();
      if (t > jetzt && (we || (tag >= 1 && tag <= 5))) return t;
    }
    return null;
  }

  _update() {
    if (!this.shadowRoot || !this._el) return;
    const jetzt = new Date();
    const stunde = jetzt.getHours();
    const wrap = this._el(".wrap");
    wrap.classList.toggle("nacht", stunde >= 21 || stunde < 6);
    wrap.classList.toggle("quer", this._config?.quer === true || (this._config?.quer !== false && innerWidth > innerHeight));
    this._el(".uhr").textContent = `${pad(stunde)}:${pad(jetzt.getMinutes())}`;
    this._el(".datum").textContent = `${TAGE[jetzt.getDay()]}, ${jetzt.getDate()}. ${MONATE[jetzt.getMonth()]}`;
    if (!this._hass) return;
    this.classList.toggle("nacht", stunde >= 21 || stunde < 6);
    const bg = this._hintergrund();
    if (bg !== this._bg) { this._bg = bg; this._el(".bg").style.background = bg; }
    wrap.classList.toggle("weckt", LAEUFT.some((id) => this._on(id)));

    for (const l of LICHT) {
      const b = this._el(`.lk[data-k="${l.k}"]`);
      if (!l.entity) { b.querySelector(".ls").textContent = ""; continue; }
      const st = this._hass.states[l.entity];
      const offline = !st || st.state === "unavailable" || st.state === "unknown";
      const pct = st?.state === "on" ? Math.round((st.attributes?.brightness ?? 255) / 2.55) : 0;
      const an = st?.state === "on";
      b.classList.toggle("an", !offline && an);
      b.classList.toggle("off", offline);
      b.querySelector(".ls").textContent = offline ? "offline" : an ? `${pct} %` : "aus";
    }

    let best = null;
    for (const p of PERSONEN) {
      const t = this._naechster(p.id);
      if (t && (!best || t < best.t)) best = { t, name: p.name };
      const box = this._el(`.person[data-p="${p.id}"]`);
      const aktiv = this._on(`input_boolean.wecker_${p.id}_aktiv`);
      box.classList.toggle("aus", !aktiv);
      const pille = box.querySelector(".aktiv");
      pille.classList.toggle("an", aktiv);
      pille.textContent = aktiv ? "An" : "Aus";
      box.querySelector(".we").classList.toggle("an", this._on(`input_boolean.wecker_${p.id}_wochenende`));
      const wert = (this._hass.states[`input_datetime.wecker_${p.id}`]?.state || "").slice(0, 5);
      box.querySelector(".zeit").textContent = wert || "--:--";
      const zeitin = box.querySelector(".zeitin");
      if (this.shadowRoot.activeElement !== zeitin && zeitin.value !== wert) zeitin.value = wert;
    }
    if (this._hass.states["automation.wecker_dan_caleb"]?.state === "off") {
      this._el(".naechster").textContent = "\u23f8 Wecker pausiert";
    } else if (best) {
      const min = Math.round((best.t - jetzt) / 60000);
      const rest = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
      const tag = best.t.getDate() === jetzt.getDate() ? "" : `${TAGE[best.t.getDay()]} `;
      this._el(".naechster").textContent = `\u23f0 ${best.name} ${tag}${pad(best.t.getHours())}:${pad(best.t.getMinutes())} \u00b7 in ${rest}`;
    } else {
      this._el(".naechster").textContent = "Kein Wecker aktiv";
    }
  }
}

if (!customElements.get("wecker-display")) customElements.define("wecker-display", WeckerDisplay);
window.customCards = window.customCards || [];
window.customCards.push({ type: "wecker-display", name: "Wecker-Display", description: "Nachttisch-Wecker f\u00fcr Dan & Caleb (ein Bildschirm)" });
