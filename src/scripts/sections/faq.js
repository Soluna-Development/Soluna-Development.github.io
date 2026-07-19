import { FAQ_ITEMS } from '../config/faq-data.js';
import { createFaqItem } from '../components/faq-item.js';
import { observeReveals } from '../animations/reveal-observer.js';

export function initFaqSection() {
    const list = document.getElementById('faq-list');
    if (!list) return;

    list.innerHTML = '';
    FAQ_ITEMS.forEach((item) => {
        list.appendChild(createFaqItem(item, list));
    });

    observeReveals(list);
}
