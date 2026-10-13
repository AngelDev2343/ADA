// Genera las portadas de los juegos de terceros como SVG en icons/.
// Uso: node tools/portadas.js
// Solo texto y formas geométricas; las letras se dibujan como píxeles para no depender de fuentes.
const fs = require("fs");
const path = require("path");

const T = 512;
const MARGEN = 44;

const PORTADAS = [
    { archivo: "eaglercraft", titulo: "EAGLERCRAFT", fondo: ["#1b2a12", "#080b06"], texto: "#7ed957", sombra: "#2c4a19", acento: "#a0703c", patron: "pixeles" },
    { archivo: "simpsons-hit-and-run", titulo: "THE SIMPSONS: HIT & RUN", fondo: ["#12223d", "#060a13"], texto: "#ffd90f", sombra: "#6e5300", acento: "#3fa9f5", patron: "franjas" },
    { archivo: "street-fighter-3", titulo: "STREET FIGHTER III", fondo: ["#3a0b0b", "#0c0303"], texto: "#ff5a1f", sombra: "#561300", acento: "#ff2a2a", patron: "rayos" },
    { archivo: "kof-2002", titulo: "KOF 2002", fondo: ["#0b1d3a", "#04070f"], texto: "#4cc3ff", sombra: "#0d3b66", acento: "#f2c14e", patron: "rombos" },
    { archivo: "bloody-roar", titulo: "BLOODY ROAR", fondo: ["#2a0410", "#070103"], texto: "#ff2d55", sombra: "#550013", acento: "#ff2d55", patron: "cortes" },
    { archivo: "simpsons-arcade", titulo: "THE SIMPSONS ARCADE", fondo: ["#2b1450", "#0b0516"], texto: "#ffb627", sombra: "#5a3a00", acento: "#c38bff", patron: "puntos" },
    { archivo: "escape-road", titulo: "ESCAPE ROAD", fondo: ["#ffcc1f", "#f2a900"], texto: "#ffffff", sombra: "#6b3f00", acento: "#8a5a00", patron: "carretera" },
    { archivo: "car-soccer", titulo: "CAR SOCCER", fondo: ["#0c3a2a", "#03110c"], texto: "#ff9f1c", sombra: "#5a3300", acento: "#ffffff", patron: "cancha" },
    { archivo: "fireboy-watergirl", titulo: "FIREBOY & WATERGIRL", fondo: ["#3a1208", "#071c29"], texto: "#ffffff", sombra: "#000000", acento: "#ff6a2b", acento2: "#36b6ff", colores: { FIREBOY: "#ff6a2b", WATERGIRL: "#36b6ff" }, patron: "mitades" },
    { archivo: "flappy-bird", titulo: "FLAPPY BIRD", fondo: ["#0f2a44", "#06111c"], texto: "#ffd23f", sombra: "#6b4e00", acento: "#5fd35a", patron: "barras" },
];

// Letras de 5x7 píxeles, filas de arriba abajo
const LETRAS = {
    A: "01110 10001 10001 11111 10001 10001 10001",
    B: "11110 10001 10001 11110 10001 10001 11110",
    C: "01110 10001 10000 10000 10000 10001 01110",
    D: "11110 10001 10001 10001 10001 10001 11110",
    E: "11111 10000 10000 11110 10000 10000 11111",
    F: "11111 10000 10000 11110 10000 10000 10000",
    G: "01110 10001 10000 10111 10001 10001 01111",
    H: "10001 10001 10001 11111 10001 10001 10001",
    I: "01110 00100 00100 00100 00100 00100 01110",
    J: "00111 00010 00010 00010 00010 10010 01100",
    K: "10001 10010 10100 11000 10100 10010 10001",
    L: "10000 10000 10000 10000 10000 10000 11111",
    M: "10001 11011 10101 10101 10001 10001 10001",
    N: "10001 10001 11001 10101 10011 10001 10001",
    O: "01110 10001 10001 10001 10001 10001 01110",
    P: "11110 10001 10001 11110 10000 10000 10000",
    Q: "01110 10001 10001 10001 10101 10010 01101",
    R: "11110 10001 10001 11110 10100 10010 10001",
    S: "01111 10000 10000 01110 00001 00001 11110",
    T: "11111 00100 00100 00100 00100 00100 00100",
    U: "10001 10001 10001 10001 10001 10001 01110",
    V: "10001 10001 10001 10001 10001 01010 00100",
    W: "10001 10001 10001 10101 10101 10101 01010",
    X: "10001 10001 01010 00100 01010 10001 10001",
    Y: "10001 10001 01010 00100 00100 00100 00100",
    Z: "11111 00001 00010 00100 01000 10000 11111",
    0: "01110 10001 10011 10101 11001 10001 01110",
    1: "00100 01100 00100 00100 00100 00100 01110",
    2: "01110 10001 00001 00010 00100 01000 11111",
    3: "11110 00001 00001 01110 00001 00001 11110",
    4: "00010 00110 01010 10010 11111 00010 00010",
    5: "11111 10000 11110 00001 00001 10001 01110",
    6: "00110 01000 10000 11110 10001 10001 01110",
    7: "11111 00001 00010 00100 01000 01000 01000",
    8: "01110 10001 10001 01110 10001 10001 01110",
    9: "01110 10001 10001 01111 00001 00010 01100",
    "&": "01100 10010 10100 01000 10101 10010 01101",
    ":": "0 1 1 0 1 1 0",
    "-": "000 000 000 111 000 000 000",
    "'": "1 1 0 0 0 0 0",
    ".": "0 0 0 0 0 1 1",
    "!": "1 1 1 1 1 0 1",
    " ": "00 00 00 00 00 00 00",
};
const glifo = (c) => LETRAS[c].split(" ");
const ancho = (linea) => [...linea].reduce((s, c) => s + glifo(c)[0].length + 1, -1);

// Reparte las palabras en 1 a 3 líneas buscando la letra más grande que quepa
function repartir(titulo) {
    const palabras = titulo.split(" ");
    const particiones = (p, k) =>
        p.length < k ? [] : k === 1 ? [[p.join(" ")]] :
        p.slice(0, -1).flatMap((_, i) => particiones(p.slice(i + 1), k - 1).map((r) => [p.slice(0, i + 1).join(" "), ...r]));
    let mejor;
    for (let k = 1; k <= 3; k++) {
        for (const lineas of particiones(palabras, k)) {
            const w = Math.max(...lineas.map(ancho));
            const h = k * 7 + (k - 1) * 3;
            const u = Math.min(16, Math.floor((T - 2 * MARGEN) / w), Math.floor(300 / h));
            if (!mejor || u > mejor.u) mejor = { lineas, u, h: h * u };
        }
    }
    return mejor;
}

function titulo(p) {
    const { lineas, u, h } = repartir(p.titulo);
    const arriba = Math.round((T - h) / 2);
    const rects = [];
    lineas.forEach((linea, n) => {
        let x = Math.round((T - (ancho(linea) + 0.4) * u) / 2);
        const y = arriba + n * 10 * u;
        for (const palabra of linea.split(" ")) {
            const color = p.colores?.[palabra.replace(/[^A-Z0-9]/g, "")] || p.texto;
            for (const c of palabra + " ") {
                glifo(c).forEach((fila, f) => {
                    for (const m of fila.matchAll(/1+/g)) rects.push({ x: x + m.index * u, y: y + f * u, w: m[0].length * u + Math.round(u * 0.4), h: u, color });
                });
                x += (glifo(c)[0].length + 1) * u;
            }
        }
    });
    const s = Math.max(3, Math.round(u / 2.5));
    const rect = (r, dx, color) => `<rect x="${r.x + dx}" y="${r.y + dx}" width="${r.w}" height="${r.h}" fill="${color}"/>`;
    const svg = `<g shape-rendering="crispEdges">${rects.map((r) => rect(r, s, p.sombra)).join("")}${rects.map((r) => rect(r, 0, r.color)).join("")}</g>`;
    return { svg, arriba, abajo: arriba + h };
}

function azar(semilla) {
    return () => {
        semilla = (semilla + 0x6d2b79f5) | 0;
        let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const PATRONES = {
    pixeles(p) {
        const r = azar(7);
        let s = "";
        for (let y = 0; y < T; y += 32)
            for (let x = 0; x < T; x += 32)
                if (r() < 0.45) s += `<rect x="${x}" y="${y}" width="32" height="32" fill="${r() < 0.5 ? p.texto : p.acento}" opacity="${(0.04 + r() * 0.09).toFixed(2)}"/>`;
        return s;
    },
    franjas: (p) =>
        `<pattern id="f2" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="22" height="48" fill="${p.acento}" opacity=".13"/></pattern><rect width="${T}" height="${T}" fill="url(#f2)"/>`,
    rayos(p) {
        let s = "";
        for (let i = 0; i < 24; i++) {
            const a = (i * Math.PI) / 12, b = a + Math.PI / 24;
            s += `<polygon points="256,256 ${256 + 420 * Math.cos(a)},${256 + 420 * Math.sin(a)} ${256 + 420 * Math.cos(b)},${256 + 420 * Math.sin(b)}" fill="${p.acento}" opacity=".12"/>`;
        }
        return s;
    },
    rombos(p, c) {
        let s = `<pattern id="f2" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect x="1" y="1" width="38" height="38" fill="none" stroke="${p.texto}" stroke-width="2" opacity=".08"/></pattern><rect width="${T}" height="${T}" fill="url(#f2)"/>`;
        const y = Math.min(c.abajo + 56, T - 40);
        for (const x of [196, 256, 316]) s += `<polygon points="${x},${y - 16} ${x + 16},${y} ${x},${y + 16} ${x - 16},${y}" fill="${p.acento}"/>`;
        return s;
    },
    cortes(p) {
        let s = "";
        for (const d of [-60, 0, 60]) s += `<polygon points="${400 + d},-20 ${430 + d},-20 ${110 + d},${T + 20} ${80 + d},${T + 20}" fill="${p.acento}" opacity=".22"/>`;
        return s;
    },
    puntos(p) {
        let s = "";
        for (let y = 12; y < T; y += 24)
            for (let x = (y / 24) % 2 ? 24 : 12; x < T; x += 24)
                s += `<circle cx="${x}" cy="${y}" r="${(1 + (6 * y) / T).toFixed(1)}" fill="${p.acento}" opacity=".3"/>`;
        return s;
    },
    carretera(p) {
        const hy = 330;
        let s = `<g stroke="${p.acento}" stroke-width="3" opacity=".35">`;
        for (let x = -768; x <= 1280; x += 128) s += `<line x1="256" y1="${hy}" x2="${x}" y2="${T}"/>`;
        for (let k = 0; k < 7; k++) {
            const y = hy + (T - hy) * (k / 6) ** 2;
            s += `<line x1="0" y1="${y.toFixed(1)}" x2="${T}" y2="${y.toFixed(1)}"/>`;
        }
        return s + "</g>";
    },
    cancha: (p) =>
        `<g fill="none" stroke="${p.acento}" stroke-width="4" opacity=".16"><rect x="24" y="64" width="464" height="384"/><line x1="256" y1="64" x2="256" y2="448"/><circle cx="256" cy="256" r="72"/><rect x="24" y="176" width="64" height="160"/><rect x="424" y="176" width="64" height="160"/></g>`,
    mitades: (p) =>
        `<polygon points="${T},0 ${T},${T} 0,${T}" fill="${p.fondo[1]}"/><line x1="${T}" y1="0" x2="0" y2="${T}" stroke="#fff" stroke-width="2" opacity=".15"/>` +
        `<circle cx="96" cy="96" r="150" fill="${p.acento}" opacity=".08"/><circle cx="416" cy="416" r="150" fill="${p.acento2}" opacity=".08"/>`,
    barras(p) {
        let s = "";
        for (const [x, hueco] of [[24, 120], [168, 330], [312, 90], [456, 300]])
            s += `<rect x="${x}" y="0" width="40" height="${hueco - 70}" fill="${p.acento}" opacity=".22"/><rect x="${x}" y="${hueco + 70}" width="40" height="${T}" fill="${p.acento}" opacity=".22"/>`;
        return s;
    },
};

const fondo = (p) =>
    p.patron === "mitades"
        ? `<rect width="${T}" height="${T}" fill="${p.fondo[0]}"/>`
        : `<defs><linearGradient id="f1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.fondo[0]}"/><stop offset="1" stop-color="${p.fondo[1]}"/></linearGradient></defs><rect width="${T}" height="${T}" fill="url(#f1)"/>`;

for (const p of PORTADAS) {
    const t = titulo(p);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">${fondo(p)}${PATRONES[p.patron](p, t)}${t.svg}</svg>\n`;
    const destino = path.join(__dirname, "..", "icons", `${p.archivo}.svg`);
    fs.writeFileSync(destino, svg);
    console.log(path.relative(process.cwd(), destino));
}
