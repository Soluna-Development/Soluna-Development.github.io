import { createElement } from '../utils/dom.js';

function initials(name) {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

export function createTestimonialCard(testimonial) {
    const card = createElement('div', 'testimonial-card');
    const avatar = testimonial.avatar
        ? `<img src="${testimonial.avatar}" alt="">`
        : initials(testimonial.name || '?');

    card.innerHTML = `
        <div class="testimonial-top">
            <div class="testimonial-user">
                <div class="testimonial-avatar">${avatar}</div>
                <div class="testimonial-names">
                    <span class="testimonial-name">${testimonial.name}</span>
                    <span class="testimonial-handle">${testimonial.handle || ''}</span>
                </div>
            </div>
        </div>
        <p class="testimonial-text">${testimonial.text}</p>
    `;

    return card;
}
