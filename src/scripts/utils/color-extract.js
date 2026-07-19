const SAMPLE_SIZE = 32;
const MIN_ALPHA = 100;
const MIN_SATURATION = 12;
const SHADOW_CEILING = 30;
const HIGHLIGHT_FLOOR = 235;

function averageColor(pixels) {
    const sum = pixels.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
    return sum.map((channel) => Math.round(channel / pixels.length));
}

function collectVividPixels(imageData) {
    const buckets = [];
    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];
        if (a < MIN_ALPHA) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min < MIN_SATURATION && (max < SHADOW_CEILING || max > HIGHLIGHT_FLOOR)) continue;
        buckets.push([r, g, b]);
    }
    return buckets;
}

function saturationOf(pixel) {
    return Math.max(...pixel) - Math.min(...pixel);
}

function sampleImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    try {
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const buckets = collectVividPixels(data);
        if (!buckets.length) return null;

        buckets.sort((a, b) => saturationOf(b) - saturationOf(a));

        const sliceSize = Math.max(4, Math.floor(buckets.length * 0.2));
        const top = buckets.slice(0, sliceSize);
        const bottom = buckets.slice(-sliceSize);

        const [r1, g1, b1] = averageColor(top);
        const [r2, g2, b2] = averageColor(bottom.length ? bottom : top);

        return {
            a: `rgba(${r1}, ${g1}, ${b1}, 0.9)`,
            b: `rgba(${r2}, ${g2}, ${b2}, 0.9)`,
        };
    } catch (error) {
        return null;
    }
}

export function extractGlowColors(img) {
    return new Promise((resolve) => {
        const run = () => resolve(sampleImage(img));
        if (img.complete && img.naturalWidth) {
            run();
        } else {
            img.addEventListener('load', run, { once: true });
            img.addEventListener('error', () => resolve(null), { once: true });
        }
    });
}
