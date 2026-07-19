export function createMarqueeLoop(track, cssVar, { baseSpeed, boostedSpeed, minSetsFor }) {
    let speed = baseSpeed;
    let targetSpeed = baseSpeed;
    let x = 0;
    let halfWidth = track.scrollWidth / 2;
    let scrollTimeout = null;

    window.addEventListener('resize', () => {
        halfWidth = track.scrollWidth / 2;
    });

    window.addEventListener(
        'scroll',
        () => {
            targetSpeed = boostedSpeed;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                targetSpeed = baseSpeed;
            }, 250);
        },
        { passive: true }
    );

    function tick() {
        speed += (targetSpeed - speed) * 0.04;
        x -= speed;
        if (Math.abs(x) >= halfWidth) x += halfWidth;
        track.style.setProperty(cssVar, `${x}px`);
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

export function populateLoopedTrack(track, items, buildItem, itemWidthPx) {
    track.innerHTML = '';
    const minSets = Math.max(2, Math.ceil((window.innerWidth * 2.5) / (items.length * itemWidthPx)));
    for (let i = 0; i < minSets; i++) {
        items.forEach((item) => track.appendChild(buildItem(item)));
    }
}
