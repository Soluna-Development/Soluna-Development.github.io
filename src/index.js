document.addEventListener('DOMContentLoaded', () => {
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function initFluidByteField() {
        const canvas = document.getElementById('hero-byte-overlay');
        if (!canvas || prefersReducedMotion()) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const container = canvas.parentElement ?? canvas;
        const cellSize = 20;
        const fontSize = 12;
        const dt = 1 / 30;
        const fadeRate = 0.6;
        const maxAlpha = 0.5;
        const advectScale = 0.5;
        const splashRadiusPx = 28;
        const splashForce = 0.5;
        const splashDye = 1.5;
        const diffusionIterations = 3;
        const projectIterations = 4;
        const velocityDamp = 0.1;
        const dyeDamp = 0.1;
        const trailLifetime = 184;
        const trailRadiusPx = 100;
        const trailMaxLen = 240;
        const trailEase = 2.5;
        const trailStrength = 3;
        const trailForceDecay = 1.2;
        const trailWobble = 0.14;
        const trailWobbleDecay = 2;
        const dragThresholdPx = 12;
        const maxTrailPoints = 24;

        let cols = 0, rows = 0, width = 0, height = 0;
        let velX = new Float32Array(0);
        let velY = new Float32Array(0);
        let dye = new Float32Array(0);
        let velX0 = new Float32Array(0);
        let velY0 = new Float32Array(0);
        let dye0 = new Float32Array(0);
        let glyphs = new Uint8Array(0);

        let lastPointerX = -9999, lastPointerY = -9999;
        let lastPointerTime = 0;
        let rafId = 0, lastFrameTime = 0, accumulator = 0;
        let running = true;

        const trails = [];
        let dragStartX = 0, dragStartY = 0, dragging = false;

        const smoothstep = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

        function resize() {
            const rect = container.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = Math.max(1, Math.round(rect.width));
            height = Math.max(1, Math.round(rect.height));
            cols = Math.max(3, Math.ceil(width / cellSize));
            rows = Math.max(3, Math.ceil(height / cellSize));
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const size = cols * rows;
            velX = new Float32Array(size);
            velY = new Float32Array(size);
            dye = new Float32Array(size);
            velX0 = new Float32Array(size);
            velY0 = new Float32Array(size);
            dye0 = new Float32Array(size);
            glyphs = new Uint8Array(size);
            for (let i = 0; i < size; i++) glyphs[i] = Math.random() < 0.5 ? 0 : 1;
        }

        function setBoundary(field) {
            for (let x = 0; x < cols; x++) {
                field[x] = field[x + cols];
                field[x + (rows - 1) * cols] = field[x + (rows - 2) * cols];
            }
            for (let y = 0; y < rows; y++) {
                field[y * cols] = field[y * cols + 1];
                field[y * cols + cols - 1] = field[y * cols + cols - 2];
            }
        }

        function diffuse(field, fieldPrev, diffusion) {
            const a = diffusion * dt;
            const denom = 1 / (1 + 4 * a);
            for (let iter = 0; iter < diffusionIterations; iter++) {
                for (let y = 1; y < rows - 1; y++) {
                    for (let x = 1; x < cols - 1; x++) {
                        const idx = x + y * cols;
                        field[idx] = (fieldPrev[idx] + a * (field[idx - 1] + field[idx + 1] + field[idx - cols] + field[idx + cols])) * denom;
                    }
                }
                setBoundary(field);
            }
        }

        function project(vx, vy, p, div) {
            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    const idx = x + y * cols;
                    div[idx] = -0.5 * (vx[idx + 1] - vx[idx - 1] + vy[idx + cols] - vy[idx - cols]);
                    p[idx] = 0;
                }
            }
            setBoundary(div);
            setBoundary(p);
            for (let iter = 0; iter < projectIterations; iter++) {
                for (let y = 1; y < rows - 1; y++) {
                    for (let x = 1; x < cols - 1; x++) {
                        const idx = x + y * cols;
                        p[idx] = (div[idx] + p[idx - 1] + p[idx + 1] + p[idx - cols] + p[idx + cols]) * 0.25;
                    }
                }
                setBoundary(p);
            }
            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    const idx = x + y * cols;
                    vx[idx] -= 0.5 * (p[idx + 1] - p[idx - 1]);
                    vy[idx] -= 0.5 * (p[idx + cols] - p[idx - cols]);
                }
            }
            setBoundary(vx);
            setBoundary(vy);
        }

        function advect(field, fieldPrev, vx, vy, damp) {
            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    const idx = x + y * cols;
                    let px = x - dt * vx[idx];
                    let py = y - dt * vy[idx];
                    px = px < 0.5 ? 0.5 : px > cols - 1.5 ? cols - 1.5 : px;
                    py = py < 0.5 ? 0.5 : py > rows - 1.5 ? rows - 1.5 : py;
                    const x0 = px | 0, x1 = x0 + 1;
                    const y0 = py | 0, y1 = y0 + 1;
                    const sx1 = px - x0, sx0 = 1 - sx1;
                    const sy1 = py - y0, sy0 = 1 - sy1;
                    field[idx] = (sx0 * (sy0 * fieldPrev[x0 + y0 * cols] + sy1 * fieldPrev[x0 + y1 * cols])
                        + sx1 * (sy0 * fieldPrev[x1 + y0 * cols] + sy1 * fieldPrev[x1 + y1 * cols])) * damp;
                }
            }
            setBoundary(field);
        }

        function splash(cellX, cellY, forceX, forceY, dyeAmount, radiusCells) {
            const rSq = radiusCells * radiusCells;
            const xMin = Math.max(1, Math.floor(cellX - radiusCells));
            const xMax = Math.min(cols - 2, Math.ceil(cellX + radiusCells));
            const yMin = Math.max(1, Math.floor(cellY - radiusCells));
            const yMax = Math.min(rows - 2, Math.ceil(cellY + radiusCells));
            for (let y = yMin; y <= yMax; y++) {
                for (let x = xMin; x <= xMax; x++) {
                    const dx = x - cellX, dy = y - cellY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > rSq) continue;
                    const falloff = smoothstep(1 - Math.sqrt(distSq) / radiusCells);
                    const idx = x + y * cols;
                    velX[idx] += forceX * falloff;
                    velY[idx] += forceY * falloff;
                    dye[idx] = Math.min(1.2, dye[idx] + dyeAmount * falloff);
                    if (Math.random() < 0.04 * falloff) glyphs[idx] = glyphs[idx] ? 0 : 1;
                }
            }
        }

        function onPointerMove(e) {
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            if (cols > 0 && lastPointerX > -9000 && px >= 0 && py >= 0 && px <= rect.width && py <= rect.height) {
                const elapsed = Math.min(0.05, Math.max(0.001, (e.timeStamp - lastPointerTime) / 1000));
                const fx = (px - lastPointerX) / cellSize / elapsed * advectScale;
                const fy = (py - lastPointerY) / cellSize / elapsed * advectScale;
                splash(px / cellSize, py / cellSize, fx, fy, splashForce, splashRadiusPx / cellSize);
            }
            lastPointerX = px;
            lastPointerY = py;
            lastPointerTime = e.timeStamp;
        }

        function onPointerLeave() {
            lastPointerX = -9999;
            lastPointerY = -9999;
        }

        function onPointerDown(e) {
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            dragStartX = px;
            dragStartY = py;
            dragging = px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;
        }

        function onPointerUp(e) {
            if (!dragging) return;
            dragging = false;
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            if (Math.hypot(px - dragStartX, py - dragStartY) > dragThresholdPx) return;
            trails.push({ x: px, y: py, age: 0, seed: Math.random() * Math.PI * 2 });
            if (trails.length > maxTrailPoints) trails.shift();
        }

        function applyTrails() {
            if (!trails.length) return;
            const lifetimeSec = trailLifetime / 1000;
            const cellsPerRadius = trailRadiusPx / cellSize;
            for (let i = trails.length - 1; i >= 0; i--) {
                const trail = trails[i];
                trail.age += dt;
                const progress = trail.age / lifetimeSec;
                if (progress >= 1) {
                    trails.splice(i, 1);
                    continue;
                }
                const eased = 1 - Math.pow(1 - progress, trailEase);
                const ringRadius = eased * trailRadiusPx / cellSize;
                const remaining = 1 - progress;
                const intensity = 0.35 + 0.65 * eased;
                const force = trailStrength * Math.pow(remaining, trailForceDecay);
                const dyeAmount = 0.12 * Math.pow(remaining, 2);
                const cx = trail.x / cellSize, cy = trail.y / cellSize;
                const seed = trail.seed;
                const band = ringRadius * 1.3 + cellsPerRadius;
                const xMin = Math.max(1, Math.floor(cx - band));
                const xMax = Math.min(cols - 2, Math.ceil(cx + band));
                const yMin = Math.max(1, Math.floor(cy - band));
                const yMax = Math.min(rows - 2, Math.ceil(cy + band));
                for (let y = yMin; y <= yMax; y++) {
                    for (let x = xMin; x <= xMax; x++) {
                        const dx = x - cx, dy = y - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx);
                        const wobble = 0.5 * Math.sin(6 * angle + seed) + 0.25 * Math.sin(3 * angle + 0.05 * dist + 0.3 * seed) + 0.5;
                        const wobbleAmount = trailWobble * (2 * wobble - 1) * intensity;
                        const targetRadius = ringRadius * Math.min(1.6, Math.max(0.6, 1 + wobbleAmount));
                        const ringDist = Math.abs(dist - targetRadius) / cellsPerRadius;
                        if (ringDist >= 1) continue;
                        const falloff = smoothstep(1 - ringDist);
                        const forceMul = Math.min(2.2, Math.max(0.4, 1 + wobbleAmount));
                        const invDist = dist > 0.001 ? 1 / dist : 0;
                        const idx = x + y * cols;
                        velX[idx] += dx * invDist * force * forceMul * falloff;
                        velY[idx] += dy * invDist * force * forceMul * falloff;
                        dye[idx] = Math.min(1.5, dye[idx] + dyeAmount * forceMul * falloff);
                        if (Math.random() < 0.03 * falloff) glyphs[idx] = glyphs[idx] ? 0 : 1;
                    }
                }
            }
        }

        function step() {
            applyTrails();
            const visc = 1.5 * dt;
            velX0.set(velX);
            diffuse(velX, velX0, visc);
            velY0.set(velY);
            diffuse(velY, velY0, visc);
            project(velX, velY, velX0, velY0);
            velX0.set(velX);
            velY0.set(velY);
            const velDamp = 1 / (1 + dt * velocityDamp);
            advect(velX, velX0, velX0, velY0, velDamp);
            advect(velY, velY0, velX0, velY0, velDamp);
            project(velX, velY, velX0, velY0);
            dye0.set(dye);
            diffuse(dye, dye0, visc * dt);
            dye0.set(dye);
            advect(dye, dye0, velX, velY, 1 / (1 + dt * dyeDamp));
        }

        function render() {
            ctx.clearRect(0, 0, width, height);
            ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#eef2ff';
            const half = cellSize / 2;
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = x + y * cols;
                    const d = dye[idx];
                    if (d <= 0.02) continue;
                    const alpha = d * fadeRate;
                    ctx.globalAlpha = alpha < maxAlpha ? alpha : maxAlpha;
                    ctx.fillText(glyphs[idx] ? '1' : '0', x * cellSize + half, y * cellSize + half);
                }
            }
            ctx.globalAlpha = 1;
        }

        function frame(now) {
            if (!running) return;
            rafId = requestAnimationFrame(frame);
            const delta = lastFrameTime ? (now - lastFrameTime) / 1000 : dt;
            lastFrameTime = now;
            accumulator += Math.min(delta, 0.1);
            let steps = 0;
            while (accumulator >= dt && steps < 3) {
                step();
                accumulator -= dt;
                steps++;
            }
            if (steps === 0) return;
            render();
        }

        function onVisibilityChange() {
            running = !document.hidden;
            if (running) {
                lastFrameTime = 0;
                accumulator = 0;
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(frame);
            }
        }

        new ResizeObserver(resize).observe(container);
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerleave', onPointerLeave);
        window.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });
        document.addEventListener('visibilitychange', onVisibilityChange);

        resize();
        rafId = requestAnimationFrame(frame);
    }

    if (!window.matchMedia('(max-width: 768px)').matches) {
        initFluidByteField();
    }

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    function observeReveals(root = document) {
        root.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
    }

    observeReveals();
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

    function typewriterReveal(el, text, speed = 75) {
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
            // const greeting = await fetchGreeting();
            const greeting = "Soluna Development";
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

    const DISCORD_INVITE_CODE = 'e52GujVvbN';

    async function loadDiscordStats() {
        const membersEl = document.getElementById('stat-members');
        const onlineEl = document.getElementById('stat-online');
        const scriptsEl = document.getElementById('stat-scripts');
        if (!membersEl || !onlineEl) return;

        try {
            const response = await fetch(`https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true`);
            if (!response.ok) throw new Error();
            const data = await response.json();

            const memberCount = data.approximate_member_count || 0;
            const onlineCount = data.approximate_presence_count || 0;

            const statsGrid = document.getElementById('stats-grid');
            const onlineItem = onlineEl.closest('.stat-item');
            if (onlineItem) onlineItem.classList.add('stat-online');

            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        animateCount(membersEl, memberCount);
                        animateCount(onlineEl, onlineCount);
                        statsObserver.disconnect();
                    }
                });
            }, { threshold: 0.5 });
            if (statsGrid) statsObserver.observe(statsGrid);
        } catch (error) {
            membersEl.textContent = '—';
            onlineEl.textContent = '—';
        }
    }

    async function loadScriptCountStat() {
        const scriptsEl = document.getElementById('stat-scripts');
        if (!scriptsEl) return;
        try {
            const response = await fetch('src/utils/scripts.json');
            if (!response.ok) throw new Error();
            const scripts = await response.json();
            const count = Array.isArray(scripts) ? scripts.length : 0;

            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        animateCount(scriptsEl, count);
                        statsObserver.disconnect();
                    }
                });
            }, { threshold: 0.5 });
            statsObserver.observe(scriptsEl);
        } catch (error) {
            scriptsEl.textContent = '—';
        }
    }

    loadDiscordStats();
    loadScriptCountStat();

    const discordIcon = document.querySelector('.discord-copy-icon-brand');
    if (discordIcon) {
        discordIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('https://discord.gg/e52GujVvbN', '_blank', 'noopener,noreferrer');
        });
    }

    function extractGlowColors(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const size = 32;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const run = () => {
                try {
                    ctx.drawImage(img, 0, 0, size, size);
                    const { data } = ctx.getImageData(0, 0, size, size);
                    const buckets = [];
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                        if (a < 100) continue;
                        const max = Math.max(r, g, b), min = Math.min(r, g, b);
                        if (max - min < 12 && (max < 30 || max > 235)) continue;
                        buckets.push([r, g, b]);
                    }
                    if (!buckets.length) return resolve(null);

                    buckets.sort((p1, p2) => {
                        const s1 = Math.max(...p1) - Math.min(...p1);
                        const s2 = Math.max(...p2) - Math.min(...p2);
                        return s2 - s1;
                    });

                    const top = buckets.slice(0, Math.max(4, Math.floor(buckets.length * 0.2)));
                    const bottom = buckets.slice(-Math.max(4, Math.floor(buckets.length * 0.2)));

                    const avg = (arr) => {
                        const sum = arr.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
                        return sum.map((v) => Math.round(v / arr.length));
                    };

                    const [r1, g1, b1] = avg(top);
                    const [r2, g2, b2] = avg(bottom.length ? bottom : top);

                    resolve({
                        a: `rgba(${r1}, ${g1}, ${b1}, 0.9)`,
                        b: `rgba(${r2}, ${g2}, ${b2}, 0.9)`
                    });
                } catch (error) {
                    resolve(null);
                }
            };

            if (img.complete && img.naturalWidth) {
                run();
            } else {
                img.addEventListener('load', run, { once: true });
                img.addEventListener('error', () => resolve(null), { once: true });
            }
        });
    }

    function createscriptCard(script) {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.style.cursor = 'pointer';

        card.innerHTML = `
        <div class="script-glow"></div>
        <div class="script-image">
            <img src="${script.image}" alt="${script.title}" crossorigin="anonymous">
        </div>
        <h3 class="script-title">
            ${script.title}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </h3>
        <p class="script-desc">${script.description}</p>
    `;

        const img = card.querySelector('.script-image img');
        extractGlowColors(img).then((colors) => {
            if (colors) {
                card.style.setProperty('--glow-a', colors.a);
                card.style.setProperty('--glow-b', colors.b);
                card.classList.add('glow-ready');
            }
        });

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

    let snapObserver = null;

    function setupSnapGlow(grid) {
        if (snapObserver) snapObserver.disconnect();
        if (!window.matchMedia('(max-width: 768px)').matches) return;

        snapObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.intersectionRatio >= 0.7) {
                    entry.target.classList.add('in-snap');
                } else {
                    entry.target.classList.remove('in-snap');
                }
            });
        }, {
            root: grid,
            threshold: [0, 0.7, 1]
        });

        grid.querySelectorAll('.script-card').forEach((card) => snapObserver.observe(card));
    }

    async function loadscripts() {
        try {
            const response = await fetch('src/utils/scripts.json');
            if (!response.ok) throw new Error();
            const scripts = await response.json();
            const grid = document.getElementById('scripts-grid');
            grid.innerHTML = '';
            scripts.forEach((script) => {
                const card = createscriptCard(script);
                card.classList.add('reveal');
                grid.appendChild(card);
            });
            observeReveals(grid);
            setupSnapGlow(grid);

            let resizeTimeout = null;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => setupSnapGlow(grid), 200);
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

    const heroCopyScriptBtn = document.getElementById('hero-copy-script-btn');
    if (heroCopyScriptBtn) {
        heroCopyScriptBtn.addEventListener('click', async () => {
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
            const original = heroCopyScriptBtn.textContent;
            heroCopyScriptBtn.textContent = 'Copied!';
            setTimeout(() => {
                heroCopyScriptBtn.textContent = original;
            }, 1800);
        });
    }

    const WEAO_ENDPOINT = 'https://weao.xyz/api/status/exploits';

    function faviconFromUrl(websiteUrl) {
        try {
            const host = new URL(websiteUrl).hostname;
            return `https://favicone.com/${host}?s=64`;
        } catch (error) {
            return '';
        }
    }

    async function fetchWeaoExecutors() {
        const response = await fetch(WEAO_ENDPOINT, {
            headers: { 'User-Agent': 'WEAO-3PService' }
        });
        if (!response.ok) throw new Error('weao request failed');
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('empty weao response');

        return data
            .filter((entry) => !entry.hidden)
            .map((entry) => ({
                name: entry.title,
                image: entry.websitelink ? faviconFromUrl(entry.websitelink) : ''
            }));
    }

    async function loadExecutors() {
        const track = document.getElementById('executors-track');
        if (!track) return;

        try {
            const executors = await fetchWeaoExecutors();
            if (!Array.isArray(executors) || executors.length === 0) throw new Error();

            const buildItem = (ex) => {
                const el = document.createElement('div');
                el.className = 'executor-item';
                const avatar = ex.image
                    ? `<img src="${ex.image}" alt="" onerror="this.parentElement.innerHTML=''">`
                    : '';
                el.innerHTML = `
                    <span class="executor-avatar">${avatar}</span>
                    <span class="executor-name">${ex.name}</span>
                `;
                return el;
            };

            track.innerHTML = '';
            const uniqueExecutors = executors.filter((ex, i, arr) =>
                arr.findIndex((e) => e.name === ex.name) === i
            );
            const minSets = Math.max(2, Math.ceil((window.innerWidth * 2.5) / (uniqueExecutors.length * 180)));
            for (let i = 0; i < minSets; i++) {
                uniqueExecutors.forEach((ex) => track.appendChild(buildItem(ex)));
            }

            const baseSpeed = 0.35;
            const boostedSpeed = 2.2;
            let speed = baseSpeed;
            let targetSpeed = baseSpeed;
            let x = 0;
            let halfWidth = track.scrollWidth / 2;
            let scrollTimeout = null;

            window.addEventListener('resize', () => {
                halfWidth = track.scrollWidth / 2;
            });

            window.addEventListener('scroll', () => {
                targetSpeed = boostedSpeed;
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    targetSpeed = baseSpeed;
                }, 250);
            }, { passive: true });

            function tick() {
                speed += (targetSpeed - speed) * 0.04;
                x -= speed;
                if (Math.abs(x) >= halfWidth) x += halfWidth;
                track.style.setProperty('--marquee-x', `${x}px`);
                requestAnimationFrame(tick);
            }

            requestAnimationFrame(tick);
        } catch (error) {
            const wrap = document.querySelector('.executors-marquee-wrap');
            if (wrap) {
                wrap.innerHTML = '<p style="color: var(--muted); text-align:center; width:100%">executors unavailable.</p>';
            }
        }
    }

    loadExecutors();

    async function loadPartners() {
        const grid = document.getElementById('partners-grid');
        if (!grid) return;

        try {
            const response = await fetch('partners.json');
            if (!response.ok) throw new Error();
            const partners = await response.json();
            if (!Array.isArray(partners) || partners.length === 0) throw new Error();

            grid.innerHTML = '';
            partners.forEach((partner) => {
                const item = document.createElement('div');
                item.className = 'partner-item reveal';
                const inner = partner.link
                    ? `<a href="${partner.link}" target="_blank" rel="noopener noreferrer"><img src="${partner.logo}" alt="${partner.name}" loading="lazy"></a>`
                    : `<img src="${partner.logo}" alt="${partner.name}" loading="lazy">`;
                item.innerHTML = inner;
                grid.appendChild(item);
            });
            observeReveals(grid);
        } catch (error) {
            grid.innerHTML = '';
        }
    }

    loadPartners();

    async function loadPartners() {
        const grid = document.getElementById('partners-grid');
        if (!grid) return;

        try {
            const response = await fetch('src/utils/partners.json');
            if (!response.ok) throw new Error();
            const partners = await response.json();
            if (!Array.isArray(partners) || partners.length === 0) throw new Error();

            grid.innerHTML = '';
            partners.forEach((partner) => {
                const item = document.createElement('div');
                item.className = 'partner-item reveal';
                const inner = partner.link
                    ? `<a href="${partner.link}" target="_blank" rel="noopener noreferrer"><img src="${partner.logo}" alt="${partner.name}" loading="lazy"></a>`
                    : `<img src="${partner.logo}" alt="${partner.name}" loading="lazy">`;
                item.innerHTML = inner;
                grid.appendChild(item);
            });
            observeReveals(grid);
        } catch (error) {
            grid.innerHTML = '';
        }
    }

    loadPartners();

    function youtubeIdFromUrl(url) {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes('youtu.be')) {
                return parsed.pathname.slice(1);
            }
            if (parsed.searchParams.get('v')) {
                return parsed.searchParams.get('v');
            }
            const shortsMatch = parsed.pathname.match(/\/shorts\/([^/]+)/);
            if (shortsMatch) return shortsMatch[1];
            return null;
        } catch (error) {
            return null;
        }
    }

    async function loadShowcases() {
        const track = document.getElementById('showcase-track');
        if (!track) return;

        try {
            const response = await fetch('src/utils/showcases.json');
            if (!response.ok) throw new Error();
            const links = await response.json();
            if (!Array.isArray(links) || links.length === 0) throw new Error();

            const videos = links
                .map((url) => ({ url, id: youtubeIdFromUrl(url) }))
                .filter((v) => v.id);
            if (!videos.length) throw new Error();

            const buildItem = (video) => {
                const item = document.createElement('div');
                item.className = 'showcase-item';
                item.innerHTML = `
                    <button class="showcase-card" type="button" aria-label="Play video">
                        <img class="showcase-thumb" src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="">
                    </button>
                `;
                const img = item.querySelector('img');
                img.addEventListener('load', () => item.classList.add('loaded'));
                img.addEventListener('error', () => { item.style.display = 'none'; });
                const cardBtn = item.querySelector('.showcase-card');
                cardBtn.addEventListener('click', () => {
                    cardBtn.classList.add('clicked');
                    window.open(video.url, '_blank', 'noopener,noreferrer');
                });
                return item;
            };

            track.innerHTML = '';
            const minSets = Math.max(2, Math.ceil((window.innerWidth * 2.5) / (videos.length * 280)));
            for (let i = 0; i < minSets; i++) {
                videos.forEach((video) => track.appendChild(buildItem(video)));
            }

            const baseSpeed = 0.4;
            const boostedSpeed = 2.4;
            let speed = baseSpeed;
            let targetSpeed = baseSpeed;
            let x = 0;
            let halfWidth = track.scrollWidth / 2;
            let scrollTimeout = null;

            window.addEventListener('resize', () => {
                halfWidth = track.scrollWidth / 2;
            });

            window.addEventListener('scroll', () => {
                targetSpeed = boostedSpeed;
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    targetSpeed = baseSpeed;
                }, 250);
            }, { passive: true });

            function tick() {
                speed += (targetSpeed - speed) * 0.04;
                x -= speed;
                if (Math.abs(x) >= halfWidth) x += halfWidth;
                track.style.setProperty('--showcase-x', `${x}px`);
                requestAnimationFrame(tick);
            }

            requestAnimationFrame(tick);
        } catch (error) {
            const viewport = document.querySelector('.showcase-viewport');
            if (viewport) {
                viewport.innerHTML = '<p style="color: var(--muted); text-align:center; width:100%">showcases unavailable.</p>';
            }
        }
    }

    loadShowcases();

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
            el.className = 'faq-item reveal';
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

        observeReveals(list);
    }

    renderFAQ();
});