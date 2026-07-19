import { DATA_PATHS } from '../config/constants.js';
import { fetchJsonArray } from './json-source.js';

export function getPartners() {
    return fetchJsonArray(DATA_PATHS.partners);
}
