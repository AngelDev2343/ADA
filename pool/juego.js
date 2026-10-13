const $ = (id) => document.getElementById(id);
const JUGADOR = 0;
const CPU = 1;
const COLORES = { 1: "#f2c500", 2: "#1f4fd1", 3: "#d42a2a", 4: "#5b2a8c", 5: "#f07800", 6: "#178a3a", 7: "#7d1d1d", 8: "#111" };

const opciones = { nivel: "normal", saque: "tu" };
try {
    Object.assign(opciones, JSON.parse(localStorage.getItem("pool-opciones")));
} catch {}
let vista = localStorage.getItem("pool-vista") === "libre" ? "libre" : "superior";

// ---------- Escena ----------

const contenedor = $("vista3d");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.gammaInput = renderer.gammaOutput = true;
contenedor.appendChild(renderer.domElement);
const lienzo = renderer.domElement;

const escena = new THREE.Scene();
escena.background = new THREE.CubeTextureLoader()
    .setPath("img/skybox/clouds/")
    .load(["posx.jpg", "negx.jpg", "posy.jpg", "negy.jpg", "posz.jpg", "negz.jpg"]);
const camara = new THREE.PerspectiveCamera(45, 1, 0.1, 20000);
const cargador = new THREE.TextureLoader();

escena.add(new THREE.AmbientLight(0xfff4e0, 0.35));
const luzSol = new THREE.DirectionalLight(0xffffff, 0.35);
luzSol.position.set(-10, 30, 30);
escena.add(luzSol);
for (const z of [-7, 7]) {
    const foco = new THREE.SpotLight(0xfff1d6, 0.85, 60, 0.85, 0.6, 1);
    foco.position.set(0, 16, z);
    foco.target.position.set(0, 0, z);
    foco.castShadow = true;
    foco.shadow.mapSize.set(1024, 1024);
    foco.shadow.camera.near = 6;
    foco.shadow.camera.far = 30;
    escena.add(foco, foco.target);
}

function textura(url, repeticion) {
    const mapa = cargador.load(url);
    mapa.wrapS = mapa.wrapT = THREE.RepeatWrapping;
    mapa.repeat.set(repeticion, repeticion);
    return mapa;
}

function modelo(url, material, proyecta) {
    new THREE.OBJLoader().load(url, (objeto) => {
        objeto.traverse((hijo) => {
            if (!(hijo instanceof THREE.Mesh)) return;
            hijo.material = material;
            hijo.castShadow = proyecta;
            hijo.receiveShadow = true;
        });
        escena.add(objeto);
    });
}

const pano = new THREE.MeshPhongMaterial({ map: textura("img/textures/cloth©.jpg", 2), shininess: 2 });
const madera = new THREE.MeshPhongMaterial({ map: textura("img/textures/wood©.jpg", 30), shininess: 30 });
modelo("obj/table/floor.obj", pano, false);
modelo("obj/table/woodwalls.obj", madera, true);
modelo("obj/table/legs.obj", new THREE.MeshPhongMaterial({ map: textura("img/textures/wood©.jpg", 10), shininess: 30 }), true);

// bandas de paño: mismos contornos que la física, extruidos hacia abajo
(() => {
    const contorno = (...p) => new THREE.Shape(p.reverse().map(([x, y]) => new THREE.Vector2(x, y)));
    const formas = [
        contorno([6, -13.85], [-6, -13.85], [-5.625, -13.5], [5.625, -13.5]),
        contorno([-6, 13.85], [-5.625, 13.5], [5.625, 13.5], [6, 13.85]),
        contorno([7.1, 12.75], [6.75, 12.5], [6.75, 0.75], [7.1, 0.7]),
        contorno([7.1, -12.75], [7.1, -0.7], [6.75, -0.75], [6.75, -12.5]),
        contorno([-7.1, -12.75], [-6.75, -12.5], [-6.75, -0.75], [-7.1, -0.7]),
        contorno([-7.1, 12.75], [-7.1, 0.7], [-6.75, 0.75], [-6.75, 12.5]),
    ];
    const mapa = textura("img/textures/cloth©.jpg", 0.15);
    const geo = new THREE.ExtrudeGeometry(formas, { amount: 0.5, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, steps: 1 });
    const bandas = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: mapa, shininess: 2 }));
    bandas.rotateX(Math.PI / 2);
    bandas.position.y = 0.5;
    bandas.castShadow = bandas.receiveShadow = true;
    escena.add(bandas);
})();

const suelo = new THREE.Mesh(new THREE.BoxGeometry(90, 150, 100), new THREE.MeshPhongMaterial({ map: textura("img/textures/floorwood©.jpg", 15) }));
suelo.rotateX(-Math.PI / 2);
suelo.position.y = -7.788 - 50;
suelo.receiveShadow = true;
escena.add(suelo);

const geoBola = new THREE.SphereGeometry(R, 32, 24);
const mallas = {};
for (let n = 0; n <= 15; n++) {
    const material = new THREE.MeshPhongMaterial(
        n === 0 ? { color: 0xf8f6ee, shininess: 80, specular: 0x555555 } : { map: cargador.load(`img/textures/balls/${n}.png`), shininess: 80, specular: 0x555555 }
    );
    const malla = new THREE.Mesh(geoBola, material);
    malla.castShadow = true;
    escena.add(malla);
    mallas[n] = malla;
}

// taco: punta blanca, caña clara y mango oscuro, apuntando hacia +z local
const taco = new THREE.Group();
const tacoInclinado = new THREE.Group();
tacoInclinado.rotation.x = 0.07;
taco.add(tacoInclinado);
const tacoCuerpo = new THREE.Group();
tacoInclinado.add(tacoCuerpo);
[
    [0.055, 0.058, 0.15, 0xf4f1e8, 0],
    [0.058, 0.085, 9.5, 0xe2bd84, 0.15],
    [0.085, 0.11, 5, 0x3a2416, 9.65],
].forEach(([arriba, abajo, largo, color, desde]) => {
    const pieza = new THREE.Mesh(new THREE.CylinderGeometry(arriba, abajo, largo, 20), new THREE.MeshPhongMaterial({ color, shininess: 60 }));
    pieza.rotation.x = Math.PI / 2;
    pieza.position.z = -(desde + largo / 2);
    pieza.castShadow = true;
    tacoCuerpo.add(pieza);
});
escena.add(taco);

// guía de tiro: tramos planos sobre el paño (las líneas de WebGL siempre miden 1px)
const materialGuia = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
const geoTramo = new THREE.PlaneGeometry(1, 0.05);
geoTramo.rotateX(-Math.PI / 2);
const tramos = [0, 1, 2].map(() => {
    const t = new THREE.Mesh(geoTramo, materialGuia);
    escena.add(t);
    return t;
});
const geoAnillo = new THREE.RingGeometry(R * 0.86, R, 40);
geoAnillo.rotateX(-Math.PI / 2);
const anillo = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
escena.add(anillo);

function tramo(malla, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const largo = Math.hypot(dx, dz);
    malla.visible = largo > 0.01;
    malla.position.set((ax + bx) / 2, 0.02, (az + bz) / 2);
    malla.rotation.y = Math.atan2(-dz, dx);
    malla.scale.x = largo;
}

// ---------- Sonido ----------

let audio = null;
const sonidos = {};
function iniciarAudio() {
    if (audio) return;
    audio = new AudioContext();
    for (const nombre of ["hit", "pocket"])
        fetch(`sound/${nombre}.mp3`)
            .then((r) => r.arrayBuffer())
            .then((datos) => audio.decodeAudioData(datos))
            .then((buffer) => (sonidos[nombre] = buffer))
            .catch(() => {});
}
const ultimoSonido = {};
function sonar(nombre, volumen, velocidad = 1, clave = nombre) {
    if (!audio || !sonidos[nombre] || volumen < 0.02) return;
    const ahora = audio.currentTime;
    if (ultimoSonido[clave] && ahora - ultimoSonido[clave] < 0.025) return;
    ultimoSonido[clave] = ahora;
    const fuente = audio.createBufferSource();
    const ganancia = audio.createGain();
    fuente.buffer = sonidos[nombre];
    fuente.playbackRate.value = velocidad;
    ganancia.gain.value = Math.min(volumen, 1);
    fuente.connect(ganancia).connect(audio.destination);
    fuente.start();
}

// ---------- Estado ----------

let bolas = [];
let partida = null;
let enMano = null;
let fase = "inicio";
let antes = null;
let eventos = null;
let angulo = 0;
let fuerza = 0;
let efecto = { x: 0, y: 0 };
let golpe = null;
let partidaId = 0;
let acumulado = 0;
const cayendo = {};
const TIEMPO_TIRO = 30;
let reloj = TIEMPO_TIRO;

const bolaN = (n) => bolas.find((b) => b.n === n);
const blanca = () => bolas[0];
const turnoHumano = () => partida && partida.turno === JUGADOR;

function nuevaPartida() {
    partidaId++;
    bolas = nuevaMesa();
    const quien = opciones.saque === "azar" ? (Math.random() < 0.5 ? JUGADOR : CPU) : opciones.saque === "cpu" ? CPU : JUGADOR;
    partida = { turno: quien, grupos: [null, null], saque: true };
    enMano = "cocina";
    angulo = 0;
    efecto = { x: 0, y: 0 };
    pintarEfecto();
    for (const n in cayendo) delete cayendo[n];
    for (const n in mallas) {
        mallas[n].visible = true;
        mallas[n].scale.set(1, 1, 1);
        mallas[n].quaternion.setFromAxisAngle(new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(), Math.random() * 6);
    }
    $("inicio").hidden = $("fin").hidden = $("pausa").hidden = true;
    empezarTurno();
}

function empezarTurno() {
    fuerza = 0;
    golpe = null;
    reloj = TIEMPO_TIRO;
    pintarFuerza();
    pintarMarcador();
    if (vista === "libre") orbita.yaw = angulo + Math.PI;
    if (partida.saque) aviso(turnoHumano() ? "Te toca sacar" : "Saca la CPU");
    else aviso(turnoHumano() ? (enMano ? "Tu turno, bola en mano" : "Tu turno") : "Turno de la CPU");
    if (turnoHumano()) {
        fase = enMano ? "colocar" : "apuntar";
        if (enMano && !posicionValida(bolas, blanca().x, blanca().z, enMano === "cocina")) {
            const p = lugarLibre(bolas, 0, enMano === "cocina" ? COCINA - 2.25 : -MESA.z / 2);
            blanca().x = p.x;
            blanca().z = p.z;
        }
    } else {
        fase = "cpu";
        turnoCPU();
    }
    pintarControles();
}

function tirar() {
    if (fase !== "apuntar" && fase !== "cpu") return;
    iniciarAudio();
    antes = copiar(bolas);
    eventos = nuevosEventos();
    golpe = { t: 0, retroceso: 0.15 + fuerza * 3, fuerza, angulo, ex: efecto.x, ey: efecto.y, saque: partida.saque };
    fase = "golpe";
    enMano = null;
    pintarControles();
}

function finTiro() {
    const r = arbitrar(partida, antes, eventos);
    const quien = partida.turno;
    const habiaGrupo = !!partida.grupos[quien];
    partida.grupos = r.grupos;
    partida.saque = false;

    if (r.reponer8) {
        const p = lugarLibre(bolas, 0, PIE, 8);
        Object.assign(bolaN(8), { activa: true, x: p.x, z: p.z });
        delete cayendo[8];
        mallas[8].visible = true;
        mallas[8].scale.set(1, 1, 1);
    }
    if (r.fin) return terminar(r, quien);

    if (!blanca().activa) {
        Object.assign(blanca(), { activa: true, x: 0, z: COCINA - 2.25, vx: 0, vz: 0, wx: 0, wz: 0, e: 0 });
        delete cayendo[0];
        mallas[0].visible = true;
        mallas[0].scale.set(1, 1, 1);
    }

    if (r.falta) {
        partida.turno = 1 - quien;
        enMano = "mesa";
        noticia(`Falta: ${r.falta.charAt(0).toLowerCase() + r.falta.slice(1)}. Bola en mano para ${partida.turno === JUGADOR ? "ti" : "la CPU"}`, true);
    } else {
        if (!r.sigue) partida.turno = 1 - quien;
        if (!habiaGrupo && r.grupos[quien]) noticia(`Tú juegas con las ${r.grupos[JUGADOR]}`);
        else if (turnoHumano() && objetivo(partida, bolas, JUGADOR) === "negra") noticia("Ya solo te queda la bola 8");
        else if (r.sigue && quien === JUGADOR) noticia("Bien, sigues tirando");
    }
    empezarTurno();
}

function bip(frecuencia) {
    if (!audio) return;
    const osc = audio.createOscillator();
    const ganancia = audio.createGain();
    const t = audio.currentTime;
    osc.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0.06, t);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(ganancia).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.12);
}

function contarTiempo(dt) {
    const el = $("tiempo");
    const corre = turnoHumano() && (fase === "apuntar" || fase === "colocar");
    el.classList.toggle("activo", corre);
    if (!corre || !$("pausa").hidden) return;
    const antes = Math.ceil(reloj);
    reloj -= dt;
    if (Math.ceil(reloj) !== antes && antes <= 5 && reloj > 0) bip(880);
    el.classList.toggle("poco", reloj <= 10);
    el.firstChild.style.width = `${Math.max(reloj / TIEMPO_TIRO, 0) * 100}%`;
    if (reloj <= 0) tiempoAgotado();
}

function tiempoAgotado() {
    bip(440);
    carga = null;
    cargaTeclado = false;
    arrastre = null;
    partida.turno = CPU;
    enMano = partida.saque ? "cocina" : null;
    noticia("Se acabó tu tiempo. Turno de la CPU", true);
    empezarTurno();
}

function terminar(r, quien) {
    fase = "fin";
    pintarMarcador();
    pintarControles();
    const gane = r.ganador === JUGADOR;
    aviso(gane ? "¡Ganaste!" : "Ganó la CPU");
    noticia(r.motivo, !gane);
    const id = partidaId;
    setTimeout(() => {
        if (id !== partidaId) return;
        $("finTitulo").textContent = gane ? "GANASTE" : "PERDISTE";
        $("finTitulo").className = gane ? "" : "pierde";
        const sujeto = quien === JUGADOR ? "Metiste" : "La CPU metió";
        const como = r.ganador === quien ? (quien === JUGADOR ? "después de meter todas tus bolas" : "después de meter todas sus bolas") : r.motivo.includes("falta") ? "con falta" : "antes de tiempo";
        $("finInfo").textContent = `${sujeto} la bola 8 ${como}.`;
        $("fin").hidden = false;
    }, 1400);
}

// ---------- CPU ----------

let trabajador = null;
try {
    trabajador = new Worker("cpu.js");
} catch {}

function pedirPlan(estado) {
    return new Promise((listo) => {
        if (!trabajador) return listo(planCPU(estado));
        const local = () => {
            trabajador?.terminate();
            trabajador = null;
            listo(planCPU(estado));
        };
        const limite = setTimeout(local, 8000);
        trabajador.onmessage = (e) => {
            clearTimeout(limite);
            listo(e.data);
        };
        trabajador.onerror = () => {
            clearTimeout(limite);
            local();
        };
        trabajador.postMessage(estado);
    });
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const suave = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

function animar(ms, paso) {
    return new Promise((ok) => {
        const inicio = performance.now();
        const cuadro = (ahora) => {
            const k = Math.min((ahora - inicio) / ms, 1);
            paso(suave(k));
            k < 1 ? requestAnimationFrame(cuadro) : ok();
        };
        requestAnimationFrame(cuadro);
    });
}

async function turnoCPU() {
    const id = partidaId;
    const sigue = () => id === partidaId && fase === "cpu";
    const inicio = performance.now();
    $("estado").textContent = "La CPU está pensando...";
    const plan = await pedirPlan({ bolas: copiar(bolas), partida: { ...partida, grupos: [...partida.grupos] }, enMano, nivel: opciones.nivel });
    await esperar(Math.max(0, 900 - (performance.now() - inicio)));
    if (!sigue()) return;
    aviso(partida.saque ? "Saca la CPU" : "Turno de la CPU");

    if (plan.lugar) {
        const { x, z } = blanca();
        await animar(500, (k) => {
            blanca().x = x + (plan.lugar.x - x) * k;
            blanca().z = z + (plan.lugar.z - z) * k;
        });
        enMano = null;
        if (!sigue()) return;
    }
    let giro = plan.angulo - angulo;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    const desde = angulo;
    const ex = efecto.x;
    const ey = efecto.y;
    await animar(600 + Math.abs(giro) * 250, (k) => {
        angulo = desde + giro * k;
        efecto = { x: ex + (plan.ex - ex) * k, y: ey + (plan.ey - ey) * k };
        pintarEfecto();
    });
    if (!sigue()) return;
    await esperar(250);
    await animar(500, (k) => {
        fuerza = plan.fuerza * k;
        pintarFuerza();
    });
    await esperar(200);
    if (sigue()) tirar();
}

// ---------- Cámara ----------

const orbita = { yaw: Math.PI, pitch: 0.42, dist: 15, mira: new THREE.Vector3() };
const camPos = new THREE.Vector3(0, 40, 0);
const camMira = new THREE.Vector3();
const camArriba = new THREE.Vector3(1, 0, 0);

function camaraDeseada() {
    if (vista === "superior") {
        const tan = Math.tan((camara.fov * Math.PI) / 360);
        const ancho = camara.aspect >= 1;
        // margen para el marcador arriba y los controles a los lados
        const alto = ancho ? Math.max(8.1 / 0.74 / tan, 15 / 0.8 / (tan * camara.aspect)) : Math.max(15 / 0.8 / tan, 8.1 / 0.86 / (tan * camara.aspect));
        return { pos: new THREE.Vector3(0, alto, 0), mira: new THREE.Vector3(0, 0, 0), arriba: ancho ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1) };
    }
    if (fase !== "rodando" && fase !== "golpe" && blanca()) orbita.mira.set(blanca().x, 0, blanca().z);
    const { yaw, pitch, dist, mira } = orbita;
    const pos = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(mira);
    return { pos, mira: mira.clone(), arriba: new THREE.Vector3(0, 1, 0) };
}

function moverCamara(dt) {
    const d = camaraDeseada();
    const k = 1 - Math.exp(-dt * 7);
    camPos.lerp(d.pos, k);
    camMira.lerp(d.mira, k);
    camArriba.lerp(d.arriba, k).normalize();
    camara.position.copy(camPos);
    camara.up.copy(camArriba);
    camara.lookAt(camMira);
}

function cambiarVista(nueva) {
    vista = nueva;
    localStorage.setItem("pool-vista", vista);
    if (vista === "libre") orbita.yaw = angulo + Math.PI;
    document.querySelectorAll("#vistas button").forEach((b) => b.classList.toggle("on", b.dataset.vista === vista));
    pintarControles();
}

function redimensionar() {
    renderer.setSize(innerWidth, innerHeight);
    camara.aspect = innerWidth / innerHeight;
    camara.updateProjectionMatrix();
}
addEventListener("resize", redimensionar);

// ---------- Cuadro a cuadro ----------

const ejeY = new THREE.Vector3(0, 1, 0);
const giroTmp = new THREE.Quaternion();
const ejeTmp = new THREE.Vector3();

function actualizarBolas(dt) {
    for (const b of bolas) {
        const malla = mallas[b.n];
        const caida = cayendo[b.n];
        if (caida) {
            caida.t += dt;
            const k = Math.min(caida.t / 0.35, 1);
            malla.position.set(caida.x + (caida.tx - caida.x) * k, R - 0.9 * k * k, caida.z + (caida.tz - caida.z) * k);
            malla.scale.setScalar(1 - 0.4 * k);
            if (k >= 1) malla.visible = false;
            continue;
        }
        if (!b.activa) continue;
        malla.position.set(b.x, R, b.z);
        const w = Math.hypot(b.wx, b.wz);
        if (w > 1e-4) {
            ejeTmp.set(b.wz / w, 0, -b.wx / w);
            giroTmp.setFromAxisAngle(ejeTmp, (w * dt) / R);
            malla.quaternion.multiplyQuaternions(giroTmp, malla.quaternion);
        }
        if (b.e) {
            giroTmp.setFromAxisAngle(ejeY, (b.e * dt) / R);
            malla.quaternion.multiplyQuaternions(giroTmp, malla.quaternion);
        }
    }
}

function procesarSonidos() {
    for (const s of eventos.sonidos) {
        if (s.tipo === "bola") sonar("hit", s.v / 22, 0.95 + Math.random() * 0.15, "bola");
        else if (s.tipo === "banda") sonar("hit", s.v / 45, 0.55, "banda");
        else if (s.tipo === "tronera") {
            const b = bolaN(s.n);
            const t = TRONERAS[s.tronera];
            cayendo[s.n] = { t: 0, x: b.x, z: b.z, tx: t.x, tz: t.z };
            sonar("pocket", 0.7, 1, "tronera" + s.n);
        }
    }
    eventos.sonidos.length = 0;
}

// primera bola que tocaría la blanca siguiendo la línea de tiro, o la banda
function trazarGuia() {
    const c = blanca();
    const dx = Math.sin(angulo);
    const dz = Math.cos(angulo);
    let t = Infinity;
    let golpeada = null;
    for (const b of bolas) {
        if (!b.activa || b.n === 0) continue;
        const ox = b.x - c.x;
        const oz = b.z - c.z;
        const proy = ox * dx + oz * dz;
        if (proy <= 0) continue;
        const lado2 = ox * ox + oz * oz - proy * proy;
        if (lado2 >= 4 * R * R) continue;
        const tb = proy - Math.sqrt(4 * R * R - lado2);
        if (tb < t) {
            t = tb;
            golpeada = b;
        }
    }
    const lx = MESA.x - R;
    const lz = MESA.z - R;
    const tBanda = Math.min(dx ? ((dx > 0 ? lx : -lx) - c.x) / dx : Infinity, dz ? ((dz > 0 ? lz : -lz) - c.z) / dz : Infinity);
    if (tBanda < t) {
        t = Math.max(tBanda, 0);
        golpeada = null;
    }
    return { gx: c.x + dx * t, gz: c.z + dz * t, golpeada, dx, dz };
}

function actualizarTacoYGuia() {
    const apuntando = fase === "apuntar" || fase === "cpu" || fase === "golpe";
    const c = blanca();
    taco.visible = apuntando && c && c.activa;
    const guia = apuntando && fase !== "golpe" && turnoHumano();
    tramos.forEach((t) => (t.visible = false));
    anillo.visible = false;
    if (!taco.visible) return;

    let retroceso = 0.15 + fuerza * 3;
    if (golpe) retroceso = golpe.retroceso * Math.max(0, 1 - golpe.t / 0.08);
    taco.position.set(c.x, R, c.z);
    taco.rotation.y = angulo;
    tacoCuerpo.position.set(-efecto.x * R * 0.55, efecto.y * R * 0.55, -(R + retroceso));

    if (!guia) return;
    const g = trazarGuia();
    tramo(tramos[0], c.x, c.z, g.gx, g.gz);
    anillo.visible = true;
    anillo.position.set(g.gx, 0.02, g.gz);
    const valida = !g.golpeada || esLegal(objetivo(partida, bolas, JUGADOR), g.golpeada.n) || partida.saque;
    anillo.material.color.set(valida ? 0xffffff : 0xff4a4a);
    if (g.golpeada) {
        const nx = (g.golpeada.x - g.gx) / (2 * R);
        const nz = (g.golpeada.z - g.gz) / (2 * R);
        const corte = g.dx * nx + g.dz * nz;
        const largo = 1 + 3.5 * corte;
        tramo(tramos[1], g.golpeada.x, g.golpeada.z, g.golpeada.x + nx * largo, g.golpeada.z + nz * largo);
        const tx = g.dx - corte * nx;
        const tz = g.dz - corte * nz;
        tramo(tramos[2], g.gx, g.gz, g.gx + tx * 3, g.gz + tz * 3);
    }
}

let anterior = performance.now();
function cuadro(ahora) {
    const dt = Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;

    if (fase === "golpe") {
        golpe.t += dt;
        if (golpe.t >= 0.08) {
            golpear(bolas, golpe.angulo, golpe.fuerza, golpe.ex, golpe.ey, golpe.saque);
            sonar("hit", 0.25 + golpe.fuerza * 0.6, 1.3, "taco");
            fase = "rodando";
            fuerza = 0;
            pintarFuerza();
            acumulado = 0;
        }
    } else if (fase === "rodando") {
        acumulado += dt;
        while (acumulado >= DT) {
            paso(bolas, eventos);
            acumulado -= DT;
        }
        procesarSonidos();
        if (!enMovimiento(bolas)) {
            golpe = null;
            finTiro();
        }
    }
    if (cargaTeclado && fase === "apuntar") {
        fuerza = Math.min(1, fuerza + dt * 0.6);
        pintarFuerza();
    }

    contarTiempo(dt);
    actualizarBolas(dt);
    actualizarTacoYGuia();
    moverCamara(dt);
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
}

// ---------- Interfaz ----------

function aviso(texto) {
    $("estado").textContent = texto;
}

let tiempoNoticia;
function noticia(texto, falta = false) {
    const el = $("noticia");
    el.textContent = texto;
    el.classList.toggle("falta", falta);
    el.classList.add("ver");
    clearTimeout(tiempoNoticia);
    tiempoNoticia = setTimeout(() => el.classList.remove("ver"), 3200);
}

function nombreGrupo(g) {
    return g === "lisas" ? "LISAS" : g === "rayadas" ? "RAYADAS" : "";
}

function pintarMarcador() {
    if (!partida) return;
    [JUGADOR, CPU].forEach((j) => {
        const tarjeta = $("j" + j);
        tarjeta.classList.toggle("turno", partida.turno === j && fase !== "fin");
        const g = partida.grupos[j];
        tarjeta.querySelector(".grupo").textContent = g ? nombreGrupo(g) : "MESA ABIERTA";
        const numeros = g === "lisas" ? [1, 2, 3, 4, 5, 6, 7, 8] : g === "rayadas" ? [9, 10, 11, 12, 13, 14, 15, 8] : [];
        const contenido = g
            ? numeros.map((n) => {
                  const fuera = !bolaN(n).activa || cayendo[n];
                  return `<span class="mini${n > 8 ? " rayada" : ""}${fuera ? " fuera" : ""}" style="--c:${COLORES[n > 8 ? n - 8 : n]}"><span>${n}</span></span>`;
              })
            : Array(8).fill('<span class="mini vacia"></span>');
        tarjeta.querySelector(".bolas").innerHTML = contenido.join("");
    });
}

function pintarFuerza() {
    $("fuerza").querySelector(".relleno").style.height = `${fuerza * 100}%`;
}

function pintarEfecto() {
    $("punto").style.left = `${50 + efecto.x * 40}%`;
    $("punto").style.top = `${50 - efecto.y * 40}%`;
}

function pintarControles() {
    const mio = turnoHumano() && fase === "apuntar";
    for (const id of ["fuerza", "rueda", "efecto"]) $(id).classList.toggle("off", !mio);
    contenedor.className = turnoHumano() && fase === "colocar" ? "mano" : mio ? "apunta" : "";
    let ayuda = "";
    if (turnoHumano() && fase === "colocar") ayuda = enMano === "cocina" ? "Clic para colocar la blanca detrás de la línea" : "Clic para colocar la blanca";
    else if (mio) ayuda = "Arrastra para apuntar · Baja la barra para tirar";
    if (ayuda && vista === "libre") ayuda += " · Clic derecho para girar la cámara";
    mostrarAyuda(ayuda);
}

// la ayuda aparece al empezar cada paso y se desvanece sola para no tapar la mesa
let tiempoAyuda;
function mostrarAyuda(texto) {
    const el = $("ayuda");
    if (el.textContent === texto && !el.classList.contains("oculta")) return;
    el.textContent = texto;
    el.classList.toggle("oculta", !texto);
    clearTimeout(tiempoAyuda);
    if (texto) tiempoAyuda = setTimeout(() => el.classList.add("oculta"), 5000);
}

// punto de la mesa bajo el cursor, a la altura del centro de las bolas
const rayo = new THREE.Raycaster();
const planoBolas = new THREE.Plane(new THREE.Vector3(0, 1, 0), -R);
function puntoMesa(e) {
    const caja = lienzo.getBoundingClientRect();
    rayo.setFromCamera(new THREE.Vector2(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1), camara);
    return rayo.ray.intersectPlane(planoBolas);
}

function apuntarA(p) {
    const c = blanca();
    if (Math.hypot(p.x - c.x, p.z - c.z) > 0.05) angulo = Math.atan2(p.x - c.x, p.z - c.z);
}

function moverBlanca(p) {
    const x = Math.min(Math.max(p.x, -MESA.x + R), MESA.x - R);
    const z = Math.min(Math.max(p.z, -MESA.z + R), enMano === "cocina" ? COCINA : MESA.z - R);
    if (posicionValida(bolas, x, z, enMano === "cocina")) {
        blanca().x = x;
        blanca().z = z;
    }
}

let arrastre = null;
lienzo.addEventListener("contextmenu", (e) => e.preventDefault());
lienzo.addEventListener("pointerdown", (e) => {
    iniciarAudio();
    if (e.button === 2 || e.button === 1) {
        if (vista === "libre") arrastre = { tipo: "orbita", x: e.clientX, y: e.clientY };
        return;
    }
    if (e.button !== 0 || !turnoHumano()) return;
    const p = puntoMesa(e);
    if (!p) return;
    if (fase === "colocar") {
        moverBlanca(p);
        if (e.pointerType !== "mouse") arrastre = { tipo: "blanca" };
        else {
            fase = "apuntar";
            pintarControles();
        }
    } else if (fase === "apuntar") {
        if (enMano && Math.hypot(p.x - blanca().x, p.z - blanca().z) < R * 1.6) {
            fase = "colocar";
            arrastre = { tipo: "blanca" };
        } else {
            arrastre = { tipo: "apuntar" };
            apuntarA(p);
        }
    } else return;
    lienzo.setPointerCapture(e.pointerId);
});
lienzo.addEventListener("pointermove", (e) => {
    if (arrastre?.tipo === "orbita") {
        orbita.yaw -= (e.clientX - arrastre.x) * 0.006;
        orbita.pitch = Math.min(Math.max(orbita.pitch + (e.clientY - arrastre.y) * 0.004, 0.08), 1.45);
        arrastre.x = e.clientX;
        arrastre.y = e.clientY;
        return;
    }
    if (!turnoHumano()) return;
    const p = (arrastre || fase === "colocar") && puntoMesa(e);
    if (!p) return;
    if (fase === "colocar") moverBlanca(p);
    else if (arrastre?.tipo === "apuntar") apuntarA(p);
});
lienzo.addEventListener("pointerup", () => {
    if (arrastre?.tipo === "blanca" && fase === "colocar") {
        fase = "apuntar";
        pintarControles();
    }
    arrastre = null;
});
lienzo.addEventListener(
    "wheel",
    (e) => {
        if (vista !== "libre") return;
        e.preventDefault();
        orbita.dist = Math.min(Math.max(orbita.dist * (1 + e.deltaY * 0.001), 4), 45);
    },
    { passive: false }
);

// barra de fuerza: se baja arrastrando y al soltar se tira
let carga = null;
const barra = $("fuerza");
barra.addEventListener("pointerdown", (e) => {
    if (fase !== "apuntar" || !turnoHumano()) return;
    iniciarAudio();
    carga = { y: e.clientY, alto: barra.clientHeight * 0.85 };
    barra.setPointerCapture(e.pointerId);
});
barra.addEventListener("pointermove", (e) => {
    if (!carga) return;
    fuerza = Math.min(Math.max((e.clientY - carga.y) / carga.alto, 0), 1);
    pintarFuerza();
});
barra.addEventListener("pointerup", () => {
    if (!carga) return;
    carga = null;
    if (fuerza > 0.02) tirar();
    else {
        fuerza = 0;
        pintarFuerza();
    }
});

// rueda de ajuste fino: mueve el taco mucho más despacio que arrastrar sobre la mesa
const rueda = $("rueda");
let giroRueda = null;
let posRueda = 0;
function girarRueda(px) {
    angulo -= px * 0.0012;
    posRueda += px;
    rueda.style.backgroundPosition = `0 0, 0 ${posRueda}px`;
}
rueda.addEventListener("pointerdown", (e) => {
    giroRueda = e.clientY;
    rueda.setPointerCapture(e.pointerId);
});
rueda.addEventListener("pointermove", (e) => {
    if (giroRueda === null) return;
    girarRueda(e.clientY - giroRueda);
    giroRueda = e.clientY;
});
rueda.addEventListener("pointerup", () => (giroRueda = null));
rueda.addEventListener(
    "wheel",
    (e) => {
        e.preventDefault();
        if (fase === "apuntar" && turnoHumano()) girarRueda(Math.sign(e.deltaY) * 2);
    },
    { passive: false }
);

// punto de efecto: dónde golpea el taco a la blanca
const bolaEfecto = $("efecto");
let tocandoEfecto = false;
function fijarEfecto(e) {
    const caja = bolaEfecto.getBoundingClientRect();
    let x = (e.clientX - caja.left - caja.width / 2) / (caja.width * 0.4);
    let y = -(e.clientY - caja.top - caja.height / 2) / (caja.height * 0.4);
    const d = Math.hypot(x, y);
    if (d > 1) {
        x /= d;
        y /= d;
    }
    if (d < 0.12) x = y = 0;
    efecto = { x, y };
    pintarEfecto();
}
bolaEfecto.addEventListener("pointerdown", (e) => {
    tocandoEfecto = true;
    bolaEfecto.setPointerCapture(e.pointerId);
    fijarEfecto(e);
});
bolaEfecto.addEventListener("pointermove", (e) => tocandoEfecto && fijarEfecto(e));
bolaEfecto.addEventListener("pointerup", () => (tocandoEfecto = false));
bolaEfecto.addEventListener("dblclick", () => {
    efecto = { x: 0, y: 0 };
    pintarEfecto();
});

let cargaTeclado = false;
addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (fase !== "inicio" && fase !== "fin") $("pausa").hidden = !$("pausa").hidden;
        return;
    }
    if (!$("inicio").hidden || !$("pausa").hidden || !$("fin").hidden) return;
    if (e.key === "v" || e.key === "V") cambiarVista(vista === "superior" ? "libre" : "superior");
    if (fase !== "apuntar" || !turnoHumano()) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        angulo += (e.key === "ArrowLeft" ? 1 : -1) * (e.shiftKey ? 0.0015 : 0.012);
    } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        iniciarAudio();
        cargaTeclado = true;
    }
});
addEventListener("keyup", (e) => {
    if (e.key !== " " || !cargaTeclado) return;
    cargaTeclado = false;
    if (fase === "apuntar" && fuerza > 0.02) tirar();
});

document.querySelectorAll("#vistas button").forEach((b) => b.addEventListener("click", () => cambiarVista(b.dataset.vista)));
$("menuBtn").addEventListener("click", () => ($("pausa").hidden = false));
$("seguirBtn").addEventListener("click", () => ($("pausa").hidden = true));
$("nuevaBtn").addEventListener("click", mostrarInicio);
$("opcionesBtn").addEventListener("click", mostrarInicio);
$("otraBtn").addEventListener("click", nuevaPartida);
$("jugarBtn").addEventListener("click", () => {
    iniciarAudio();
    nuevaPartida();
});

function mostrarInicio() {
    partidaId++;
    fase = "inicio";
    $("pausa").hidden = $("fin").hidden = true;
    $("inicio").hidden = false;
}

document.querySelectorAll(".elegir").forEach((grupo) => {
    const pintar = () => grupo.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.valor === opciones[grupo.dataset.opcion]));
    grupo.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => {
            opciones[grupo.dataset.opcion] = b.dataset.valor;
            localStorage.setItem("pool-opciones", JSON.stringify(opciones));
            pintar();
        })
    );
    pintar();
});

// mesa de fondo detrás del menú inicial
bolas = nuevaMesa();
partida = { turno: JUGADOR, grupos: [null, null], saque: true };
fase = "inicio";
cambiarVista(vista);
pintarMarcador();
pintarControles();
redimensionar();
requestAnimationFrame(cuadro);
