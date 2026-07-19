import { observeReveals } from './animations/reveal-observer.js';
import { initHeroSection } from './sections/hero.js';
import { initStatsSection } from './sections/stats.js';
import { initScriptsSection } from './sections/scripts.js';
import { initTestimonialsSection } from './sections/testimonials.js';
import { initExecutorsSection } from './sections/executors.js';
import { initShowcasesSection } from './sections/showcases.js';
import { initPartnersSection } from './sections/partners.js';
import { initFaqSection } from './sections/faq.js';
import { getExecutors } from './services/executors-service.js';

function initApp() {
    observeReveals();

    initHeroSection();
    initStatsSection();
    initScriptsSection();
    initTestimonialsSection();
    initExecutorsSection();
    initShowcasesSection();
    initPartnersSection();
    initFaqSection();

    window.debugExecutors = async () => {
        console.log('[DEBUG] Manually refetching executors...');
        try {
            const executors = await getExecutors();
            console.log('[DEBUG] Success! Executors:', executors);
            return executors;
        } catch (error) {
            console.error('[DEBUG] Failed:', error);
            throw error;
        }
    };
}

document.addEventListener('DOMContentLoaded', initApp);