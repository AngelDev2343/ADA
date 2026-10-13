# Angel Dev Arcade (ADA)

Angel Dev Arcade es un arcade en el navegador: un menú tipo consola desde el que se abren juegos sin instalar nada. Está pensado solo para PC y se maneja con ratón, teclado o control. En pantallas táctiles o estrechas muestra un aviso para abrirlo desde una computadora.

## Juegos

Hechos por mí:

- **Pool**: bola 8 en 3D contra la CPU, con tres niveles, efecto en la blanca, vista superior o libre y tiempo para tirar.
- **Ajedrez**: juega contra la CPU en tres niveles, con reloj opcional.
- **Zombie Invasion**: defiende el cerebro de las hordas de zombies; los disparos a la cabeza valen doble.
- **Meteor Maps**: lanza meteoritos sobre el mapa y deja tu cráter.
- **Explodes The Planet**: un solo botón y una sola misión, hacer explotar el planeta.
- **8 Ball Magic**: hazle una pregunta a la bola mágica y descubre su respuesta.

De terceros, cargados desde sus propios sitios (por iframe o abriendo su página):

- **Eaglercraft**: construye y explora, eligiendo entre la versión 26.2, la 1.12.2 o la clásica 1.8.8.
- **The Simpsons: Hit & Run**: el clásico de conducción y aventura por Springfield.
- **Street Fighter III: 3rd Strike**: peleas de arcade.
- **KOF 2002: Magic Plus II**: peleas por equipos de 3.
- **Bloody Roar**: peleas en 3D donde puedes transformarte en bestia.
- **The Simpsons Arcade**: recorre Springfield a golpes con Homero, Marge, Bart o Lisa.
- **Car Soccer**: fútbol con autos.

De terceros, con una copia incluida en este repositorio:

- **Escape Road**: huye de la policía al volante el mayor tiempo posible.
- **Fireboy & Watergirl**: resuelve el Templo del Bosque en equipo con fuego y agua.
- **Flappy Bird**: vuela entre las tuberías sin chocar.

## Aviso sobre juegos de terceros

ADA no aloja los juegos que se cargan desde otros sitios: solo los muestra dentro de un iframe o abre su página. ADA no está afiliado, patrocinado ni respaldado por los dueños de esos juegos. Todas las marcas, nombres y personajes pertenecen a sus respectivos propietarios. Las portadas de esos juegos en el menú son diseños propios hechos solo con texto y formas.

## Retirar contenido

Si eres titular de derechos y quieres que se retire algo, abre un issue en este repositorio o escríbeme a 23angelsperez@gmail.com y lo quitaré.

## El menú

- Se maneja con el ratón, el teclado o un control, como una consola.
- Cada juego tiene un botón INICIO para volver al menú, y el botón Home del control hace lo mismo.
- Video de inicio la primera vez que entras; se salta con un clic, Enter o Escape.
- Buscar: encuentra cualquier juego escribiendo su nombre.
- Álbum: una galería con capturas de cada juego.
- Tema oscuro o claro, reloj de 12 o 24 horas y otras opciones en Configuración.
- Los juegos con varias versiones te dejan elegir cuál jugar antes de abrirlos.

## Añadir un juego

1. Pon el juego en su propia carpeta, con nombre en minúsculas y guiones (por ejemplo `mi-juego/index.html`), o usa la dirección de su sitio si es externo. Para que tenga el botón INICIO, añade `<script src="../inicio.js"></script>` en su página.
2. Pon una portada cuadrada en `icons/` (512×512).
3. Añade una línea en `juegos.js`, en el lugar donde quieras que aparezca:

   ```js
   { titulo: "Mi Juego", url: "mi-juego/index.html", imagen: "icons/mi-juego.jpg", color: "#000000" },
   ```

   - `titulo`: el nombre que se ve en el menú y en Buscar.
   - `url`: la página del juego, local o externa.
   - `imagen`: la portada; si falta, se usa `color` con el título.
   - `versiones` (opcional, en lugar de `url`): lista de `{ nombre, url, nota }` para elegir versión antes de abrir.

4. Si quieres que salga en el Álbum, añade una captura en `album/` y una línea en `album.js`.

Las portadas de los juegos de terceros se generan con `node tools/portadas.js`; edita la lista `PORTADAS` de ese archivo para cambiarlas o añadir otra.

## Autor

Hecho por AngelDev2343.
