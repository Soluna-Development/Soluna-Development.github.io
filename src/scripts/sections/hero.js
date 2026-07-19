import { qs, isMobileViewport } from '../utils/dom.js';
import { copyToClipboard, flashFeedback, flashClass } from '../utils/clipboard.js';
import { typewriterReveal } from '../animations/typewriter.js';
import { initFluidByteField } from '../animations/fluid-byte-field.js';
import { DISCORD_LOADER_SCRIPT, COPY_FEEDBACK_DURATION_MS } from '../config/constants.js';

const HERO_GREETING = 'Soluna Development';

function initHeroTitle() {
    const heroTitle = qs('.hero-title');
    if (heroTitle) typewriterReveal(heroTitle, HERO_GREETING);
}

function initDiscordCopyBar() {
    const copyBtn = document.getElementById('copy-discord-btn');
    const copyLabel = document.getElementById('copy-discord-label');
    const copyIcon = document.getElementById('copy-discord-icon');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
        await copyToClipboard(DISCORD_LOADER_SCRIPT);
        if (copyLabel) flashFeedback(copyLabel, 'Copied!', COPY_FEEDBACK_DURATION_MS);
        if (copyIcon) flashClass(copyIcon, 'copied', COPY_FEEDBACK_DURATION_MS);
    });
}

function initHeroCopyButton() {
    const heroCopyScriptBtn = document.getElementById('hero-copy-script-btn');
    if (!heroCopyScriptBtn) return;

    heroCopyScriptBtn.addEventListener('click', async () => {
        await copyToClipboard(DISCORD_LOADER_SCRIPT);
        flashFeedback(heroCopyScriptBtn, 'Copied!', COPY_FEEDBACK_DURATION_MS);
    });
}

export function initHeroSection() {
    initHeroTitle();
    initDiscordCopyBar();
    initHeroCopyButton();
    if (!isMobileViewport()) {
        initFluidByteField('hero-byte-overlay');
    }
}
