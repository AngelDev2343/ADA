// ---------- Piezas ----------

const NOMBRE_PIEZA = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const IMG = {};
for (const t in NOMBRE_PIEZA) {
    IMG[t.toUpperCase()] = `assets/white_${NOMBRE_PIEZA[t]}.png`;
    IMG[t] = `assets/black_${NOMBRE_PIEZA[t]}.png`;
}

const pieza = (p, className = "") => Object.assign(document.createElement("img"), { src: IMG[p], alt: "", className });

// ---------- Sonidos ----------

let audio;
function sonar(crear) {
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume();
    crear(audio, audio.currentTime);
}

function golpe(freq, dur, vol) {
    sonar((ac, t) => {
        const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
        const src = ac.createBufferSource();
        const filtro = ac.createBiquadFilter();
        const gain = ac.createGain();
        src.buffer = buffer;
        filtro.type = "bandpass";
        filtro.frequency.value = freq;
        gain.gain.value = vol;
        src.connect(filtro).connect(gain).connect(ac.destination);
        src.start(t);
    });
}

function tono(freq, dur, delay = 0) {
    sonar((ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        osc.connect(gain).connect(ac.destination);
        osc.start(t + delay);
        osc.stop(t + delay + dur);
    });
}

const sfx = {
    mover: () => golpe(1400, 0.06, 1.2),
    capturar: () => (golpe(700, 0.1, 1.8), golpe(2600, 0.05, 0.6)),
    jaque: () => (tono(660, 0.1), tono(880, 0.14, 0.1)),
    ganar: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.16, i * 0.12)),
    perder: () => [392, 330, 262].forEach((f, i) => tono(f, 0.22, i * 0.18)),
};

// ---------- Estado ----------

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const statusEl = $("status");
const screen = $("screen");
const title = $("title");
const info = $("info");
const playBtn = $("playBtn");
const promoEl = $("promo");
const topBar = $("topBar");
const bottomBar = $("bottomBar");
const undoBtn = $("undoBtn");
const resignBtn = $("resignBtn");
const clockSwitch = $("clockSwitch");

const OPCIONES_KEY = "ajedrez-opciones";
const NOMBRE_NIVEL = { facil: "FACIL", normal: "NORMAL", dificil: "DIFICIL" };
const INICIAL = { q: 1, r: 2, b: 2, n: 2, p: 8 };
// con reloj, la CPU reparte su tiempo restante entre estas jugadas: los niveles bajos gastan más
const JUGADAS_RELOJ = { facil: 25, normal: 35, dificil: 45 };

let opciones = { color: "w", nivel: "normal", reloj: false, minutos: "5" };
try {
    opciones = { ...opciones, ...JSON.parse(localStorage.getItem(OPCIONES_KEY)) };
} catch {}

let estado = nuevaPartida();
let jugador = opciones.color === "b" ? "b" : "w";
let historial = [];
let posiciones = [];
let legales = [];
let ultimo = null;
let seleccion = -1;
let terminado = true;
let pensando = false;
let turnoId = 0;
let arrastre = null;
let reloj = null;

const casillas = Array.from({ length: 64 }, () => boardEl.appendChild(document.createElement("div")));
const sqDe = (v) => (jugador === "w" ? v : 63 - v);
const vistaDe = (sq) => (jugador === "w" ? sq : 63 - sq);

// ---------- Dibujo ----------

function material(lado) {
    return estado.board.reduce((total, p) => total + (colorDe(p) === lado ? VALOR[p.toLowerCase()] : 0), 0);
}

function pintarBarra(bar, lado) {
    const caps = bar.querySelector(".captured");
    caps.replaceChildren();
    const enemigo = rival(lado);
    for (const t in INICIAL) {
        const p = deLado(t, enemigo);
        const faltan = INICIAL[t] - estado.board.filter((x) => x === p).length;
        for (let i = 0; i < faltan; i++) caps.append(pieza(p));
    }
    const ventaja = Math.round((material(lado) - material(enemigo)) / 100);
    if (ventaja > 0) caps.append(Object.assign(document.createElement("span"), { className: "diff", textContent: `+${ventaja}` }));
    bar.classList.toggle("turn", !terminado && estado.turn === lado);
    pintarReloj(bar, lado);
}

function render(animar = null) {
    const reyEnJaque = enJaque(estado, estado.turn) ? estado.board.indexOf(deLado("k", estado.turn)) : -1;
    const destinos = legales.filter((m) => m.from === seleccion);

    casillas.forEach((el, v) => {
        const sq = sqDe(v), r = sq >> 3, c = sq & 7, p = estado.board[sq];
        const destino = destinos.find((m) => m.to === sq);
        el.className = `sq ${(r + c) % 2 ? "dark" : "light"}`;
        el.classList.toggle("last", !!ultimo && (sq === ultimo.from || sq === ultimo.to));
        el.classList.toggle("sel", sq === seleccion);
        el.classList.toggle("check", sq === reyEnJaque);
        el.classList.toggle("own", colorDe(p) === jugador);
        if (destino) el.classList.add(p !== "." || destino.ep ? "capture" : "move");
        el.replaceChildren();
        if (p !== ".") el.append(pieza(p, "piece"));
        if (v % 8 === 0) el.append(Object.assign(document.createElement("span"), { className: "coord rank", textContent: 8 - r }));
        if (v >= 56) el.append(Object.assign(document.createElement("span"), { className: "coord file", textContent: "abcdefgh"[c] }));
    });

    if (animar) {
        const img = casillas[vistaDe(animar.to)].querySelector(".piece");
        const lado = boardEl.clientWidth / 8, de = vistaDe(animar.from), a = vistaDe(animar.to);
        img.style.transform = `translate(${((de & 7) - (a & 7)) * lado}px, ${((de >> 3) - (a >> 3)) * lado}px)`;
        img.getBoundingClientRect();
        img.classList.add("slide");
        img.style.transform = "";
    }

    pintarBarra(topBar, rival(jugador));
    pintarBarra(bottomBar, jugador);
    statusEl.textContent = terminado ? "" : reyEnJaque >= 0 ? "JAQUE" : pensando ? "PENSANDO..." : "TU TURNO";
    statusEl.classList.toggle("check", !terminado && reyEnJaque >= 0);
    boardEl.classList.toggle("mine", puedeMover());
    undoBtn.disabled = terminado || pensando || !!reloj || historial.length < pasosDeshacer();
    resignBtn.disabled = terminado;
}

// ---------- Reloj ----------

function formato(ms) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function pintarReloj(bar, lado) {
    const clock = bar.querySelector(".clock");
    clock.hidden = !reloj;
    if (!reloj) return;
    clock.textContent = formato(reloj[lado]);
    clock.classList.toggle("low", reloj[lado] < 20000);
}

function descontar() {
    if (!reloj || terminado) return;
    const ahora = performance.now();
    reloj[estado.turn] = Math.max(0, reloj[estado.turn] - (ahora - reloj.marca));
    reloj.marca = ahora;
    pintarReloj(topBar, rival(jugador));
    pintarReloj(bottomBar, jugador);
    if (reloj[estado.turn] === 0) sinTiempo(estado.turn);
}
setInterval(descontar, 100);

function puedeDarMate(lado) {
    const piezas = estado.board.filter((p) => colorDe(p) === lado && p.toLowerCase() !== "k");
    return !(piezas.length === 0 || (piezas.length === 1 && "nb".includes(piezas[0].toLowerCase())));
}

function sinTiempo(lado) {
    const otro = rival(lado);
    if (!puedeDarMate(otro)) return terminar({ ganador: null, motivo: "Sin tiempo, pero sin piezas para dar mate" });
    terminar({ ganador: otro, motivo: lado === jugador ? "Se acabó tu tiempo" : "La CPU se quedó sin tiempo" });
}

// ---------- Jugadas ----------

const puedeMover = () => !terminado && !pensando && estado.turn === jugador;

function ejecutar(m, animar) {
    descontar();
    if (terminado) return;
    const capturo = estado.board[m.to] !== "." || m.ep;
    historial.push({ estado, ultimo });
    estado = jugar(estado, m);
    ultimo = m;
    seleccion = -1;
    posiciones.push(clave(estado));
    legales = movimientosLegales(estado);
    if (enJaque(estado, estado.turn)) sfx.jaque();
    else if (capturo) sfx.capturar();
    else sfx.mover();
    render(animar ? m : null);

    const fin = resultado(estado, posiciones.filter((k) => k === posiciones.at(-1)).length);
    if (fin) terminar(fin);
    else if (estado.turn !== jugador) turnoCPU();
}

function intentar(from, to, animar) {
    const candidatas = legales.filter((m) => m.from === from && m.to === to);
    if (!candidatas.length) return false;
    if (candidatas.length > 1) elegirCoronacion(candidatas, animar);
    else ejecutar(candidatas[0], animar);
    return true;
}

function elegirCoronacion(candidatas, animar) {
    render();
    const choices = promoEl.querySelector(".choices");
    choices.replaceChildren(
        ...candidatas.map((m) => {
            const btn = document.createElement("button");
            btn.append(pieza(deLado(m.promo, jugador)));
            btn.addEventListener("click", () => {
                promoEl.hidden = true;
                ejecutar(m, animar);
            });
            return btn;
        })
    );
    promoEl.hidden = false;
}

promoEl.addEventListener("click", (e) => {
    if (e.target !== promoEl) return;
    promoEl.hidden = true;
    seleccion = -1;
    render();
});

// ---------- CPU ----------

let worker = crearWorker();

function crearWorker() {
    try {
        const w = new Worker("cpu.js");
        w.onerror = () => worker === w && (worker = null);
        return w;
    } catch {
        return null;
    }
}

// si el worker falla o no responde, la CPU piensa en la página
function pensar(s, nivel) {
    return new Promise((resolve) => {
        let espera;
        const local = () => {
            clearTimeout(espera);
            worker?.terminate();
            worker = null;
            setTimeout(() => resolve(mejorMovimiento(s, nivel)), 30);
        };
        if (!worker) return local();
        espera = setTimeout(local, 4000);
        worker.onerror = local;
        worker.onmessage = (e) => {
            clearTimeout(espera);
            resolve(e.data);
        };
        worker.postMessage({ estado: s, nivel });
    });
}

function esperaCPU() {
    if (!reloj) return 300;
    if (legales.length === 1) return 400;
    const restante = reloj[estado.turn];
    const media = restante / JUGADAS_RELOJ[opciones.nivel];
    return Math.min(Math.max(400, media * (0.5 + Math.random())), restante * 0.5);
}

function turnoCPU() {
    pensando = true;
    render();
    const id = ++turnoId, inicio = performance.now(), espera = esperaCPU();
    pensar(estado, opciones.nivel).then((m) =>
        setTimeout(() => {
            if (id !== turnoId) return;
            pensando = false;
            ejecutar(m, true);
        }, Math.max(0, espera - (performance.now() - inicio)))
    );
}

function cancelarCPU() {
    turnoId++;
    if (pensando && worker) {
        worker.terminate();
        worker = crearWorker();
    }
    pensando = false;
}

// ---------- Partida ----------

function empezar() {
    cancelarCPU();
    jugador = opciones.color === "azar" ? (Math.random() < 0.5 ? "w" : "b") : opciones.color;
    estado = nuevaPartida();
    historial = [];
    posiciones = [clave(estado)];
    legales = movimientosLegales(estado);
    ultimo = null;
    seleccion = -1;
    terminado = false;
    const ms = Number(opciones.minutos) * 60000;
    reloj = opciones.reloj ? { w: ms, b: ms, marca: performance.now() } : null;
    topBar.querySelector(".name").textContent = `CPU ${NOMBRE_NIVEL[opciones.nivel]}`;
    screen.hidden = true;
    render();
    if (estado.turn !== jugador) turnoCPU();
}

function terminar(fin) {
    terminado = true;
    cancelarCPU();
    seleccion = -1;
    render();
    const gane = fin.ganador === jugador;
    title.textContent = fin.ganador === null ? "TABLAS" : gane ? "¡GANASTE!" : "PERDISTE";
    title.className = fin.ganador === null ? "draw" : gane ? "" : "lose";
    info.textContent = `${fin.motivo}.`;
    playBtn.textContent = "REVANCHA";
    setTimeout(() => {
        if (gane) sfx.ganar();
        else if (fin.ganador !== null) sfx.perder();
        screen.hidden = false;
    }, 900);
}

// si es el turno del jugador, la CPU acaba de mover: se deshacen las dos jugadas
const pasosDeshacer = () => (estado.turn === jugador ? 2 : 1);

undoBtn.addEventListener("click", () => {
    const pasos = pasosDeshacer();
    if (pensando || historial.length < pasos) return;
    for (let i = 0; i < pasos; i++) {
        ({ estado, ultimo } = historial.pop());
        posiciones.pop();
    }
    legales = movimientosLegales(estado);
    seleccion = -1;
    render();
});

let confirmarTimer;
resignBtn.addEventListener("click", () => {
    if (resignBtn.textContent !== "¿SEGURO?") {
        resignBtn.textContent = "¿SEGURO?";
        clearTimeout(confirmarTimer);
        confirmarTimer = setTimeout(() => (resignBtn.textContent = "RENDIRSE"), 2500);
        return;
    }
    clearTimeout(confirmarTimer);
    resignBtn.textContent = "RENDIRSE";
    terminar({ ganador: rival(jugador), motivo: "Abandonaste" });
});

playBtn.addEventListener("click", empezar);

const guardarOpciones = () => localStorage.setItem(OPCIONES_KEY, JSON.stringify(opciones));

document.querySelectorAll(".seg").forEach((seg) => {
    const pintar = () => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.value === opciones[seg.dataset.option]));
    seg.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        opciones[seg.dataset.option] = btn.dataset.value;
        guardarOpciones();
        pintar();
    });
    pintar();
});

function pintarSwitch() {
    clockSwitch.classList.toggle("on", opciones.reloj);
    document.querySelectorAll(".time-row").forEach((el) => (el.hidden = !opciones.reloj));
}
clockSwitch.addEventListener("click", () => {
    opciones.reloj = !opciones.reloj;
    guardarOpciones();
    pintarSwitch();
});
pintarSwitch();

// ---------- Ratón y táctil: clic para seleccionar y mover, o arrastrar ----------

boardEl.addEventListener("pointerdown", (e) => {
    if (!puedeMover() || e.button > 0) return;
    const v = casillas.indexOf(e.target.closest(".sq"));
    if (v < 0) return;
    const sq = sqDe(v);
    if (seleccion >= 0 && intentar(seleccion, sq, true)) return;
    if (colorDe(estado.board[sq]) !== jugador) {
        seleccion = -1;
        render();
        return;
    }
    seleccion = sq;
    render();
    arrastre = { sq, img: casillas[v].querySelector(".piece"), x: e.clientX, y: e.clientY, movido: false };
    boardEl.setPointerCapture(e.pointerId);
});

boardEl.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (!arrastre.movido && Math.hypot(dx, dy) < 5) return;
    arrastre.movido = true;
    arrastre.img.classList.add("drag");
    arrastre.img.style.transform = `translate(${dx}px, ${dy}px)`;
});

boardEl.addEventListener("pointerup", (e) => {
    if (!arrastre) return;
    const { sq, img, movido } = arrastre;
    arrastre = null;
    if (!movido) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(".sq");
    if (el && intentar(sq, sqDe(casillas.indexOf(el)), false)) return;
    img.classList.remove("drag");
    img.style.transform = "";
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    promoEl.hidden = true;
    seleccion = -1;
    render();
});

legales = movimientosLegales(estado);
render();
