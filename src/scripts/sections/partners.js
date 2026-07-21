import { getPartners } from '../services/partners-service.js';
import { createElement } from '../utils/dom.js';
import { observeReveals } from '../animations/reveal-observer.js';

function createPartnerItem(partner) {
    const item = createElement('div', 'partner-item reveal');
    const inner = partner.link
        ? `<a href="${partner.link}" target="_blank" rel="noopener noreferrer"><img src="${partner.logo}" alt="${partner.name}" "></a>`
        : `<img src="${partner.logo}" alt="${partner.name}" ">`;
    item.innerHTML = inner;
    return item;
}

export async function initPartnersSection() {
    const grid = document.getElementById('partners-grid');
    if (!grid) return;

    try {
        const partners = await getPartners();
        grid.innerHTML = '';
        partners.forEach((partner) => grid.appendChild(createPartnerItem(partner)));
        observeReveals(grid);
    } catch (error) {
        grid.innerHTML = '';
    }
}
