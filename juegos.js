// Lista de juegos del menú. Edita, añade o quita entradas.
//   titulo: nombre que aparece sobre la portada al seleccionarla
//   url:    página que se abre al elegir el juego (vacío = juego de ejemplo)
//   imagen: portada cuadrada (ej. "img/mi-juego.jpg"); si está vacía se usa el color con el título
//   color:  color de la portada de ejemplo
//   versiones: (opcional, en lugar de url) lista de { nombre, url, nota } para elegir versión al abrir
const JUEGOS = [
    {
        titulo: "Eaglercraft",
        imagen: "icons/eaglercraft.svg",
        color: "#5b8c32",
        versiones: [
            { nombre: "26.2", url: "eaglercraft/index.html?v=26.2", nota: "Más reciente" },
            { nombre: "1.12.2", url: "eaglercraft/index.html?v=1.12.2" },
            { nombre: "1.8.8", url: "eaglercraft/index.html?v=1.8.8", nota: "Clásica" },
        ],
    },
    { titulo: "The Simpsons: Hit & Run", url: "simpsons/index.html", imagen: "icons/simpsons-hit-and-run.svg", color: "#f5c518" },
    { titulo: "Street Fighter III: 3rd Strike", url: "street-iii/index.html", imagen: "icons/street-fighter-3.svg", color: "#000000" },
    { titulo: "KOF 2002: Magic Plus II", url: "kof-2002-magic/index.html", imagen: "icons/kof-2002.svg", color: "#000000" },
    { titulo: "Bloody Roar", url: "bloody-roar/index.html", imagen: "icons/bloody-roar.svg", color: "#000000" },
    { titulo: "The Simpsons Arcade", url: "simpsons-arcade/index.html", imagen: "icons/simpsons-arcade.svg", color: "#000000" },
    { titulo: "Pool", url: "pool/index.html", imagen: "icons/pool.jpg", color: "#000000" },
    { titulo: "Ajedrez", url: "ajedrez/index.html", imagen: "icons/ajedrez.jpg", color: "#000000" },
    { titulo: "Escape Road", url: "escape-road/index.html", imagen: "icons/escape-road.svg", color: "#000000" },
    { titulo: "Car Soccer", url: "https://car-soccer.com/", imagen: "icons/car-soccer.svg", color: "#000000" },
    { titulo: "Fireboy & Watergirl", url: "fireboy-watergirl/index.html", imagen: "icons/fireboy-watergirl.svg", color: "#6b5a2a" },
    { titulo: "Flappy Bird", url: "flappy-bird/index.html", imagen: "icons/flappy-bird.svg", color: "#5ec85e" },
    { titulo: "Zombie Invasion", url: "zombie-invasion/index.html", imagen: "icons/zombie.jpg", color: "#000000" },
    { titulo: "Meteor Maps", url: "meteor-maps/index.html", imagen: "icons/meteor.jpg", color: "#000000" },
    { titulo: "Explodes The Planet", url: "explodes-the-planet/index.html", imagen: "icons/explodes.jpg", color: "#000000" },
    { titulo: "8 Ball Magic", url: "8-ball-magic/index.html", imagen: "icons/8ball.jpg", color: "#000000" },
];
