import { DATA_PATHS } from '../config/constants.js';
import { fetchJsonArray } from './json-source.js';
import { youtubeIdFromUrl } from '../utils/youtube.js';

export async function getShowcaseVideos() {
    const links = await fetchJsonArray(DATA_PATHS.showcases);
    const videos = links
        .map((url) => ({ url, id: youtubeIdFromUrl(url) }))
        .filter((video) => video.id);
    if (!videos.length) throw new Error('No valid showcase videos found');
    return videos;
}
