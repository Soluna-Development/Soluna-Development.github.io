import { createElement, qs } from '../utils/dom.js';
import { youtubeThumbnailUrl } from '../utils/youtube.js';

export function createShowcaseItem(video) {
    const item = createElement('div', 'showcase-item');
    item.innerHTML = `
        <button class="showcase-card" type="button" aria-label="Play video">
            <img class="showcase-thumb" src="${youtubeThumbnailUrl(video.id)}" alt="" loading="lazy">
        </button>
    `;

    const img = qs('img', item);
    img.addEventListener('load', () => item.classList.add('loaded'));
    img.addEventListener('error', () => {
        item.style.display = 'none';
    });

    const cardBtn = qs('.showcase-card', item);
    cardBtn.addEventListener('click', () => {
        cardBtn.classList.add('clicked');
        window.open(video.url, '_blank', 'noopener,noreferrer');
    });

    return item;
}
