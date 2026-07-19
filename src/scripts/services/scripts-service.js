import { DATA_PATHS } from '../config/constants.js';
import { fetchJsonArray } from './json-source.js';

export function getScripts() {
    return fetchJsonArray(DATA_PATHS.scripts);
}
