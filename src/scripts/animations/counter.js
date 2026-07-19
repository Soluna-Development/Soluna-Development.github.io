export function animateCount(el, target, duration = 1800) {
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        el.textContent = `${current.toLocaleString()}+`;
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.textContent = `${target.toLocaleString()}+`;
        }
    }

    requestAnimationFrame(tick);
}

export function animateCountOnVisible(el, target, threshold = 0.5) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCount(el, target);
                    observer.disconnect();
                }
            });
        },
        { threshold }
    );
    observer.observe(el);
}
