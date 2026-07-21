import { getDiscordStats } from '../services/discord-service.js';
import { getScripts } from '../services/scripts-service.js';
import { animateCountOnVisible } from '../animations/counter.js';

async function initDiscordStats() {
    const membersEl = document.getElementById('stat-members');
    const onlineEl = document.getElementById('stat-online');
    if (!membersEl || !onlineEl) return;

    try {
        const { memberCount, onlineCount } = await getDiscordStats();
        const statsGrid = document.getElementById('stats-grid');
        const onlineItem = onlineEl.closest('.stat-item');
        if (onlineItem) onlineItem.classList.add('stat-online');

        if (statsGrid) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            animateCountOnVisible(membersEl, memberCount);
                            animateCountOnVisible(onlineEl, onlineCount);
                            observer.disconnect();
                        }
                    });
                },
                { threshold: 0.5 }
            );
            observer.observe(statsGrid);
        }
    } catch (error) {
        membersEl.textContent = '-';
        onlineEl.textContent = '-';
    }
}

async function initScriptCountStat() {
    const scriptsEl = document.getElementById('stat-scripts');
    if (!scriptsEl) return;

    try {
        const scripts = await getScripts();
        animateCountOnVisible(scriptsEl, scripts.length);
    } catch (error) {
        scriptsEl.textContent = '-';
    }
}

export function initStatsSection() {
    initDiscordStats();
    initScriptCountStat();
}
