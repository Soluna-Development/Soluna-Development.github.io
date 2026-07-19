import { getExecutors } from '../services/executors-service.js';
import { createElement } from '../utils/dom.js';
import { createMarqueeLoop, populateLoopedTrack } from '../animations/marquee-loop.js';

const EXECUTOR_ITEM_WIDTH_PX = 180;
const BASE_SPEED = 0.35;
const BOOSTED_SPEED = 2.2;

function createExecutorItem(executor) {
    const el = createElement('div', 'executor-item');
    const avatar = executor.image
        ? `<img src="${executor.image}" alt="" loading="lazy" onerror="this.parentElement.innerHTML=''">`
        : '';
    el.innerHTML = `
        <span class="executor-avatar">${avatar}</span>
        <span class="executor-name">${executor.name}</span>
    `;
    return el;
}

export async function initExecutorsSection() {
    const track = document.getElementById('executors-track');
    if (!track) return;

    try {
        const executors = await getExecutors();
        populateLoopedTrack(track, executors, createExecutorItem, EXECUTOR_ITEM_WIDTH_PX);
        createMarqueeLoop(track, '--marquee-x', { baseSpeed: BASE_SPEED, boostedSpeed: BOOSTED_SPEED });
    } catch (error) {
        const wrap = document.querySelector('.executors-marquee-wrap');
        if (wrap) {
            wrap.innerHTML = '<p style="color: var(--color-muted); text-align:center; width:100%">executors unavailable.</p>';
        }
    }
}
