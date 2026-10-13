// Motor de ajedrez: reglas completas y CPU (negamax con poda alfa-beta).
// Tablero de 64 casillas, índice 0 = a8 y 63 = h1. Mayúsculas = blancas, minúsculas = negras, "." = vacía.

const INICIO = "rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR";

const DIRS = {
    n: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
    b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
};
DIRS.q = DIRS.k = [...DIRS.b, ...DIRS.r];

const ENROQUE_TORRE = { 62: [63, 61], 58: [56, 59], 6: [7, 5], 2: [0, 3] };
const PIERDE_ENROQUE = { 60: "KQ", 63: "K", 56: "Q", 4: "kq", 7: "k", 0: "q" };

const colorDe = (p) => (p === "." ? null : p === p.toUpperCase() ? "w" : "b");
const rival = (lado) => (lado === "w" ? "b" : "w");
const deLado = (p, lado) => (lado === "w" ? p.toUpperCase() : p);

function nuevaPartida() {
    return { board: INICIO.split(""), turn: "w", castling: "KQkq", ep: -1, half: 0 };
}

function atacada(b, sq, por) {
    const r = sq >> 3, c = sq & 7;
    const en = (rr, cc) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : null);
    const pr = por === "w" ? r + 1 : r - 1;
    const peon = deLado("p", por);
    if (en(pr, c - 1) === peon || en(pr, c + 1) === peon) return true;
    for (const [dr, dc] of DIRS.n) if (en(r + dr, c + dc) === deLado("n", por)) return true;
    for (const [dr, dc] of DIRS.k) if (en(r + dr, c + dc) === deLado("k", por)) return true;
    for (const [dr, dc] of DIRS.q) {
        let rr = r + dr, cc = c + dc, q;
        while ((q = en(rr, cc)) === ".") (rr += dr), (cc += dc);
        if (q && (q === deLado("q", por) || q === deLado(dr && dc ? "b" : "r", por))) return true;
    }
    return false;
}

function enJaque(s, lado) {
    return atacada(s.board, s.board.indexOf(deLado("k", lado)), rival(lado));
}

function movimientosBrutos(s, soloCapturas = false) {
    const b = s.board, lado = s.turn, moves = [];
    for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (colorDe(p) !== lado) continue;
        const r = i >> 3, c = i & 7, t = p.toLowerCase();

        if (t === "p") {
            const dir = lado === "w" ? -1 : 1, f = i + dir * 8;
            const corona = (f >> 3) === (lado === "w" ? 0 : 7);
            const add = (to, extra) => {
                if (corona) for (const promo of "qnrb") moves.push({ from: i, to, promo, ...extra });
                else moves.push({ from: i, to, ...extra });
            };
            if (b[f] === "." && (!soloCapturas || corona)) {
                add(f);
                if (!soloCapturas && r === (lado === "w" ? 6 : 1) && b[f + dir * 8] === ".") moves.push({ from: i, to: f + dir * 8, double: true });
            }
            for (const dc of [-1, 1]) {
                if (c + dc < 0 || c + dc > 7) continue;
                const to = f + dc;
                if (colorDe(b[to]) === rival(lado)) add(to);
                else if (to === s.ep) moves.push({ from: i, to, ep: true });
            }
            continue;
        }

        const desliza = t !== "n" && t !== "k";
        for (const [dr, dc] of DIRS[t]) {
            let rr = r + dr, cc = c + dc;
            while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                const to = rr * 8 + cc, q = b[to];
                if (q === ".") {
                    if (!soloCapturas) moves.push({ from: i, to });
                } else {
                    if (colorDe(q) !== lado) moves.push({ from: i, to });
                    break;
                }
                if (!desliza) break;
                rr += dr;
                cc += dc;
            }
        }

        if (t === "k" && !soloCapturas) {
            const enemigo = rival(lado);
            const libre = (...sqs) => sqs.every((x) => b[x] === ".");
            const segura = (...sqs) => sqs.every((x) => !atacada(b, x, enemigo));
            const [K, Q, home] = lado === "w" ? ["K", "Q", 60] : ["k", "q", 4];
            if (i === home && s.castling.includes(K) && b[home + 3] === deLado("r", lado) && libre(home + 1, home + 2) && segura(home, home + 1, home + 2))
                moves.push({ from: i, to: home + 2, castle: true });
            if (i === home && s.castling.includes(Q) && b[home - 4] === deLado("r", lado) && libre(home - 1, home - 2, home - 3) && segura(home, home - 1, home - 2))
                moves.push({ from: i, to: home - 2, castle: true });
        }
    }
    return moves;
}

function jugar(s, m) {
    const b = s.board.slice(), lado = s.turn, p = b[m.from];
    const sqCaptura = m.ep ? m.to + (lado === "w" ? 8 : -8) : m.to;
    const captured = b[sqCaptura];
    b[sqCaptura] = ".";
    b[m.to] = m.promo ? deLado(m.promo, lado) : p;
    b[m.from] = ".";
    if (m.castle) {
        const [rf, rt] = ENROQUE_TORRE[m.to];
        b[rt] = b[rf];
        b[rf] = ".";
    }
    const pierde = (PIERDE_ENROQUE[m.from] || "") + (PIERDE_ENROQUE[m.to] || "");
    return {
        board: b,
        turn: rival(lado),
        castling: [...s.castling].filter((ch) => !pierde.includes(ch)).join(""),
        ep: m.double ? (m.from + m.to) / 2 : -1,
        half: p.toLowerCase() === "p" || captured !== "." ? 0 : s.half + 1,
        captured,
    };
}

function movimientosLegales(s) {
    return movimientosBrutos(s).filter((m) => !enJaque(jugar(s, m), s.turn));
}

function clave(s) {
    return s.board.join("") + s.turn + s.castling + s.ep;
}

function materialInsuficiente(b) {
    const piezas = b.filter((p) => p !== "." && p.toLowerCase() !== "k");
    return piezas.length === 0 || (piezas.length === 1 && "nb".includes(piezas[0].toLowerCase()));
}

// Devuelve null si la partida sigue, o { ganador: "w" | "b" | null, motivo }.
function resultado(s, repeticiones = 0) {
    if (movimientosLegales(s).length === 0)
        return enJaque(s, s.turn) ? { ganador: rival(s.turn), motivo: "Jaque mate" } : { ganador: null, motivo: "Rey ahogado" };
    if (repeticiones >= 3) return { ganador: null, motivo: "Triple repetición" };
    if (s.half >= 100) return { ganador: null, motivo: "Regla de los 50 movimientos" };
    if (materialInsuficiente(s.board)) return { ganador: null, motivo: "Material insuficiente" };
    return null;
}

// ---------- CPU ----------

const VALOR = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

const TABLAS = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    kFinal: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
};

const MATE = 100000;

function evaluar(s) {
    const b = s.board;
    let piezasMayores = 0;
    for (const p of b) if (p !== "." && !"pk".includes(p.toLowerCase())) piezasMayores += VALOR[p.toLowerCase()];
    const final = piezasMayores <= 2600;
    let total = 0;
    for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (p === ".") continue;
        const t = p.toLowerCase(), blanca = p !== t;
        const tabla = t === "k" && final ? TABLAS.kFinal : TABLAS[t];
        const v = VALOR[t] + tabla[blanca ? i : i ^ 56];
        total += blanca ? v : -v;
    }
    return s.turn === "w" ? total : -total;
}

function ordenar(s, moves) {
    const puntaje = (m) => {
        const victima = s.board[m.to];
        let v = victima !== "." ? 10 * VALOR[victima.toLowerCase()] - VALOR[s.board[m.from].toLowerCase()] : 0;
        if (m.promo) v += VALOR[m.promo] * 10;
        return v;
    };
    return moves.sort((a, b) => puntaje(b) - puntaje(a));
}

function quietud(s, alfa, beta, prof) {
    const base = evaluar(s);
    if (prof === 0 || base >= beta) return base;
    if (base > alfa) alfa = base;
    for (const m of ordenar(s, movimientosBrutos(s, true))) {
        const sig = jugar(s, m);
        if (enJaque(sig, s.turn)) continue;
        const v = -quietud(sig, -beta, -alfa, prof - 1);
        if (v >= beta) return v;
        if (v > alfa) alfa = v;
    }
    return alfa;
}

let limite = Infinity;
let nodos = 0;
const AGOTADO = {};

function negamax(s, prof, alfa, beta, ply, conQuietud) {
    if ((++nodos & 1023) === 0 && Date.now() > limite) throw AGOTADO;
    if (s.half >= 100) return 0;
    if (prof === 0) return conQuietud ? quietud(s, alfa, beta, 4) : evaluar(s);
    let legales = 0;
    for (const m of ordenar(s, movimientosBrutos(s))) {
        const sig = jugar(s, m);
        if (enJaque(sig, s.turn)) continue;
        legales++;
        const v = -negamax(sig, prof - 1, -beta, -alfa, ply + 1, conQuietud);
        if (v >= beta) return v;
        if (v > alfa) alfa = v;
    }
    if (legales === 0) return enJaque(s, s.turn) ? -MATE + ply : 0;
    return alfa;
}

const NIVELES = {
    facil: { prof: 1, quietud: false, ruido: 150 },
    normal: { prof: 2, quietud: true, ruido: 30 },
    dificil: { prof: 4, quietud: true, ruido: 0 },
};

function buscar(s, moves, prof, q, ruido) {
    let mejor = null, mejorValor = -Infinity;
    for (const m of moves) {
        // ninguna jugada por debajo de (mejor - ruido) puede superarla, así que se poda con esa cota
        const v = -negamax(jugar(s, m), prof - 1, -Infinity, -(mejorValor - ruido), 1, q) + Math.random() * ruido;
        if (v > mejorValor) (mejorValor = v), (mejor = m);
    }
    return mejor;
}

// profundiza de a una jugada; si se acaba el tiempo, usa la última búsqueda completa
function mejorMovimiento(s, nivel, tiempo = 1500) {
    const { prof, quietud: q, ruido } = NIVELES[nivel];
    const moves = ordenar(s, movimientosLegales(s).sort(() => Math.random() - 0.5));
    let mejor = moves[0];
    limite = Date.now() + tiempo;
    try {
        for (let p = 1; p <= prof; p++) {
            mejor = buscar(s, moves, p, q, ruido);
            moves.splice(moves.indexOf(mejor), 1);
            moves.unshift(mejor);
        }
    } catch (e) {
        if (e !== AGOTADO) throw e;
    }
    limite = Infinity;
    return mejor;
}
