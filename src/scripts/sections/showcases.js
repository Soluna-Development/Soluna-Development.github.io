import { getShowcaseVideos } from '../services/showcases-service.js';
import { createShowcaseItem } from '../components/showcase-item.js';
import { createMarqueeLoop, populateLoopedTrack } from '../animations/marquee-loop.js';

const SHOWCASE_ITEM_WIDTH_PX = 280;
const BASE_SPEED = 0.4;
const BOOSTED_SPEED = 2.4;

export async function initShowcasesSection() {
    const track = document.getElementById('showcase-track');
    if (!track) return;

    try {
        const videos = await getShowcaseVideos();
        populateLoopedTrack(track, videos, createShowcaseItem, SHOWCASE_ITEM_WIDTH_PX);
        createMarqueeLoop(track, '--showcase-x', { baseSpeed: BASE_SPEED, boostedSpeed: BOOSTED_SPEED });
    } catch (error) {
        const viewport = document.querySelector('.showcase-viewport');
        if (viewport) {
            viewport.innerHTML = '<p style="color: var(--color-muted); text-align:center; width:100%">showcases unavailable.</p>';
        }
    }
}
