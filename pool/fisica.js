// Física y reglas del pool. Todo ocurre en el plano de la mesa (x, z), en unidades de la mesa y segundos.
// No depende de Three.js para poder usarse también desde el worker de la CPU.

const R = 0.3075;
const MESA = { x: 6.75, z: 13.5 };
const COCINA = -6.75; // en el saque la blanca va detrás de esta línea
const PIE = 6.75; // vértice del triángulo
const DT = 1 / 480;
const VMAX = 42;
const DESLIZ = 12; // frenado mientras la bola resbala sobre el paño
const RODADURA = 2.2; // frenado cuando ya rueda
const SAQUE = 2.4; // el saque sale mucho más fuerte que un tiro normal
const GIRO = 5; // frenado del efecto lateral
const REBOTE_BOLA = 0.95;
const REBOTE_BANDA = 0.75;
const EFECTO_BANDA = 0.3;

const TRONERAS = [
    [6.75, 13.5, 0.8],
    [-6.75, 13.5, 0.8],
    [-7.2, 0, 0.6],
    [-6.75, -13.5, 0.8],
    [6.75, -13.5, 0.8],
    [7.2, 0, 0.6],
].map(([x, z, r]) => ({ x, z, r }));

// bordes interiores de las bandas, incluidas las bocas inclinadas de las troneras
const BANDAS = (() => {
    const s = [];
    for (const sz of [1, -1]) {
        s.push([-5.625, 13.5 * sz, 5.625, 13.5 * sz], [5.625, 13.5 * sz, 6, 13.85 * sz], [-5.625, 13.5 * sz, -6, 13.85 * sz]);
        for (const sx of [1, -1])
            s.push(
                [6.75 * sx, 0.75 * sz, 6.75 * sx, 12.5 * sz],
                [6.75 * sx, 12.5 * sz, 7.1 * sx, 12.75 * sz],
                [6.75 * sx, 0.75 * sz, 7.1 * sx, 0.7 * sz]
            );
    }
    return s.map(([ax, az, bx, bz]) => ({ ax, az, dx: bx - ax, dz: bz - az, l2: (bx - ax) ** 2 + (bz - az) ** 2 }));
})();

const grupoDe = (n) => (n === 8 ? "negra" : n < 8 ? "lisas" : "rayadas");

function bola(n, x, z) {
    return { n, x, z, vx: 0, vz: 0, wx: 0, wz: 0, e: 0, activa: true };
}

function nuevaMesa() {
    const bolas = [bola(0, 0, -9)];
    // 8 en el centro y una lisa y una rayada en las esquinas de atrás; el resto al azar
    const resto = [2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
    const esquinas = Math.random() < 0.5 ? [1, 9] : [9, 1];
    // un triángulo perfectamente apretado transmite toda la energía en línea y apenas se abre
    const paso = 2 * R + 0.02;
    const fila = paso * Math.sqrt(3) / 2;
    const jitter = () => (Math.random() - 0.5) * 0.01;
    for (let f = 0; f < 5; f++)
        for (let i = 0; i <= f; i++) {
            let n;
            if (f === 2 && i === 1) n = 8;
            else if (f === 4 && i === 0) n = esquinas[0];
            else if (f === 4 && i === 4) n = esquinas[1];
            else n = resto.pop();
            bolas.push(bola(n, (i - f / 2) * paso + jitter(), PIE + f * fila + jitter()));
        }
    return bolas;
}

function copiar(bolas) {
    return bolas.map((b) => ({ ...b }));
}

const enMovimiento = (bolas) => bolas.some((b) => b.activa && (b.vx || b.vz || b.wx || b.wz));

// fuerza 0..1, efecto x (lateral) e y (arriba/abajo) entre -1 y 1
function golpear(bolas, angulo, fuerza, ex = 0, ey = 0, saque = false) {
    const b = bolas[0];
    const v = Math.max(0.6, VMAX * Math.pow(fuerza, 1.3)) * (saque ? SAQUE : 1);
    const dx = Math.sin(angulo);
    const dz = Math.cos(angulo);
    b.vx = dx * v;
    b.vz = dz * v;
    // con ey = 2/3 sale rodando; más arriba sigue a la bola golpeada, por debajo del centro retrocede
    b.wx = dx * v * 1.5 * ey;
    b.wz = dz * v * 1.5 * ey;
    b.e = v * 1.25 * ex;
}

function nuevosEventos() {
    return { primero: null, metidas: [], bandas: 0, sonidos: [] };
}

function paso(bolas, ev) {
    for (const b of bolas) {
        if (!b.activa || !(b.vx || b.vz || b.wx || b.wz)) continue;
        const sx = b.vx - b.wx;
        const sz = b.vz - b.wz;
        const s = Math.hypot(sx, sz);
        if (s > 1e-3) {
            const a = DESLIZ * DT;
            if (3.5 * a >= s) {
                b.vx = b.wx = (5 * b.vx + 2 * b.wx) / 7;
                b.vz = b.wz = (5 * b.vz + 2 * b.wz) / 7;
            } else {
                b.vx -= (sx / s) * a;
                b.vz -= (sz / s) * a;
                b.wx += (sx / s) * 2.5 * a;
                b.wz += (sz / s) * 2.5 * a;
            }
        } else {
            const v = Math.hypot(b.vx, b.vz);
            const a = RODADURA * DT;
            if (v <= a) {
                b.vx = b.vz = b.wx = b.wz = b.e = 0;
            } else {
                const k = (v - a) / v;
                b.wx = b.vx *= k;
                b.wz = b.vz *= k;
            }
        }
        if (b.e) b.e = Math.abs(b.e) <= GIRO * DT ? 0 : b.e - Math.sign(b.e) * GIRO * DT;
        b.x += b.vx * DT;
        b.z += b.vz * DT;
    }

    for (let i = 0; i < bolas.length; i++) {
        const a = bolas[i];
        if (!a.activa) continue;
        for (let j = i + 1; j < bolas.length; j++) {
            const b = bolas[j];
            if (!b.activa) continue;
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const d2 = dx * dx + dz * dz;
            if (d2 >= 4 * R * R) continue;
            const d = Math.sqrt(d2) || 1e-6;
            const nx = dx / d;
            const nz = dz / d;
            const solape = (2 * R - d) / 2;
            a.x -= nx * solape;
            a.z -= nz * solape;
            b.x += nx * solape;
            b.z += nz * solape;
            const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
            if (rel <= 0) continue;
            const imp = ((1 + REBOTE_BOLA) / 2) * rel;
            a.vx -= imp * nx;
            a.vz -= imp * nz;
            b.vx += imp * nx;
            b.vz += imp * nz;
            if (ev.primero === null && (a.n === 0 || b.n === 0)) ev.primero = a.n === 0 ? b.n : a.n;
            ev.sonidos.push({ tipo: "bola", v: rel });
        }
    }

    for (const b of bolas) {
        if (!b.activa) continue;
        if (Math.abs(b.x) > MESA.x - R - 0.05 || Math.abs(b.z) > MESA.z - R - 0.05) {
            for (const s of BANDAS) {
                const t = Math.min(Math.max(((b.x - s.ax) * s.dx + (b.z - s.az) * s.dz) / s.l2, 0), 1);
                const qx = s.ax + t * s.dx;
                const qz = s.az + t * s.dz;
                const dx = b.x - qx;
                const dz = b.z - qz;
                const d2 = dx * dx + dz * dz;
                if (d2 >= R * R) continue;
                const d = Math.sqrt(d2) || 1e-6;
                const nx = dx / d;
                const nz = dz / d;
                b.x = qx + nx * R;
                b.z = qz + nz * R;
                const vn = b.vx * nx + b.vz * nz;
                if (vn >= 0) continue;
                b.vx -= (1 + REBOTE_BANDA) * vn * nx;
                b.vz -= (1 + REBOTE_BANDA) * vn * nz;
                const wn = b.wx * nx + b.wz * nz;
                b.wx -= (1 + REBOTE_BANDA) * wn * nx;
                b.wz -= (1 + REBOTE_BANDA) * wn * nz;
                // el efecto lateral abre o cierra el ángulo de salida
                b.vx += nz * b.e * EFECTO_BANDA;
                b.vz -= nx * b.e * EFECTO_BANDA;
                b.e *= 0.5;
                ev.bandas++;
                ev.sonidos.push({ tipo: "banda", v: -vn });
            }
        }

        let tronera = TRONERAS.findIndex((t) => (b.x - t.x) ** 2 + (b.z - t.z) ** 2 < t.r * t.r);
        // red de seguridad: si algo se escapa de la mesa, cuenta como metida en la tronera más cercana
        if (tronera < 0 && (Math.abs(b.x) > MESA.x + 0.6 || Math.abs(b.z) > MESA.z + 0.6)) {
            const dist = TRONERAS.map((t) => (b.x - t.x) ** 2 + (b.z - t.z) ** 2);
            tronera = dist.indexOf(Math.min(...dist));
        }
        if (tronera >= 0) {
            b.activa = false;
            b.vx = b.vz = b.wx = b.wz = b.e = 0;
            ev.metidas.push({ n: b.n, tronera });
            ev.sonidos.push({ tipo: "tronera", n: b.n, tronera });
        }
    }
}

// simula el tiro completo sobre una copia; devuelve las bolas finales y lo que pasó
function simular(bolas, angulo, fuerza, ex, ey, saque = false, maxSegundos = 25) {
    const copia = copiar(bolas);
    const ev = nuevosEventos();
    golpear(copia, angulo, fuerza, ex, ey, saque);
    const pasos = maxSegundos / DT;
    for (let i = 0; i < pasos && enMovimiento(copia); i++) paso(copia, ev);
    ev.sonidos.length = 0;
    return { bolas: copia, ev };
}

// ---------- Reglas (bola 8) ----------

function restantes(bolas, grupo) {
    return bolas.filter((b) => b.activa && b.n !== 0 && grupoDe(b.n) === grupo).length;
}

// a qué bolas debe tirar el jugador: "abierta", "lisas", "rayadas" o "negra"
function objetivo(partida, bolas, jugador) {
    const g = partida.grupos[jugador];
    if (!g) return "abierta";
    return restantes(bolas, g) > 0 ? g : "negra";
}

function esLegal(obj, n) {
    if (n === 0) return false;
    if (obj === "abierta") return n !== 8;
    return grupoDe(n) === obj;
}

// decide qué pasa después de un tiro; "antes" son las bolas como estaban antes de tirar
function arbitrar(partida, antes, ev) {
    const j = partida.turno;
    const obj = objetivo(partida, antes, j);
    const metidas = ev.metidas.map((m) => m.n);
    const objetos = metidas.filter((n) => n !== 0 && n !== 8);
    const r = { falta: null, sigue: false, grupos: [...partida.grupos], fin: false, ganador: null, motivo: "", reponer8: false };

    if (metidas.includes(0)) r.falta = "La blanca cayó en una tronera";
    else if (ev.primero === null) r.falta = "La blanca no tocó ninguna bola";
    else if (!partida.saque && !esLegal(obj, ev.primero)) r.falta = "La primera bola tocada no era válida";

    if (metidas.includes(8)) {
        if (partida.saque) {
            r.reponer8 = true;
        } else {
            r.fin = true;
            r.ganador = obj === "negra" && !r.falta ? j : 1 - j;
            r.motivo = obj !== "negra" ? "La bola 8 cayó antes de tiempo" : r.falta ? "La bola 8 entró con falta" : "La bola 8 entró limpia";
            return r;
        }
    }

    if (obj === "abierta" && !partida.saque && !r.falta && objetos.length) {
        r.grupos[j] = grupoDe(objetos[0]);
        r.grupos[1 - j] = r.grupos[j] === "lisas" ? "rayadas" : "lisas";
    }

    if (!r.falta) r.sigue = partida.saque ? objetos.length > 0 : objetos.some((n) => grupoDe(n) === r.grupos[j]);
    return r;
}

// una bola colocada a mano no puede quedar fuera de la mesa ni encima de otra
function posicionValida(bolas, x, z, soloCocina = false, n = 0) {
    if (Math.abs(x) > MESA.x - R || Math.abs(z) > MESA.z - R) return false;
    if (soloCocina && z > COCINA) return false;
    return bolas.every((b) => b.n === n || !b.activa || (b.x - x) ** 2 + (b.z - z) ** 2 >= 4 * R * R);
}

// lugar libre lo más cerca posible del punto dado, para reponer la bola 8
function lugarLibre(bolas, x, z, n) {
    for (let d = 0; d < MESA.z; d += 0.1) if (posicionValida(bolas, x, z + d, false, n)) return { x, z: z + d };
    return { x, z };
}

if (typeof module !== "undefined") module.exports = { R, MESA, COCINA, PIE, DT, VMAX, RODADURA, TRONERAS, BANDAS, grupoDe, nuevaMesa, copiar, enMovimiento, golpear, nuevosEventos, paso, simular, restantes, objetivo, esLegal, arbitrar, posicionValida, lugarLibre };
