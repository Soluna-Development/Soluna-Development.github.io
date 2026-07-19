import { prefersReducedMotion } from '../utils/dom.js';
import { smoothstep, diffuse, project, advect } from './fluid-solver.js';

const CELL_SIZE = 24;
const FONT_SIZE = 11;
const DT = 1 / 30;
const FADE_RATE = 0.6;
const MAX_ALPHA = 0.85;
const ADVECT_SCALE = 0.5;
const SPLASH_RADIUS_PX = 28;
const SPLASH_FORCE = 0.5;
const DIFFUSION_ITERATIONS = 3;
const PROJECT_ITERATIONS = 4;
const VELOCITY_DAMP = 0.1;
const DYE_DAMP = 0.1;
const TRAIL_LIFETIME_MS = 184;
const TRAIL_RADIUS_PX = 100;
const TRAIL_EASE = 2.5;
const TRAIL_STRENGTH = 3;
const TRAIL_FORCE_DECAY = 1.2;
const TRAIL_WOBBLE = 0.14;
const DRAG_THRESHOLD_PX = 12;
const MAX_TRAIL_POINTS = 24;

export function initFluidByteField(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement ?? canvas;
    const video = container.querySelector('.hero-atmosphere-video');
    if (video) {
        video.crossOrigin = 'anonymous';
    }

    const procCanvas = document.createElement('canvas');
    const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });

    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let velX = new Float32Array(0);
    let velY = new Float32Array(0);
    let dye = new Float32Array(0);
    let velX0 = new Float32Array(0);
    let velY0 = new Float32Array(0);
    let dye0 = new Float32Array(0);
    let glyphs = new Uint8Array(0);

    let lastPointerX = -9999;
    let lastPointerY = -9999;
    let lastPointerTime = 0;
    let rafId = 0;
    let lastFrameTime = 0;
    let accumulator = 0;
    let running = true;

    const trails = [];
    let dragStartX = 0;
    let dragStartY = 0;
    let dragging = false;

    function resize() {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(rect.width));
        height = Math.max(1, Math.round(rect.height));
        cols = Math.max(3, Math.ceil(width / CELL_SIZE));
        rows = Math.max(3, Math.ceil(height / CELL_SIZE));
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        procCanvas.width = cols;
        procCanvas.height = rows;

        const size = cols * rows;
        velX = new Float32Array(size);
        velY = new Float32Array(size);
        dye = new Float32Array(size);
        velX0 = new Float32Array(size);
        velY0 = new Float32Array(size);
        dye0 = new Float32Array(size);
        glyphs = new Uint8Array(size);
        for (let i = 0; i < size; i++) glyphs[i] = Math.floor(Math.random() * 256);
    }

    function splash(cellX, cellY, forceX, forceY, dyeAmount, radiusCells) {
        const rSq = radiusCells * radiusCells;
        const xMin = Math.max(1, Math.floor(cellX - radiusCells));
        const xMax = Math.min(cols - 2, Math.ceil(cellX + radiusCells));
        const yMin = Math.max(1, Math.floor(cellY - radiusCells));
        const yMax = Math.min(rows - 2, Math.ceil(cellY + radiusCells));
        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - cellX;
                const dy = y - cellY;
                const distSq = dx * dx + dy * dy;
                if (distSq > rSq) continue;
                const falloff = smoothstep(1 - Math.sqrt(distSq) / radiusCells);
                const idx = x + y * cols;
                velX[idx] += forceX * falloff;
                velY[idx] += forceY * falloff;
                dye[idx] = Math.min(2.0, dye[idx] + dyeAmount * falloff);
                if (Math.random() < 0.04 * falloff) glyphs[idx] = Math.floor(Math.random() * 256);
            }
        }
    }

    function onPointerMove(e) {
        const rect = container.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        if (cols > 0 && lastPointerX > -9000 && px >= 0 && py >= 0 && px <= rect.width && py <= rect.height) {
            const elapsed = Math.min(0.05, Math.max(0.001, (e.timeStamp - lastPointerTime) / 1000));
            const fx = (px - lastPointerX) / CELL_SIZE / elapsed * ADVECT_SCALE;
            const fy = (py - lastPointerY) / CELL_SIZE / elapsed * ADVECT_SCALE;
            splash(px / CELL_SIZE, py / CELL_SIZE, fx, fy, SPLASH_FORCE, SPLASH_RADIUS_PX / CELL_SIZE);
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
        if (Math.hypot(px - dragStartX, py - dragStartY) > DRAG_THRESHOLD_PX) return;
        trails.push({ x: px, y: py, age: 0, seed: Math.random() * Math.PI * 2 });
        if (trails.length > MAX_TRAIL_POINTS) trails.shift();
    }

    function applyTrails() {
        if (!trails.length) return;
        const lifetimeSec = TRAIL_LIFETIME_MS / 1000;
        const cellsPerRadius = TRAIL_RADIUS_PX / CELL_SIZE;
        for (let i = trails.length - 1; i >= 0; i--) {
            const trail = trails[i];
            trail.age += DT;
            const progress = trail.age / lifetimeSec;
            if (progress >= 1) {
                trails.splice(i, 1);
                continue;
            }
            const eased = 1 - Math.pow(1 - progress, TRAIL_EASE);
            const ringRadius = eased * TRAIL_RADIUS_PX / CELL_SIZE;
            const remaining = 1 - progress;
            const intensity = 0.35 + 0.65 * eased;
            const force = TRAIL_STRENGTH * Math.pow(remaining, TRAIL_FORCE_DECAY);
            const dyeAmount = 0.2 * Math.pow(remaining, 2);
            const cx = trail.x / CELL_SIZE;
            const cy = trail.y / CELL_SIZE;
            const seed = trail.seed;
            const band = ringRadius * 1.3 + cellsPerRadius;
            const xMin = Math.max(1, Math.floor(cx - band));
            const xMax = Math.min(cols - 2, Math.ceil(cx + band));
            const yMin = Math.max(1, Math.floor(cy - band));
            const yMax = Math.min(rows - 2, Math.ceil(cy + band));
            for (let y = yMin; y <= yMax; y++) {
                for (let x = xMin; x <= xMax; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    const wobble = 0.5 * Math.sin(6 * angle + seed) + 0.25 * Math.sin(3 * angle + 0.05 * dist + 0.3 * seed) + 0.5;
                    const wobbleAmount = TRAIL_WOBBLE * (2 * wobble - 1) * intensity;
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
                    if (Math.random() < 0.03 * falloff) glyphs[idx] = Math.floor(Math.random() * 256);
                }
            }
        }
    }

    function step() {
        applyTrails();
        const visc = 1.5 * DT;
        velX0.set(velX);
        diffuse(velX, velX0, visc, cols, rows, DT, DIFFUSION_ITERATIONS);
        velY0.set(velY);
        diffuse(velY, velY0, visc, cols, rows, DT, DIFFUSION_ITERATIONS);
        project(velX, velY, velX0, velY0, cols, rows, PROJECT_ITERATIONS);
        velX0.set(velX);
        velY0.set(velY);
        const velDamp = 1 / (1 + DT * VELOCITY_DAMP);
        advect(velX, velX0, velX0, velY0, velDamp, cols, rows, DT);
        advect(velY, velY0, velX0, velY0, velDamp, cols, rows, DT);
        project(velX, velY, velX0, velY0, cols, rows, PROJECT_ITERATIONS);
        dye0.set(dye);
        diffuse(dye, dye0, visc * DT, cols, rows, DT, DIFFUSION_ITERATIONS);
        dye0.set(dye);
        advect(dye, dye0, velX, velY, 1 / (1 + DT * DYE_DAMP), cols, rows, DT);

        const size = cols * rows;
        for (let i = 0; i < size; i++) {
            if (Math.random() < 0.0005) {
                glyphs[i] = Math.floor(Math.random() * 256);
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        ctx.font = `700 ${FONT_SIZE}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let videoData = null;
        if (video && video.readyState >= 2) {
            try {
                procCtx.drawImage(video, 0, 0, cols, rows);
                videoData = procCtx.getImageData(0, 0, cols, rows).data;
            } catch (e) { }
        }

        const half = CELL_SIZE / 2;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = x + y * cols;
                const d = dye[idx];
                const hex = glyphs[idx].toString(16).toUpperCase().padStart(2, '0');

                let videoLuminance = 0;
                if (videoData) {
                    const r = videoData[idx * 4];
                    const g = videoData[idx * 4 + 1];
                    const b = videoData[idx * 4 + 2];
                    videoLuminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                }

                const baseAlpha = 0.04 + videoLuminance * 0.22;
                if (d <= 0.02) {
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = baseAlpha;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.fillText(hex, x * CELL_SIZE + half, y * CELL_SIZE + half);
                } else {
                    const alpha = d * FADE_RATE;
                    const activeAlpha = Math.min(alpha + baseAlpha, MAX_ALPHA);
                    ctx.globalAlpha = activeAlpha;
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#ffffff';
                    ctx.fillText(hex, x * CELL_SIZE + half, y * CELL_SIZE + half);
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function frame(now) {
        if (!running) return;
        rafId = requestAnimationFrame(frame);
        const delta = lastFrameTime ? (now - lastFrameTime) / 1000 : DT;
        lastFrameTime = now;
        accumulator += Math.min(delta, 0.1);
        let steps = 0;
        while (accumulator >= DT && steps < 3) {
            step();
            accumulator -= DT;
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
