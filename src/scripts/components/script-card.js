import { copyToClipboard, flashFeedback } from '../utils/clipboard.js';
import { extractGlowColors } from '../utils/color-extract.js';
import { createElement, qs } from '../utils/dom.js';
import { COPY_FEEDBACK_DURATION_MS } from '../config/constants.js';

function buildLoaderSnippet(script) {
    const rawLink = script.links?.[0]?.href || '';
    return `loadstring(game:HttpGet("${rawLink}"))()`;
}

function attachGlow(card, img) {
    extractGlowColors(img).then((colors) => {
        if (!colors) return;
        card.style.setProperty('--glow-a', colors.a);
        card.style.setProperty('--glow-b', colors.b);
        card.classList.add('glow-ready');
    });
}

function attachCopyHandler(card, script) {
    card.addEventListener('click', async () => {
        const snippet = buildLoaderSnippet(script);
        await copyToClipboard(snippet);
        const desc = qs('.script-desc', card);
        if (desc) flashFeedback(desc, 'Copied to clipboard!', COPY_FEEDBACK_DURATION_MS);
    });
}

export function createScriptCard(script) {
    const card = createElement('div', 'script-card');
    card.innerHTML = `
        <div class="script-glow"></div>
        <div class="script-image">
            <img src="${script.image}" alt="${script.title}" crossorigin="anonymous" loading="lazy">
        </div>
        <h3 class="script-title">
            ${script.title}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </h3>
        <p class="script-desc">${script.description}</p>
    `;

    attachGlow(card, qs('.script-image img', card));
    attachCopyHandler(card, script);

    return card;
}
