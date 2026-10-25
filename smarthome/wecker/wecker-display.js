// Wecker-Display fuers iPhone SE am Nachttisch: ein Bildschirm, kein Scrollen.
// Uhr, naechster Wecker, je Person Weckzeit + An/Aus + Sa/So, waehrend des Weckens ein grosser Aus-Knopf.
const PERSONEN = [
  { id: "dan", name: "Dan" },
  { id: "caleb", name: "Caleb" },
];
const LAEUFT = ["script.wecker_sonnenaufgang", "script.wecker_ton"];
const TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const pad = (n) => String(n).padStart(2, "0");

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
    root.innerHTML = `
      <style>
        :host { display: block; }
        .wrap {
          --bg: #0b0d12; --fg: #f2f4f8; --dim: #8a93a6; --acc: #ffb547; --card: #161a22; --off: #3a4150;
          box-sizing: border-box;
          height: calc(100dvh - ${Number(this._config?.offset) || 0}px);
          padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right))
                   max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
          background: var(--bg); color: var(--fg);
          font-family: -apple-system, "SF Pro Display", system-ui, sans-serif;
          display: grid; grid-template-rows: 1fr auto; gap: 12px; overflow: hidden;
          -webkit-user-select: none; user-select: none;
        }
        .wrap.nacht { --bg: #000; --fg: #c9875a; --dim: #6e4a33; --acc: #d9783a; --card: #120a06; --off: #2a1a10; }
        .oben { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; }
        .uhr { font-size: min(24vw, 30vh); font-weight: 200; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .datum { margin-top: 6px; font-size: min(5vmin, 4.5vh); color: var(--dim); }
        .naechster { margin-top: 10px; font-size: min(5vmin, 4.5vh); color: var(--acc); text-align: center; }
        .stopp {
          display: none; margin-top: 14px; border: 0; border-radius: 999px; background: var(--acc); color: #000;
          font: inherit; font-size: min(9vmin, 8vh); font-weight: 600; padding: 0.35em 1.6em;
        }
        .wrap.weckt .stopp { display: block; }
        .wrap.weckt .datum, .wrap.weckt .naechster { display: none; }
        .unten { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
        .person { min-width: 0; background: var(--card); border-radius: 18px; padding: 10px 10px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: opacity .3s; }
        .person.aus { opacity: .45; }
        .name { font-size: 15px; color: var(--dim); }
        .zeitbox { position: relative; display: block; text-align: center; min-width: 0; overflow: hidden; }
        .zeit { font-size: min(12vw, 10vh); font-weight: 300; font-variant-numeric: tabular-nums; line-height: 1.15; }
        /* natives Feld unsichtbar darueber: Tipp oeffnet das iOS-Drehrad, Anzeige bleibt 24 h */
        .zeitin { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; padding: 0; margin: 0; font-size: 16px; min-width: 0; max-width: 100%; box-sizing: border-box; }
        .pillen { display: flex; gap: 6px; }
        .pille { border: 0; border-radius: 999px; padding: 7px 12px; font: inherit; font-size: 14px; background: var(--off); color: var(--dim); }
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
      <div class="wrap" lang="de">
        <div class="oben">
          <div class="uhr"></div>
          <div class="datum"></div>
          <div class="naechster"></div>
          <button class="stopp">Aus</button>
        </div>
        <div class="unten">${personen}</div>
      </div>`;
    this._el = (s) => root.querySelector(s);
    this._el(".stopp").addEventListener("click", () => this._call("script", "turn_on", { entity_id: "script.wecker_stopp" }));
    root.querySelectorAll(".person").forEach((box) => {
      const p = box.dataset.p;
      box.querySelector(".zeitin").addEventListener("change", (e) => {
        if (e.target.value) this._call("input_datetime", "set_datetime", { entity_id: `input_datetime.wecker_${p}`, time: `${e.target.value}:00` });
      });
      box.querySelector(".aktiv").addEventListener("click", () => this._call("input_boolean", "toggle", { entity_id: `input_boolean.wecker_${p}_aktiv` }));
      box.querySelector(".we").addEventListener("click", () => this._call("input_boolean", "toggle", { entity_id: `input_boolean.wecker_${p}_wochenende` }));
    });
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
    wrap.classList.toggle("weckt", LAEUFT.some((id) => this._on(id)));

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
    if (best) {
      const min = Math.round((best.t - jetzt) / 60000);
      const rest = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
      const tag = best.t.getDate() === jetzt.getDate() ? "" : `${TAGE[best.t.getDay()]} `;
      this._el(".naechster").textContent = `⏰ ${best.name} ${tag}${pad(best.t.getHours())}:${pad(best.t.getMinutes())} · in ${rest}`;
    } else {
      this._el(".naechster").textContent = "Kein Wecker aktiv";
    }
  }
}

if (!customElements.get("wecker-display")) customElements.define("wecker-display", WeckerDisplay);
window.customCards = window.customCards || [];
window.customCards.push({ type: "wecker-display", name: "Wecker-Display", description: "Nachttisch-Wecker für Dan & Caleb (ein Bildschirm)" });
