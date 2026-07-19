export function youtubeIdFromUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.slice(1);
        }
        const videoParam = parsed.searchParams.get('v');
        if (videoParam) return videoParam;
        const shortsMatch = parsed.pathname.match(/\/shorts\/([^/]+)/);
        if (shortsMatch) return shortsMatch[1];
        return null;
    } catch (error) {
        return null;
    }
}

export function youtubeThumbnailUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}
