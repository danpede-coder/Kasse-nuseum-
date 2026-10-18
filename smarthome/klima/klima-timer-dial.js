class KlimaTimerDial extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
    this._drag = false;
    this._dragMin = null;
    this._int = null;
    this._modeSig = null;
  }
  setConfig(cfg) {
    this._cfg = Object.assign({
      timer: "timer.klima_timer",
      hours: "input_number.klima_timer_st",
      minutes: "input_number.klima_timer_min",
      start_script: "script.klima_timer_start",
      stop_script: "script.klima_timer_stop",
      max_minutes: 360,
      step: 5,
      color: "#68E7FF",
      name: "Klima Timer",
      compact: false,
      size: 0,
      mode_entity: null,
      mode_colors: { "Heizen": "#FF453A", "Kühlen": "#0A84FF" },
      mode_icons: { "Heizen": "mdi:fire", "Kühlen": "mdi:snowflake" }
    }, cfg || {});
    // card-mod sucht die Kartenkonfiguration unter _config
    this._config = this._cfg;
  }
  disconnectedCallback() { this._stopTick(); }
  set hass(h) {
    this._hass = h;
    if (!this._built) this._build();
    this._update();
  }
  _st(id) { return this._hass && this._hass.states[id]; }
  _setMinutes() {
    const hs = parseFloat((this._st(this._cfg.hours) || {}).state) || 0;
    const ms = parseFloat((this._st(this._cfg.minutes) || {}).state) || 0;
    return Math.round(hs) * 60 + Math.round(ms);
  }
  _build() {
    const k = !!this._cfg.compact;
    const size = this._cfg.size > 0 ? this._cfg.size : (k ? 160 : 260);
    this.shadowRoot.innerHTML = `
      <ha-card id="card">
        <style>
          ha-card{padding:${k ? "12px 12px 14px" : "16px 16px 20px"};color:#F5F7FA;}
          .top{font-size:${k ? "13px" : "15px"};font-weight:600;letter-spacing:.3px;display:flex;align-items:center;gap:7px;}
          .wrap{position:relative;width:min(${k ? "64vw" : "78vw"},${size}px);margin:${k ? "8px" : "10px"} auto 0;touch-action:none;-webkit-user-select:none;user-select:none;}
          svg{display:block;width:100%;height:auto;}
          .arc{stroke:var(--c);filter:drop-shadow(0 0 8px var(--c));transition:stroke-dashoffset .12s linear,stroke .25s;}
          .knob{filter:drop-shadow(0 0 6px var(--c));}
          .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${k ? "2px" : "4px"};pointer-events:none;}
          .time{font-size:${k ? "19px" : "32px"};font-weight:700;font-variant-numeric:tabular-nums;}
          .sub{font-size:11px;color:#AAB2BD;${k ? "display:none;" : ""}}
          #btn{pointer-events:auto;margin-top:${k ? "2px" : "6px"};border:1px solid var(--cb);background:var(--cf);color:#F5F7FA;font-size:${k ? "12px" : "14px"};font-weight:600;padding:${k ? "5px 16px" : "8px 24px"};border-radius:999px;cursor:pointer;}
          #btn.stop{border-color:#FF647499;background:#FF647429;}
          #btn:disabled{opacity:.35;}
          .modes{margin-left:auto;display:flex;gap:6px;}
          .pill{display:flex;align-items:center;gap:4px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#AAB2BD;font:inherit;font-size:${k ? "11px" : "12px"};font-weight:600;padding:${k ? "3px 8px" : "4px 10px"};border-radius:999px;cursor:pointer;transition:background .2s,border-color .2s,color .2s;}
          .pill ha-icon{--mdc-icon-size:${k ? "13px" : "15px"};}
          .pill.on{color:#F5F7FA;border-color:var(--pb);background:var(--pf);}
          .pill.on ha-icon{color:var(--pc);}
          .pill:disabled{cursor:default;opacity:.45;}
          .pill.on:disabled{opacity:.8;}
          .ticks line{stroke:rgba(255,255,255,.16);stroke-width:2;stroke-linecap:round;}
        </style>
        <div class="top"><ha-icon icon="mdi:timer-outline" style="--mdc-icon-size:${k ? "16px" : "20px"};color:var(--c);"></ha-icon><span id="nm"></span><div class="modes" id="modes"></div></div>
        <div class="wrap" id="wrap">
          <svg viewBox="0 0 200 200">
            <g class="ticks" id="ticks"></g>
            <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="10"/>
            <circle id="arc" class="arc" cx="100" cy="100" r="84" fill="none" stroke-width="10" stroke-linecap="round" transform="rotate(-90 100 100)"/>
            <circle id="knob" class="knob" r="9" fill="#fff"/>
          </svg>
          <div class="center">
            <div class="time" id="time"></div>
            <div class="sub" id="sub"></div>
            <button id="btn"></button>
          </div>
        </div>
      </ha-card>`;
    let t = "";
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 - Math.PI / 2;
      t += `<line x1="${100 + 71 * Math.cos(a)}" y1="${100 + 71 * Math.sin(a)}" x2="${100 + 65 * Math.cos(a)}" y2="${100 + 65 * Math.sin(a)}"/>`;
    }
    this.shadowRoot.getElementById("ticks").innerHTML = t;
    this._C = 2 * Math.PI * 84;
    this.shadowRoot.getElementById("arc").setAttribute("stroke-dasharray", this._C);
    const wrap = this.shadowRoot.getElementById("wrap");
    wrap.addEventListener("pointerdown", (e) => this._pd(e));
    wrap.addEventListener("pointermove", (e) => this._pm(e));
    wrap.addEventListener("pointerup", (e) => this._pu(e));
    wrap.addEventListener("pointercancel", (e) => this._pu(e));
    this.shadowRoot.getElementById("btn").addEventListener("click", () => this._btn());
    this._built = true;
  }
  _angleToMin(e) {
    const r = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    let f = (Math.atan2(dy, dx) + Math.PI / 2) / (2 * Math.PI);
    f = (f + 1) % 1;
    let m = Math.round(f * this._cfg.max_minutes / this._cfg.step) * this._cfg.step;
    if (m > this._cfg.max_minutes) m = this._cfg.max_minutes;
    return m;
  }
  _active() {
    const s = this._st(this._cfg.timer);
    return s && (s.state === "active" || s.state === "paused");
  }
  _pd(e) {
    if (this._active()) return;
    this._drag = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    this._dragMin = this._angleToMin(e);
    this._update();
  }
  _pm(e) {
    if (!this._drag) return;
    this._dragMin = this._angleToMin(e);
    this._update();
  }
  _pu(e) {
    if (!this._drag) return;
    this._drag = false;
    const m = this._dragMin;
    this._dragMin = null;
    if (m == null || !this._hass) return;
    this._hass.callService("input_number", "set_value", { entity_id: this._cfg.hours, value: Math.floor(m / 60) });
    this._hass.callService("input_number", "set_value", { entity_id: this._cfg.minutes, value: m % 60 });
  }
  _btn() {
    if (!this._hass) return;
    const target = this._active() ? this._cfg.stop_script : this._cfg.start_script;
    this._hass.callService("script", "turn_on", { entity_id: target });
  }
  _pick(opt) {
    if (!this._hass || this._active() || !this._cfg.mode_entity) return;
    this._hass.callService("input_select", "select_option", { entity_id: this._cfg.mode_entity, option: opt });
  }
  // Hex-Farbe mit Alpha (#RRGGBB + AA); andere Formate bleiben unveraendert
  _alpha(c, a) { return /^#[0-9a-f]{6}$/i.test(c) ? c + a : c; }
  _modes(active) {
    const box = this.shadowRoot.getElementById("modes");
    const ms = this._cfg.mode_entity ? this._st(this._cfg.mode_entity) : null;
    if (!ms) {
      if (this._modeSig !== "") { box.innerHTML = ""; this._modeSig = ""; }
      return null;
    }
    const opts = (ms.attributes && ms.attributes.options) || [];
    const sig = opts.join("|");
    if (sig !== this._modeSig) {
      box.innerHTML = "";
      for (const o of opts) {
        const b = document.createElement("button");
        b.className = "pill";
        b.dataset.opt = o;
        const icon = this._cfg.mode_icons[o];
        if (icon) {
          const i = document.createElement("ha-icon");
          i.setAttribute("icon", icon);
          b.appendChild(i);
        }
        b.appendChild(document.createTextNode(o));
        b.addEventListener("click", () => this._pick(o));
        box.appendChild(b);
      }
      this._modeSig = sig;
    }
    for (const b of box.children) {
      const o = b.dataset.opt;
      const pc = this._cfg.mode_colors[o] || this._cfg.color;
      b.classList.toggle("on", o === ms.state);
      b.disabled = !!active;
      b.style.setProperty("--pc", pc);
      b.style.setProperty("--pb", this._alpha(pc, "99"));
      b.style.setProperty("--pf", this._alpha(pc, "33"));
    }
    return this._cfg.mode_colors[ms.state] || null;
  }
  _parseDur(d) {
    if (!d) return 0;
    const p = String(d).split(":").map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return Number(d) || 0;
  }
  _remaining(st) {
    if (st.state === "active" && st.attributes.finishes_at) {
      return Math.max(0, (new Date(st.attributes.finishes_at).getTime() - Date.now()) / 1000);
    }
    return this._parseDur(st.attributes.remaining);
  }
  _fmt(s) {
    s = Math.round(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (n) => String(n).padStart(2, "0");
    return h > 0 ? h + ":" + p(m) + ":" + p(sec) : m + ":" + p(sec);
  }
  _startTick() { if (!this._int) this._int = setInterval(() => this._update(), 1000); }
  _stopTick() { if (this._int) { clearInterval(this._int); this._int = null; } }
  _update() {
    if (!this._built || !this._hass) return;
    const cfg = this._cfg;
    this.shadowRoot.getElementById("nm").textContent = cfg.name;
    const timeEl = this.shadowRoot.getElementById("time");
    const subEl = this.shadowRoot.getElementById("sub");
    const btn = this.shadowRoot.getElementById("btn");
    const arc = this.shadowRoot.getElementById("arc");
    const knob = this.shadowRoot.getElementById("knob");
    const ts = this._st(cfg.timer);
    const active = ts && (ts.state === "active" || ts.state === "paused");
    const c = this._modes(active) || cfg.color;
    const card = this.shadowRoot.getElementById("card");
    card.style.setProperty("--c", c);
    card.style.setProperty("--cb", this._alpha(c, "66"));
    card.style.setProperty("--cf", this._alpha(c, "22"));
    let frac = 0;
    if (active) {
      if (ts.state === "active") this._startTick(); else this._stopTick();
      const rem = this._remaining(ts);
      const dur = this._parseDur(ts.attributes.duration) || 1;
      frac = Math.max(0, Math.min(1, rem / dur));
      timeEl.textContent = this._fmt(rem);
      subEl.textContent = ts.state === "active" ? "Klima läuft" : "Pausiert";
      btn.textContent = "Stopp";
      btn.className = "stop";
      btn.disabled = false;
      knob.style.display = "none";
    } else {
      this._stopTick();
      const m = this._drag && this._dragMin != null ? this._dragMin : this._setMinutes();
      frac = Math.max(0, Math.min(1, m / cfg.max_minutes));
      const h = Math.floor(m / 60), mm = m % 60;
      timeEl.textContent = h > 0 ? h + " h " + mm + " min" : mm + " min";
      subEl.textContent = "Am Ring ziehen zum Einstellen";
      btn.textContent = "Start";
      btn.className = "";
      btn.disabled = m <= 0;
      knob.style.display = "";
      const a = frac * 2 * Math.PI - Math.PI / 2;
      knob.setAttribute("cx", 100 + 84 * Math.cos(a));
      knob.setAttribute("cy", 100 + 84 * Math.sin(a));
    }
    arc.setAttribute("stroke-dashoffset", this._C * (1 - frac));
  }
  getCardSize() { return this._cfg && this._cfg.compact ? 3 : 5; }
}
customElements.define("klima-timer-dial", KlimaTimerDial);
window.customCards = window.customCards || [];
window.customCards.push({ type: "klima-timer-dial", name: "Klima Timer Dial", description: "Apple-Style Timer-Ring für den Klima-Timer" });
