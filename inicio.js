// Botón para volver al menú desde cualquier juego. Se incluye con <script src="../inicio.js"></script>
// Con data-lado="derecha" o "centro" cambia de lugar, para juegos que usan la esquina izquierda.
(() => {
    const menu = new URL("index.html", document.currentScript.src).href;
    const lugar = {
        derecha: "right: 10px;",
        centro: "left: 50%; transform: translateX(-50%);",
    }[document.currentScript.dataset.lado] || "left: 10px;";
    const volver = () => (location.href = menu);

    const estilo = document.createElement("style");
    estilo.textContent = `
        #ada-inicio {
            position: fixed; top: 10px; ${lugar} z-index: 2147483647; padding: 6px 10px;
            font: 12px sans-serif; color: #fff; text-decoration: none; cursor: pointer;
            background: rgba(0, 0, 0, .6); border: 1px solid rgba(255, 255, 255, .25); border-radius: 6px;
            opacity: .35; transition: opacity .2s;
        }
        #ada-inicio:hover { opacity: 1; }
    `;
    const boton = document.createElement("a");
    boton.id = "ada-inicio";
    boton.href = menu;
    boton.textContent = "INICIO";
    boton.title = "Volver al menú (botón Home del control)";

    // fuera del <body>: Minecraft reutiliza o borra lo que hay en él al arrancar
    (function vigilar() {
        if (!boton.isConnected) document.documentElement.append(estilo, boton);
        for (const pad of navigator.getGamepads?.() || []) if (pad?.buttons[16]?.pressed) return volver();
        requestAnimationFrame(vigilar);
    })();
})();
