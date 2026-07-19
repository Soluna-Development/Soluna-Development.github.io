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
        try {
            const executors = await getExecutors();
            return executors;
        } catch (error) {
            throw error;
        }
    };
}

document.addEventListener('DOMContentLoaded', initApp);