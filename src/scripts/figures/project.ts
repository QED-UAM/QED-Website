// The camera of the engraved figures, applied by hand. The WebGL stage draws them with a 32°
// perspective camera 4.4 units back from a shape that fits the unit sphere; projecting the same
// way on the CPU lets the figures also be drawn without WebGL (2D canvas, or a static sketch).

export const CAMERA = { distance: 4.4, fov: 32, fogNear: 3.6, fogFar: 6.2 };

/** Geometry as the shapes module stores it: flat coordinates plus optional indices. */
export interface Mesh {
    positions: Float32Array;
    /** Vertex indices, or null when the positions are already in drawing order. */
    index: ArrayLike<number> | null;
}

export interface Projected {
    /** Screen position inside the figure's box, 0 to 1, y pointing down. */
    x: Float32Array;
    y: Float32Array;
    /** Distance to the camera, for depth sorting and for the fog. */
    depth: Float32Array;
}

/** three's default Euler order (intrinsic XYZ), written out row by row. */
function orientation([rx, ry, rz]: [number, number, number]) {
    const a = Math.cos(rx);
    const b = Math.sin(rx);
    const c = Math.cos(ry);
    const d = Math.sin(ry);
    const e = Math.cos(rz);
    const f = Math.sin(rz);
    return [
        c * e,
        -c * f,
        d,
        a * f + b * d * e,
        a * e - b * d * f,
        -b * c,
        b * f - a * d * e,
        b * e + a * d * f,
        a * c
    ];
}

export function project(positions: Float32Array, view: [number, number, number], aspect = 1): Projected {
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = orientation(view);
    const half = Math.tan((CAMERA.fov / 2) * (Math.PI / 180));
    const count = positions.length / 3;
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const depth = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];
        const rx = m0 * px + m1 * py + m2 * pz;
        const ry = m3 * px + m4 * py + m5 * pz;
        const rz = m6 * px + m7 * py + m8 * pz;
        // The camera sits on +z looking back at the origin, so depth grows away from it.
        const d = Math.max(CAMERA.distance - rz, 0.001);
        x[i] = 0.5 + rx / (2 * d * half * aspect);
        y[i] = 0.5 - ry / (2 * d * half);
        depth[i] = d;
    }
    return { x, y, depth };
}

/** How solid a line is at that distance: the stand-in for the stage's fog. */
export function fade(depth: number) {
    const t = (depth - CAMERA.fogNear) / (CAMERA.fogFar - CAMERA.fogNear);
    return Math.min(1, Math.max(0, 1 - t));
}
