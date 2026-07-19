export function smoothstep(v) {
    return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
}

export function setBoundary(field, cols, rows) {
    for (let x = 0; x < cols; x++) {
        field[x] = field[x + cols];
        field[x + (rows - 1) * cols] = field[x + (rows - 2) * cols];
    }
    for (let y = 0; y < rows; y++) {
        field[y * cols] = field[y * cols + 1];
        field[y * cols + cols - 1] = field[y * cols + cols - 2];
    }
}

export function diffuse(field, fieldPrev, diffusion, cols, rows, dt, iterations) {
    const a = diffusion * dt;
    const denom = 1 / (1 + 4 * a);
    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                const idx = x + y * cols;
                field[idx] = (fieldPrev[idx] + a * (field[idx - 1] + field[idx + 1] + field[idx - cols] + field[idx + cols])) * denom;
            }
        }
        setBoundary(field, cols, rows);
    }
}

export function project(vx, vy, p, div, cols, rows, iterations) {
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            const idx = x + y * cols;
            div[idx] = -0.5 * (vx[idx + 1] - vx[idx - 1] + vy[idx + cols] - vy[idx - cols]);
            p[idx] = 0;
        }
    }
    setBoundary(div, cols, rows);
    setBoundary(p, cols, rows);
    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                const idx = x + y * cols;
                p[idx] = (div[idx] + p[idx - 1] + p[idx + 1] + p[idx - cols] + p[idx + cols]) * 0.25;
            }
        }
        setBoundary(p, cols, rows);
    }
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            const idx = x + y * cols;
            vx[idx] -= 0.5 * (p[idx + 1] - p[idx - 1]);
            vy[idx] -= 0.5 * (p[idx + cols] - p[idx - cols]);
        }
    }
    setBoundary(vx, cols, rows);
    setBoundary(vy, cols, rows);
}

export function advect(field, fieldPrev, vx, vy, damp, cols, rows, dt) {
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            const idx = x + y * cols;
            let px = x - dt * vx[idx];
            let py = y - dt * vy[idx];
            px = px < 0.5 ? 0.5 : px > cols - 1.5 ? cols - 1.5 : px;
            py = py < 0.5 ? 0.5 : py > rows - 1.5 ? rows - 1.5 : py;
            const x0 = px | 0;
            const x1 = x0 + 1;
            const y0 = py | 0;
            const y1 = y0 + 1;
            const sx1 = px - x0;
            const sx0 = 1 - sx1;
            const sy1 = py - y0;
            const sy0 = 1 - sy1;
            field[idx] = (sx0 * (sy0 * fieldPrev[x0 + y0 * cols] + sy1 * fieldPrev[x0 + y1 * cols])
                + sx1 * (sy0 * fieldPrev[x1 + y0 * cols] + sy1 * fieldPrev[x1 + y1 * cols])) * damp;
        }
    }
    setBoundary(field, cols, rows);
}
