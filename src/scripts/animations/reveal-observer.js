import { REVEAL_THRESHOLD, REVEAL_ROOT_MARGIN } from '../config/constants.js';

let revealObserver = null;

function getRevealObserver() {
    if (!revealObserver) {
        revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN }
        );
    }
    return revealObserver;
}

export function observeReveals(root = document) {
    const observer = getRevealObserver();
    root.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}
