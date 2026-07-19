import { createElement, qs } from '../utils/dom.js';

function closeAllExcept(list, exceptEl) {
    list.querySelectorAll('.faq-item.open').forEach((openEl) => {
        if (openEl === exceptEl) return;
        openEl.classList.remove('open');
        qs('.faq-question', openEl).setAttribute('aria-expanded', 'false');
    });
}

export function createFaqItem(item, list) {
    const el = createElement('div', 'faq-item reveal');
    el.innerHTML = `
        <button class="faq-question" aria-expanded="false">
            <span>${item.q}</span>
            <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
            </svg>
        </button>
        <div class="faq-answer">
            <div class="faq-answer-inner">${item.a}</div>
        </div>
    `;

    const question = qs('.faq-question', el);
    question.addEventListener('click', () => {
        const isOpen = el.classList.contains('open');
        closeAllExcept(list, el);
        if (!isOpen) {
            el.classList.add('open');
            question.setAttribute('aria-expanded', 'true');
        } else {
            el.classList.remove('open');
            question.setAttribute('aria-expanded', 'false');
        }
    });

    return el;
}
