importScripts("motor.js");

onmessage = (e) => postMessage(mejorMovimiento(e.data.estado, e.data.nivel));
