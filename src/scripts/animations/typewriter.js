export function typewriterReveal(el, text, speed = 75) {
    el.textContent = '';
    const chars = text.split('');
    chars.forEach((char, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.animationDelay = `${i * speed}ms`;
        el.appendChild(span);
    });
}
