import { DATA_PATHS, WEAO_EXECUTORS_ENDPOINT } from '../config/constants.js';

function getExecutorsEndpoint() {
    if (window.location.protocol === 'https:') {
        const endpoint = new URL(DATA_PATHS.executors, document.baseURI);
        endpoint.searchParams.set('v', Date.now().toString());
        return endpoint;
    }

    return WEAO_EXECUTORS_ENDPOINT;
}

function faviconFromUrl(websiteUrl) {
    try {
        const host = new URL(websiteUrl).hostname;
        return `https://favicone.com/${host}?s=64`;
    } catch {
        return '';
    }
}

function dedupeByName(executors) {
    return executors.filter(
        (executor, index, all) =>
            all.findIndex((e) => e.name === executor.name) === index
    );
}

export async function getExecutors() {
    const endpoint = getExecutorsEndpoint();

    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error(`Failed to fetch executor status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Empty executor response');
    }

    const executors = data
        .filter((entry) => !entry.hidden && entry.extype !== 'wexternal')
        .map((entry) => ({
            name: entry.title,
            image: entry.websitelink ? faviconFromUrl(entry.websitelink) : ''
        }));

    return dedupeByName(executors);
}
