export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
}

export function qs(selector, root = document) {
    return root.querySelector(selector);
}

export function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

export function createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
}

export function debounce(fn, delay) {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
