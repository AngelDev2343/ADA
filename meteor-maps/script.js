const mapContainer = document.getElementById('mapContainer');
const boomAudio = document.getElementById('boomAudio');
const SIZE = 56;

mapContainer.addEventListener('click', (e) => {
    const rect = mapContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // el meteorito entra en diagonal desde arriba a la izquierda del punto
    const startX = x - (y + SIZE) * 0.6;
    const meteorito = document.createElement('img');
    meteorito.src = 'meteorito.png';
    meteorito.className = 'meteorito';
    meteorito.style.left = startX - SIZE / 2 + 'px';
    meteorito.style.top = -SIZE + 'px';
    mapContainer.appendChild(meteorito);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        meteorito.style.transform = `translate(${x - startX}px, ${y + SIZE / 2}px) rotate(540deg)`;
    }));

    meteorito.addEventListener('transitionend', () => {
        meteorito.remove();

        boomAudio.volume = 0.3;
        boomAudio.currentTime = 0;
        boomAudio.play();

        const crater = document.createElement('img');
        crater.src = 'crater.png';
        crater.className = 'crater';
        crater.style.left = x + 'px';
        crater.style.top = y + 'px';
        mapContainer.appendChild(crater);

        const blast = document.createElement('div');
        blast.className = 'blast';
        blast.style.left = x + 'px';
        blast.style.top = y + 'px';
        blast.addEventListener('animationend', () => blast.remove());
        mapContainer.appendChild(blast);

        mapContainer.classList.remove('shake');
        void mapContainer.offsetWidth;
        mapContainer.classList.add('shake');
    }, { once: true });
});
