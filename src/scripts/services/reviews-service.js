import { DATA_PATHS } from '../config/constants.js';
import { fetchJsonArray } from './json-source.js';

export function getReviews() {
    return fetchJsonArray(DATA_PATHS.reviews);
}
