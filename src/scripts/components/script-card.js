import { copyToClipboard, flashFeedback, flashClass } from '../utils/clipboard.js';
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
    const copyIcon = qs('.script-copy-icon', card);
    card.addEventListener('click', async () => {
        const snippet = buildLoaderSnippet(script);
        await copyToClipboard(snippet);
        if (copyIcon) flashClass(copyIcon, 'copied', COPY_FEEDBACK_DURATION_MS);
    });
}

export function createScriptCard(script) {
    const card = createElement('div', 'script-card');
    let html = `
        <div class="script-glow"></div>
        <div class="script-image">
            <img src="${script.image}" alt="${script.title}" crossorigin="anonymous">
        </div>
        <h3 class="script-title">
            ${script.title}
            <span class="script-copy-icon">
                <svg class="copy-icon" width="20px" height="20px" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M8.94605 4.99995L13.2541 4.99995C14.173 5.00498 15.0524 5.37487 15.6986 6.02825C16.3449 6.68163 16.7051 7.56497 16.7001 8.48395V12.716C16.7051 13.6349 16.3449 14.5183 15.6986 15.1717C15.0524 15.825 14.173 16.1949 13.2541 16.2H8.94605C8.02707 16.1949 7.14773 15.825 6.50148 15.1717C5.85522 14.5183 5.495 13.6349 5.50005 12.716L5.50005 8.48495C5.49473 7.5658 5.85484 6.6822 6.50112 6.0286C7.1474 5.375 8.0269 5.00498 8.94605 4.99995Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M10.1671 19H14.9371C17.4857 18.9709 19.5284 16.8816 19.5001 14.333V9.666" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
<svg class="check-icon" width="20px" height="20px" viewBox="0 -0.5 25 25" fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <g>
        <path d="M5.5 12.5L10 17L19.5 7.5"
            stroke="#ffffff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round">
        </path>
    </g>
</svg>
            </span>
        </h3>`;
    if (script.description) {
        html += `<p class="script-desc">${script.description}</p>`;
    }
    card.innerHTML = html;

    attachGlow(card, qs('.script-image img', card));
    attachCopyHandler(card, script);

    return card;
}
