export async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch ${path}`);
    const data = await response.json();
    return data;
}

export async function fetchJsonArray(path) {
    const data = await fetchJson(path);
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`Expected non-empty array from ${path}`);
    }
    return data;
}
