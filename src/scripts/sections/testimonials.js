import { getReviews } from '../services/reviews-service.js';
import { createTestimonialCard } from '../components/testimonial-card.js';

const AVG_TESTIMONIAL_WIDTH_PX = 260;

function fillMarqueeTrack(trackEl, reviews) {
    trackEl.innerHTML = '';
    if (!reviews.length) return;

    const minSets = Math.max(1, Math.ceil((window.innerWidth * 3) / (reviews.length * AVG_TESTIMONIAL_WIDTH_PX)));
    for (let i = 0; i < minSets; i++) {
        reviews.forEach((review) => trackEl.appendChild(createTestimonialCard(review)));
    }

    const firstPass = Array.from(trackEl.children).map((card) => card.cloneNode(true));
    firstPass.forEach((card) => trackEl.appendChild(card));
}

export async function initTestimonialsSection() {
    const track1 = document.getElementById('marquee-track-1');
    const track2 = document.getElementById('marquee-track-2');
    if (!track1 || !track2) return;

    try {
        const reviews = await getReviews();
        const mid = Math.ceil(reviews.length / 2);
        const rowA = reviews.slice(0, mid);
        const rowB = reviews.slice(mid);

        fillMarqueeTrack(track1, rowA.length ? rowA : reviews);
        fillMarqueeTrack(track2, rowB.length ? rowB : reviews);
    } catch (error) {
        const wrap = document.querySelector('.marquee-wrap');
        if (wrap) {
            wrap.innerHTML = '<p style="color: var(--color-muted); text-align:center; width:100%">reviews unavailable.</p>';
        }
    }
}
