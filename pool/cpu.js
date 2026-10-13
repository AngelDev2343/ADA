// Jugador CPU. Busca tiros directos a cada tronera, los simula con la física real y elige el que deja mejor la mesa.
// Funciona como worker (importScripts) o cargado en la página como respaldo.

if (typeof importScripts === "function" && typeof nuevaMesa === "undefined") importScripts("fisica.js");

const NIVELES_CPU = {
    facil: { ruido: 2.2, ruidoFuerza: 0.15, fuerzas: [1.6], efectos: [[0, 0]], candidatos: 6, entre: 4 },
    normal: { ruido: 0.7, ruidoFuerza: 0.06, fuerzas: [1.3, 1.9], efectos: [[0, 0], [0, 0.8], [0, -0.8]], candidatos: 10, entre: 2 },
    dificil: { ruido: 0.15, ruidoFuerza: 0.02, fuerzas: [1.15, 1.5, 2.1], efectos: [[0, 0], [0, 0.8], [0, -0.8], [0.6, 0.3], [-0.6, 0.3]], candidatos: 14, entre: 1 },
};

// punto al que conviene apuntar en cada tronera: un poco hacia dentro de la mesa
const PUNTERIA = TRONERAS.map((t) => ({ x: t.x * (Math.abs(t.z) > 1 ? 0.985 : 0.97), z: t.z * 0.99, medio: Math.abs(t.z) < 1 }));

function caminoLibre(bolas, ax, az, bx, bz, excluir) {
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1e-9;
    for (const b of bolas) {
        if (!b.activa || excluir.includes(b.n)) continue;
        const t = Math.min(Math.max(((b.x - ax) * dx + (b.z - az) * dz) / l2, 0), 1);
        if ((b.x - ax - t * dx) ** 2 + (b.z - az - t * dz) ** 2 < (2 * R - 0.02) ** 2) return false;
    }
    return true;
}

// tiros directos posibles desde (cx, cz): bola objetivo, tronera, ángulo y una fuerza base estimada
function tirosDirectos(bolas, cx, cz, obj) {
    const tiros = [];
    for (const b of bolas) {
        if (!b.activa || !esLegal(obj, b.n)) continue;
        PUNTERIA.forEach((p, tronera) => {
            let ux = p.x - b.x;
            let uz = p.z - b.z;
            const l2 = Math.hypot(ux, uz);
            ux /= l2;
            uz /= l2;
            // a las troneras del medio solo se entra con un ángulo bastante abierto
            if (p.medio && Math.abs(ux) < 0.45) return;
            const gx = b.x - ux * 2 * R;
            const gz = b.z - uz * 2 * R;
            let dx = gx - cx;
            let dz = gz - cz;
            const l1 = Math.hypot(dx, dz);
            if (l1 < 1e-3) return;
            dx /= l1;
            dz /= l1;
            const corte = dx * ux + dz * uz;
            if (corte < 0.2) return;
            if (!caminoLibre(bolas, cx, cz, gx, gz, [0, b.n])) return;
            if (!caminoLibre(bolas, b.x, b.z, p.x, p.z, [0, b.n])) return;
            const facilidad = (corte * corte) / (1 + 0.06 * (l1 + l2));
            // velocidad para que la bola llegue a la tronera, repartida según el corte, más lo que pierde la blanca por el camino
            const vObjeto = Math.sqrt(2 * RODADURA * l2 + 4);
            const v = Math.sqrt((vObjeto / corte) ** 2 + 2 * RODADURA * l1);
            tiros.push({ n: b.n, tronera, angulo: Math.atan2(dx, dz), fuerza: Math.pow(Math.min(v / VMAX, 1), 1 / 1.3), facilidad });
        });
    }
    return tiros.sort((a, b) => b.facilidad - a.facilidad);
}

// qué tan bien queda la mesa para quien tira desde la posición de la blanca
function posicion(bolas, obj) {
    const blanca = bolas[0];
    if (!blanca.activa) return 0;
    const tiros = tirosDirectos(bolas, blanca.x, blanca.z, obj);
    return tiros.length ? tiros[0].facilidad : 0;
}

function puntuar(estado, sim) {
    const { partida, bolas } = estado;
    const r = arbitrar(partida, bolas, sim.ev);
    const yo = partida.turno;
    if (r.fin) return r.ganador === yo ? 1e6 : -1e6;
    if (r.falta) return -2000 + Math.random();
    const despues = { ...partida, grupos: r.grupos, saque: false };
    if (r.sigue) return 1000 + 600 * posicion(sim.bolas, objetivo(despues, sim.bolas, yo)) + 50 * sim.ev.metidas.length;
    // sin meter: mejor si al rival le queda difícil
    return -300 - 500 * posicion(sim.bolas, objetivo(despues, sim.bolas, 1 - yo));
}

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

// con bola en mano prueba a dejar la blanca justo detrás de la línea de cada tiro fácil
function elegirLugar(estado, nivel) {
    const { bolas, partida, enMano } = estado;
    const obj = objetivo(partida, bolas, partida.turno);
    const cocina = enMano === "cocina";
    const lugares = [];
    for (const b of bolas) {
        if (!b.activa || !esLegal(obj, b.n)) continue;
        for (const p of PUNTERIA) {
            const l = Math.hypot(p.x - b.x, p.z - b.z);
            const ux = (p.x - b.x) / l;
            const uz = (p.z - b.z) / l;
            for (const atras of [1.5, 2.5, 4]) {
                for (const lado of [0, 0.6, -0.6]) {
                    const x = b.x - ux * (2 * R + atras) - uz * lado;
                    const z = b.z - uz * (2 * R + atras) + ux * lado;
                    if (posicionValida(bolas, x, z, cocina)) lugares.push({ x, z });
                }
            }
        }
    }
    for (let i = 0; i < 40; i++) {
        const x = (Math.random() * 2 - 1) * (MESA.x - R);
        const z = cocina ? COCINA - Math.random() * (MESA.z + COCINA - R) : (Math.random() * 2 - 1) * (MESA.z - R);
        if (posicionValida(bolas, x, z, cocina)) lugares.push({ x, z });
    }
    let mejor = null;
    for (const l of lugares) {
        const f = tirosDirectos(bolas, l.x, l.z, obj)[0]?.facilidad || 0;
        const nota = f + Math.random() * (nivel === "facil" ? 0.5 : 0.02);
        if (!mejor || nota > mejor.nota) mejor = { ...l, nota };
    }
    return mejor || { x: 0, z: COCINA - 2 };
}

function planCPU(estado) {
    const t0 = Date.now();
    const cfg = NIVELES_CPU[estado.nivel] || NIVELES_CPU.normal;
    const bolas = copiar(estado.bolas);
    const partida = estado.partida;
    let lugar = null;

    if (estado.enMano) {
        lugar = partida.saque ? { x: (Math.random() - 0.5) * 3, z: COCINA - 2.3 } : elegirLugar({ ...estado, bolas }, estado.nivel);
        bolas[0].x = lugar.x;
        bolas[0].z = lugar.z;
        bolas[0].activa = true;
        delete lugar.nota;
    }
    const blanca = bolas[0];

    if (partida.saque) {
        const angulo = Math.atan2(-blanca.x + (Math.random() - 0.5) * 0.3, PIE - blanca.z);
        return { lugar, angulo, fuerza: 0.92 + Math.random() * 0.08, ex: 0, ey: 0.2 };
    }

    const obj = objetivo(partida, bolas, partida.turno);
    const situacion = { partida, bolas };
    const opciones = [];
    const probar = (angulo, fuerza, ex, ey) => {
        fuerza = Math.min(Math.max(fuerza, 0.08), 1);
        const nota = puntuar(situacion, simular(bolas, angulo, fuerza, ex, ey));
        opciones.push({ angulo, fuerza, ex, ey, nota });
    };

    for (const tiro of tirosDirectos(bolas, blanca.x, blanca.z, obj).slice(0, cfg.candidatos))
        for (const f of cfg.fuerzas) for (const [ex, ey] of cfg.efectos) probar(tiro.angulo, tiro.fuerza * f, ex, ey);

    // sin tiro claro: barrido de ángulos buscando al menos un toque legal o una carambola afortunada
    if (!opciones.some((o) => o.nota > 0)) {
        const pasos = estado.nivel === "facil" ? 24 : 72;
        for (let i = 0; i < pasos && Date.now() - t0 < 3000; i++) {
            const angulo = (i / pasos) * 2 * Math.PI;
            for (const f of [0.35, 0.6]) probar(angulo, f, 0, 0.2);
        }
    }

    opciones.sort((a, b) => b.nota - a.nota);
    const elegida = opciones[Math.floor(Math.random() * Math.min(cfg.entre, opciones.length))] || { angulo: 0, fuerza: 0.5, ex: 0, ey: 0 };
    return {
        lugar,
        angulo: elegida.angulo + (gauss() * cfg.ruido * Math.PI) / 180,
        fuerza: Math.min(Math.max(elegida.fuerza * (1 + gauss() * cfg.ruidoFuerza), 0.05), 1),
        ex: elegida.ex,
        ey: elegida.ey,
    };
}

if (typeof importScripts === "function") onmessage = (e) => postMessage(planCPU(e.data));
if (typeof module !== "undefined") module.exports = { planCPU };
