document.addEventListener('DOMContentLoaded', () => {
    async function fetchGreeting() {
        try {
            const response = await fetch('https://vexa-ai.pages.dev/query?q=Give me a casual greet message like Hello, how\'s your day - nothing but the greet message, include no other text' + ' BUT MAKE IT RANDOM/PERSONAL AND INCLIUDE ZERO FORMATTING');
            if (!response.ok) throw new Error('Failed to fetch greeting');
            const data = await response.json();
            return data.success ? data.response : 'Welcome!';
        } catch (error) {
            console.error('Error fetching greeting:', error);
            return 'Welcome!';
        }
    }

    function typewriterReveal(el, text, speed = 35) {
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

    async function updateHeroTitle() {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            const greeting = await fetchGreeting();
            typewriterReveal(heroTitle, greeting);
        }
    }

    updateHeroTitle();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            updateHeroTitle();
        }
    });

    function animateCount(el, target, duration = 1800) {
        const start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            el.textContent = current.toLocaleString() + '+';
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = target.toLocaleString() + '+';
            }
        }
        requestAnimationFrame(tick);
    }

    const userCountEl = document.getElementById('user-count');
    if (userCountEl) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCount(userCountEl, 100000);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.5 });
        observer.observe(userCountEl);
    }

    const discordIcon = document.querySelector('.discord-copy-icon-brand');
    if (discordIcon) {
        discordIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('https://discord.gg/e52GujVvbN', '_blank', 'noopener,noreferrer');
        });
    }

    function createscriptCard(script) {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.style.cursor = 'pointer';

        card.innerHTML = `
        <div class="script-image">
            <img src="${script.image}" alt="${script.title}">
        </div>
        <h3 class="script-title">
            ${script.title}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </h3>
        <p class="script-desc">${script.description}</p>
    `;

        card.addEventListener('click', async () => {
            const rawLink = script.links?.[0]?.href || '';
            const link = `loadstring(game:HttpGet("${rawLink}"))()`;

            try {
                await navigator.clipboard.writeText(link);
            } catch (error) {
                const temp = document.createElement('textarea');
                temp.value = link;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
            const desc = card.querySelector('.script-desc');
            if (desc) {
                const original = desc.textContent;
                desc.textContent = 'Copied to clipboard!';
                setTimeout(() => {
                    desc.textContent = original;
                }, 1800);
            }
        });

        return card;
    }

    async function loadscripts() {
        try {
            const response = await fetch('src/utils/scripts.json');
            if (!response.ok) throw new Error();
            const scripts = await response.json();
            const grid = document.getElementById('scripts-grid');
            grid.innerHTML = '';
            scripts.forEach((script) => {
                grid.appendChild(createscriptCard(script));
            });
        } catch (error) {
            const grid = document.getElementById('scripts-grid');
            if (grid) {
                grid.innerHTML = '<p style="color: var(--muted)">scripts unavailable.</p>';
            }
        }
    }

    loadscripts();

    function initials(name) {
        return name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    function buildTestimonialCard(t) {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        const avatar = t.avatar
            ? `<img src="${t.avatar}" alt="">`
            : initials(t.name || '?');
        card.innerHTML = `
            <div class="testimonial-top">
                <div class="testimonial-user">
                    <div class="testimonial-avatar">${avatar}</div>
                    <div class="testimonial-names">
                        <span class="testimonial-name">${t.name}</span>
                        <span class="testimonial-handle">${t.handle || ''}</span>
                    </div>
                </div>
            </div>
            <p class="testimonial-text">${t.text}</p>
        `;
        return card;
    }

    function fillMarqueeTrack(trackEl, reviews) {
        trackEl.innerHTML = '';
        if (!reviews.length) return;

        const minSetsForCoverage = Math.max(1, Math.ceil((window.innerWidth * 3) / (reviews.length * 260)));

        for (let i = 0; i < minSetsForCoverage; i++) {
            reviews.forEach((t) => trackEl.appendChild(buildTestimonialCard(t)));
        }

        const firstHalf = Array.from(trackEl.children).map((c) => c.cloneNode(true));
        firstHalf.forEach((c) => trackEl.appendChild(c));
    }

    async function loadTestimonials() {
        const track1 = document.getElementById('marquee-track-1');
        const track2 = document.getElementById('marquee-track-2');
        const avgEl = document.getElementById('avg-rating');
        if (!track1 || !track2) return;

        try {
            const response = await fetch('src/utils/reviews.json');
            if (!response.ok) throw new Error();
            const reviews = await response.json();
            if (!Array.isArray(reviews) || reviews.length === 0) throw new Error();

            const mid = Math.ceil(reviews.length / 2);
            const rowA = reviews.slice(0, mid);
            const rowB = reviews.slice(mid);

            fillMarqueeTrack(track1, rowA.length ? rowA : reviews);
            fillMarqueeTrack(track2, rowB.length ? rowB : reviews);

            if (avgEl) {
                const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
                avgEl.textContent = (total / reviews.length).toFixed(2);
            }
        } catch (error) {
            const wrap = document.querySelector('.marquee-wrap');
            if (wrap) {
                wrap.innerHTML = '<p style="color: var(--muted); text-align:center; width:100%">reviews unavailable.</p>';
            }
        }
    }

    loadTestimonials();

    const DISCORD_LINK = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/Soluna-Development/API/refs/heads/main/src/Loader.lua"))()';

    const copyBtn = document.getElementById('copy-discord-btn');
    const copyLabel = document.getElementById('copy-discord-label');
    const copyIcon = document.getElementById('copy-discord-icon');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(DISCORD_LINK);
            } catch (error) {
                const temp = document.createElement('textarea');
                temp.value = DISCORD_LINK;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
            if (copyLabel) {
                const original = copyLabel.textContent;
                copyLabel.textContent = 'Copied!';
                setTimeout(() => {
                    copyLabel.textContent = original;
                }, 1800);
            }
            if (copyIcon) {
                copyIcon.classList.add('copied');
                setTimeout(() => {
                    copyIcon.classList.remove('copied');
                }, 1800);
            }
        });
    }

    const faqs = [
        { q: 'Are the scripts keyless and free?', a: 'Yes, all our scripts are completely free and do not require any keys or subscriptions.' },
        { q: 'Where can I report bugs and suggest features?', a: 'Head over to our Discord server — there is a dedicated support server, there you can create a ticket.' },
        { q: 'Does this work on mobile?', a: 'Yes, our scripts are built and tested to work with mobile-compatible executors although some scripts including Aimbot which requires mouse input may not work on mobile.' },
        { q: "I can't close the GUI. How can I fix it?", a: 'Try using the designated toggle keybind, it should appear in any settings tab, or config menu.' },
        { q: 'What games are supported?', a: 'Check the Our Scripts section above — each card lists the games that script currently supports.' },
        { q: 'How do I review the script?', a: 'You can leave a review through our Discord server once you have used the script. Or by leaving a comment on Rscripts in any of our scripts here: https://rscripts.net/@endoverdosing' },
        { q: 'Do we provide executor support?', a: 'No, we do not provide executor support. We only provide support for our scripts. Please contact the executors dedicated server.' },
    ];

    function renderFAQ() {
        const list = document.getElementById('faq-list');
        if (!list) return;
        list.innerHTML = '';

        faqs.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = 'faq-item';
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
            const question = el.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const isOpen = el.classList.contains('open');
                list.querySelectorAll('.faq-item.open').forEach((openEl) => {
                    openEl.classList.remove('open');
                    openEl.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                });
                if (!isOpen) {
                    el.classList.add('open');
                    question.setAttribute('aria-expanded', 'true');
                }
            });
            list.appendChild(el);
        });
    }

    renderFAQ();
});