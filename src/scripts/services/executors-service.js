import { WEAO_EXECUTORS_ENDPOINT } from '../config/constants.js';

function faviconFromUrl(websiteUrl) {
    try {
        const host = new URL(websiteUrl).hostname;
        return `https://favicone.com/${host}?s=64`;
    } catch (error) {
        return '';
    }
}

function dedupeByName(executors) {
    return executors.filter(
        (executor, index, all) => all.findIndex((e) => e.name === executor.name) === index
    );
}

export async function getExecutors() {
    console.log('[Executors] Fetching from:', WEAO_EXECUTORS_ENDPOINT);
    const response = await fetch(WEAO_EXECUTORS_ENDPOINT, {
        headers: { 'User-Agent': 'WEAO-3PService' },
    });
    console.log('[Executors] Response status:', response.status, response.statusText);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Executors] Failed to fetch. Response:', errorText);
        throw new Error(`Failed to fetch executor status: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[Executors] Received data:', data);
    if (!Array.isArray(data) || data.length === 0) {
        console.error('[Executors] Empty or invalid response');
        throw new Error('Empty executor response');
    }

    const executors = data
        .filter((entry) => !entry.hidden && entry.extype !== 'wexternal')
        .map((entry) => ({
            name: entry.title,
            image: entry.websitelink ? faviconFromUrl(entry.websitelink) : '',
        }));

    console.log('[Executors] Processed executors:', executors);
    return dedupeByName(executors);
}