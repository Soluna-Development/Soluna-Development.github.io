import { getScripts } from '../services/scripts-service.js';
import { createScriptCard } from '../components/script-card.js';
import { observeReveals } from '../animations/reveal-observer.js';
import { debounce, isMobileViewport } from '../utils/dom.js';

let snapObserver = null;

function setupSnapGlow(grid) {
    if (snapObserver) snapObserver.disconnect();
    if (!isMobileViewport()) return;

    snapObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                entry.target.classList.toggle('in-snap', entry.intersectionRatio >= 0.7);
            });
        },
        { root: grid, threshold: [0, 0.7, 1] }
    );

    grid.querySelectorAll('.script-card').forEach((card) => snapObserver.observe(card));
}

export async function initScriptsSection() {
    const grid = document.getElementById('scripts-grid');
    if (!grid) return;

    try {
        const scripts = await getScripts();
        grid.innerHTML = '';
        scripts.forEach((script) => {
            const card = createScriptCard(script);
            card.classList.add('reveal');
            grid.appendChild(card);
        });
        observeReveals(grid);
        setupSnapGlow(grid);

        window.addEventListener('resize', debounce(() => setupSnapGlow(grid), 200));
    } catch (error) {
        grid.innerHTML = '<p style="color: var(--color-muted)">scripts unavailable.</p>';
    }
}
