// Shapes for the engraved 3D figures: each one is a surface (drawn into the depth buffer only,
// to hide the lines behind it) plus ink lines, normalized to fit a unit sphere. Parametric surfaces draw their
// iso-lines; polyhedra draw their edges.
import * as THREE from "three";

export interface Shape {
    fill?: THREE.BufferGeometry;
    lines: THREE.BufferGeometry;
    /** Resting orientation [pitch, yaw, roll]; the figure rocks around it. */
    view: [number, number, number];
}

type Vec = [number, number, number];
const TAU = Math.PI * 2;

function normalize(geometries: THREE.BufferGeometry[], scale = 1) {
    const reference = geometries[0];
    reference.computeBoundingSphere();
    // Copy the values: translate() recomputes the bounding sphere in place.
    const center = reference.boundingSphere!.center.clone();
    const radius = reference.boundingSphere!.radius;
    for (const geometry of geometries) {
        geometry.translate(-center.x, -center.y, -center.z);
        geometry.scale(scale / radius, scale / radius, scale / radius);
    }
}

/** A patch of a figure: an (nu+1)×(nv+1) grid of points, inked along every n-th iso-line. */
interface Grid {
    positions: Float32Array;
    nu: number;
    nv: number;
    stepU: number;
    stepV: number;
}

/** One figure out of one or more patches (a link brings one patch per component). */
function gridsShape(grids: Grid[], view: Shape["view"]): Shape {
    const positions = new Float32Array(grids.reduce((total, grid) => total + grid.positions.length, 0));
    const faces: number[] = [];
    const segments: number[] = [];
    let written = 0;
    for (const { positions: patch, nu, nv, stepU, stepV } of grids) {
        positions.set(patch, written);
        const base = written / 3;
        const at = (a: number, b: number) => base + a * (nv + 1) + b;
        for (let a = 0; a < nu; a++) {
            for (let b = 0; b < nv; b++) {
                faces.push(at(a, b), at(a + 1, b), at(a + 1, b + 1), at(a, b), at(a + 1, b + 1), at(a, b + 1));
            }
        }
        for (let a = 0; a <= nu; a += stepU) for (let b = 0; b < nv; b++) segments.push(at(a, b), at(a, b + 1));
        for (let b = 0; b <= nv; b += stepV) for (let a = 0; a < nu; a++) segments.push(at(a, b), at(a + 1, b));
        written += patch.length;
    }

    const fill = new THREE.BufferGeometry();
    fill.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    fill.setIndex(faces);
    const lines = new THREE.BufferGeometry();
    lines.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    lines.setIndex(segments);
    normalize([fill, lines]);
    return { fill, lines, view };
}

/** A parametric surface on an (nu+1)×(nv+1) grid, drawing every n-th iso-line. */
function gridShape(
    positions: Float32Array,
    nu: number,
    nv: number,
    stepU: number,
    stepV: number,
    view: Shape["view"]
): Shape {
    return gridsShape([{ positions, nu, nv, stepU, stepV }], view);
}

function parametric(fn: (u: number, v: number) => Vec, nu: number, nv: number): Float32Array {
    const positions = new Float32Array((nu + 1) * (nv + 1) * 3);
    let i = 0;
    for (let a = 0; a <= nu; a++) {
        for (let b = 0; b <= nv; b++) {
            const [x, y, z] = fn(a / nu, b / nv);
            positions[i++] = x;
            positions[i++] = y;
            positions[i++] = z;
        }
    }
    return positions;
}

/** A tube around a closed space curve (knots), drawing rings and longitudinal lines. */
function tubeGrid(curve: (t: number) => Vec, radius: number, steps = 200): Grid {
    class Path extends THREE.Curve<THREE.Vector3> {
        constructor() {
            super();
        }
        getPoint(t: number, target = new THREE.Vector3()) {
            const [x, y, z] = curve(t);
            return target.set(x, y, z);
        }
    }
    const tube = new THREE.TubeGeometry(new Path(), steps, radius, 14, true);
    const positions = new Float32Array(tube.getAttribute("position").array);
    return { positions, nu: steps, nv: 14, stepU: 2, stepV: 1 };
}

/** A knot: one closed curve. */
function tubeShape(curve: (t: number) => Vec, radius: number, view: Shape["view"]): Shape {
    return gridsShape([tubeGrid(curve, radius)], view);
}

/** A link: several closed curves that only mean anything together. */
function linkShape(curves: ((t: number) => Vec)[], radius: number, view: Shape["view"]): Shape {
    return gridsShape(curves.map((curve) => tubeGrid(curve, radius, 120)), view);
}

/** A bare space curve: ink only, with no surface to hide anything behind. */
function curveShape(points: Vec[], view: Shape["view"]): Shape {
    const positions = new Float32Array(points.length * 3);
    points.forEach(([x, y, z], at) => positions.set([x, y, z], at * 3));
    const segments: number[] = [];
    for (let at = 0; at + 1 < points.length; at++) segments.push(at, at + 1);
    const lines = new THREE.BufferGeometry();
    lines.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    lines.setIndex(segments);
    normalize([lines]);
    return { lines, view };
}

/** Hidden-line drawing of a solid: paper fill plus its sharp edges. */
function solidShape(geometry: THREE.BufferGeometry, view: Shape["view"], threshold = 1): Shape {
    const fill = geometry.index ? geometry.toNonIndexed() : geometry;
    const lines = new THREE.EdgesGeometry(fill, threshold);
    normalize([fill, lines], 0.95);
    return { fill, lines, view };
}

interface Cell {
    x: number;
    y: number;
    z: number;
    size: number;
}

/** Iterated function system: every cell is replaced by smaller copies of itself at the seed
 *  offsets (a fraction of the cell), depth times over. */
function subdivide(seed: Vec[], shrink: number, depth: number): Cell[] {
    let cells: Cell[] = [{ x: 0, y: 0, z: 0, size: 1 }];
    for (let step = 0; step < depth; step++) {
        cells = cells.flatMap((cell) =>
            seed.map(([dx, dy, dz]) => ({
                x: cell.x + dx * cell.size,
                y: cell.y + dy * cell.size,
                z: cell.z + dz * cell.size,
                size: cell.size / shrink
            }))
        );
    }
    return cells;
}

/** The same solid stamped into every cell of a subdivision (the fractals). Faces that end up
 *  flush against a neighbour share their edges, so those drop out and only the outline and the
 *  holes are inked. */
function fractalShape(base: THREE.BufferGeometry, cells: Cell[], view: Shape["view"]): Shape {
    const source = (base.index ? base.toNonIndexed() : base).getAttribute("position").array as Float32Array;
    const positions = new Float32Array(source.length * cells.length);
    cells.forEach((cell, n) => {
        const offset = n * source.length;
        for (let at = 0; at < source.length; at += 3) {
            positions[offset + at] = cell.x + source[at] * cell.size;
            positions[offset + at + 1] = cell.y + source[at + 1] * cell.size;
            positions[offset + at + 2] = cell.z + source[at + 2] * cell.size;
        }
    });
    const solid = new THREE.BufferGeometry();
    solid.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return solidShape(solid, view);
}

const PHI = (1 + Math.sqrt(5)) / 2;

// The 20 cells a Menger sponge keeps: all but the core and the middle of each face.
const MENGER: Vec[] = [];
for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
        for (const z of [-1, 0, 1])
            if ([x, y, z].filter((side) => side === 0).length <= 1) MENGER.push([x / 3, y / 3, z / 3]);

// The four corners a Sierpinski tetrahedron keeps, as a fraction of the cell holding them.
const CORNER = 1 / (2 * Math.sqrt(3));
const SIERPINSKI: Vec[] = [
    [CORNER, CORNER, CORNER],
    [-CORNER, -CORNER, CORNER],
    [-CORNER, CORNER, -CORNER],
    [CORNER, -CORNER, -CORNER]
];

/** The Lorenz attractor, integrated step by step from a point next to the origin. */
function lorenz(): Vec[] {
    const points: Vec[] = [];
    const step = 0.005;
    let x = 0.1;
    let y = 0;
    let z = 0;
    for (let at = 0; at < 7000; at++) {
        const [dx, dy, dz] = [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
        x += step * dx;
        y += step * dy;
        z += step * dz;
        // Past the first turns the point is on the attractor; z is its vertical axis.
        if (at > 300) points.push([x, z, y]);
    }
    return points;
}

/** Boy's surface, the projective plane immersed without a crease, in Bryant and Kusner's
 *  parametrization: the unit disk w = r·e^(i·t), with the three points where the denominator
 *  vanishes landing on the surface's triple point. */
function boy(r: number, turn: number): Vec {
    const t = turn * TAU;
    const power = (n: number): [number, number] => [r ** n * Math.cos(n * t), r ** n * Math.sin(n * t)];
    const divide = (a: [number, number], b: [number, number]): [number, number] => {
        const size = b[0] * b[0] + b[1] * b[1] || Number.EPSILON;
        return [(a[0] * b[0] + a[1] * b[1]) / size, (a[1] * b[0] - a[0] * b[1]) / size];
    };
    const [w, wi] = power(1);
    const [w3, w3i] = power(3);
    const [w5, w5i] = power(5);
    const [w6, w6i] = power(6);
    const under: [number, number] = [w6 + Math.sqrt(5) * w3 - 1, w6i + Math.sqrt(5) * w3i];
    const g1 = -1.5 * divide([w - w5, wi - w5i], under)[1];
    const g2 = -1.5 * divide([w + w5, wi + w5i], under)[0];
    const g3 = divide([1 + w6, w6i], under)[1] - 0.5;
    const size = g1 * g1 + g2 * g2 + g3 * g3;
    return [g1 / size, -g3 / size, g2 / size];
}

// Classic "bottle" immersion (three.js ParametricGeometries.klein), bulb down, neck up.
function klein(u: number, v: number): Vec {
    u *= TAU;
    v *= TAU;
    let x: number;
    let z: number;
    if (u < Math.PI) {
        x = 3 * Math.cos(u) * (1 + Math.sin(u)) + 2 * (1 - Math.cos(u) / 2) * Math.cos(u) * Math.cos(v);
        z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
    } else {
        x = 3 * Math.cos(u) * (1 + Math.sin(u)) + 2 * (1 - Math.cos(u) / 2) * Math.cos(v + Math.PI);
        z = -8 * Math.sin(u);
    }
    return [x, -z, -2 * (1 - Math.cos(u) / 2) * Math.sin(v)];
}

const surfaces: Record<string, () => Shape> = {
    klein: () => gridShape(parametric(klein, 72, 36), 72, 36, 2, 2, [0.35, 0.15, -0.3]),
    mobius: () =>
        gridShape(
            parametric(
                (u, v) => {
                    const s = (u - 0.5) * 1.6;
                    const t = v * TAU;
                    const r = 2 + s * Math.cos(t / 2);
                    return [r * Math.cos(t), s * Math.sin(t / 2), r * Math.sin(t)];
                },
                8,
                96
            ),
            8,
            96,
            1,
            3,
            [0.75, 0.3, 0.15]
        ),
    torus: () =>
        gridShape(
            parametric((u, v) => {
                const a = u * TAU;
                const b = v * TAU;
                const r = 2 + 0.85 * Math.cos(b);
                return [r * Math.cos(a), 0.85 * Math.sin(b), r * Math.sin(a)];
            }, 48, 20),
            48,
            20,
            2,
            2,
            [0.9, 0, 0.2]
        ),
    saddle: () =>
        gridShape(
            parametric((u, v) => {
                const x = (u - 0.5) * 2;
                const z = (v - 0.5) * 2;
                return [x, (x * x - z * z) * 0.7, z];
            }, 24, 24),
            24,
            24,
            2,
            2,
            [0.55, 0.6, 0]
        ),
    helicoid: () =>
        gridShape(
            parametric((u, v) => {
                const r = (u - 0.5) * 2;
                const t = (v - 0.5) * TAU * 1.25;
                return [r * Math.cos(t), t * 0.3, r * Math.sin(t)];
            }, 10, 72),
            10,
            72,
            1,
            2,
            [0.2, 0.4, 0]
        ),
    trefoil: () =>
        tubeShape(
            (t) => {
                const a = t * TAU;
                return [Math.sin(a) + 2 * Math.sin(2 * a), Math.cos(a) - 2 * Math.cos(2 * a), -Math.sin(3 * a)];
            },
            0.55,
            [0.3, 0, 0.4]
        ),
    torusKnot: () =>
        tubeShape(
            (t) => {
                const a = t * TAU;
                const r = 2 + Math.cos(5 * a);
                return [r * Math.cos(2 * a), r * Math.sin(2 * a), -Math.sin(5 * a)];
            },
            0.38,
            [0.25, 0, 0]
        ),
    figureEight: () =>
        tubeShape(
            (t) => {
                const a = t * TAU;
                const r = 2 + Math.cos(2 * a);
                return [r * Math.cos(3 * a), r * Math.sin(3 * a), Math.sin(4 * a)];
            },
            0.42,
            [0.5, 0, 0.2]
        ),
    enneper: () =>
        gridShape(
            parametric((u, v) => {
                const r = u * 1.5;
                const t = v * TAU;
                const x = r * Math.cos(t);
                const y = r * Math.sin(t);
                return [x - (x * x * x) / 3 + x * y * y, x * x - y * y, y - (y * y * y) / 3 + y * x * x];
            }, 20, 64),
            20,
            64,
            2,
            2,
            [0.45, 0.3, 0]
        ),
    catenoid: () =>
        gridShape(
            parametric((u, v) => {
                const a = u * TAU;
                const h = (v - 0.5) * 2.4;
                return [Math.cosh(h) * Math.cos(a), h, Math.cosh(h) * Math.sin(a)];
            }, 48, 20),
            48,
            20,
            2,
            2,
            [0.3, 0, 0.15]
        ),
    hyperboloid: () =>
        gridShape(
            parametric((u, v) => {
                const a = u * TAU;
                const h = (v - 0.5) * 2;
                return [Math.cosh(h) * Math.cos(a), Math.sinh(h) * 1.2, Math.cosh(h) * Math.sin(a)];
            }, 48, 16),
            48,
            16,
            2,
            2,
            [0.25, 0, 0.1]
        ),
    dini: () =>
        gridShape(
            parametric((u, v) => {
                const a = u * 4 * Math.PI;
                const b = 0.12 + v * 1.9;
                const x = Math.cos(a) * Math.sin(b);
                const y = Math.sin(a) * Math.sin(b);
                const z = Math.cos(b) + Math.log(Math.tan(b / 2)) + 0.2 * a;
                return [x, z, y];
            }, 96, 24),
            96,
            24,
            2,
            2,
            [0.1, 0, 0.1]
        ),
    seashell: () =>
        gridShape(
            parametric((u, v) => {
                const a = u * TAU;
                const b = v * 6 * Math.PI;
                const e = Math.exp(b / (6 * Math.PI));
                const c = Math.cos(a / 2) ** 2;
                return [
                    2 * (1 - e) * Math.cos(b) * c,
                    1 - Math.exp(b / (3 * Math.PI)) - Math.sin(a) + e * Math.sin(a),
                    2 * (-1 + e) * Math.sin(b) * c
                ];
            }, 24, 120),
            24,
            120,
            2,
            3,
            [0.35, 0.4, 0]
        ),
    roman: () =>
        gridShape(
            parametric((u, v) => {
                const a = u * Math.PI;
                const b = (v - 0.5) * Math.PI;
                return [
                    Math.sin(2 * a) * Math.cos(b) ** 2,
                    Math.cos(a) * Math.sin(2 * b),
                    Math.sin(a) * Math.sin(2 * b)
                ];
            }, 48, 48),
            48,
            48,
            3,
            3,
            [0.5, 0.6, 0]
        ),
    boy: () => gridShape(parametric(boy, 48, 96), 48, 96, 4, 8, [0.5, 0.2, 0]),
    monkey: () =>
        gridShape(
            parametric((u, v) => {
                const r = u * 1.3;
                const t = v * TAU;
                const x = r * Math.cos(t);
                const z = r * Math.sin(t);
                return [x, (x ** 3 - 3 * x * z * z) * 0.5, z];
            }, 14, 72),
            14,
            72,
            2,
            6,
            [0.5, 0.35, 0]
        ),
    whitney: () =>
        gridShape(
            parametric((u, v) => {
                const a = (u - 0.5) * 2;
                const b = (v - 0.5) * 2.6;
                return [a * b, b * b * 0.7, a];
            }, 32, 32),
            32,
            32,
            2,
            2,
            [0.35, 0.5, 0]
        ),
    henneberg: () =>
        gridShape(
            parametric((u, v) => {
                const a = (u - 0.5) * 2.2;
                const b = v * Math.PI;
                return [
                    2 * Math.sinh(a) * Math.cos(b) - (2 / 3) * Math.sinh(3 * a) * Math.cos(3 * b),
                    2 * Math.cosh(2 * a) * Math.cos(2 * b),
                    2 * Math.sinh(a) * Math.sin(b) + (2 / 3) * Math.sinh(3 * a) * Math.sin(3 * b)
                ];
            }, 32, 64),
            32,
            64,
            2,
            4,
            [0.4, 0.3, 0]
        ),
    lissajous: () =>
        tubeShape(
            (t) => {
                const a = t * TAU;
                return [Math.cos(3 * a + 0.7), Math.cos(2 * a + 0.2), Math.cos(7 * a)];
            },
            0.11,
            [0.3, 0.15, 0]
        ),
    // Three golden ellipses, one per coordinate plane: no two of them are linked.
    borromean: () =>
        linkShape(
            [
                (t) => [0, Math.cos(t * TAU), PHI * Math.sin(t * TAU)],
                (t) => [PHI * Math.sin(t * TAU), 0, Math.cos(t * TAU)],
                (t) => [Math.cos(t * TAU), PHI * Math.sin(t * TAU), 0]
            ],
            0.13,
            [0.4, 0.45, 0.2]
        ),
    hopf: () =>
        linkShape(
            [
                (t) => [Math.cos(t * TAU) - 0.55, Math.sin(t * TAU), 0],
                (t) => [Math.cos(t * TAU) + 0.55, 0, Math.sin(t * TAU)]
            ],
            0.14,
            [0.35, 0.3, 0.15]
        ),
    lorenz: () => curveShape(lorenz(), [0.15, 0.25, 0]),
    menger: () => fractalShape(new THREE.BoxGeometry(1, 1, 1), subdivide(MENGER, 3, 2), [0.4, 0.6, 0]),
    sierpinski: () =>
        fractalShape(new THREE.TetrahedronGeometry(1), subdivide(SIERPINSKI, 2, 3), [0.55, 0.85, 0.15])
};

const cache = new Map<string, Shape>();

export const SHAPE_KEYS = Object.keys(surfaces);

export async function loadShape(key: string): Promise<Shape> {
    if (!cache.has(key)) cache.set(key, (surfaces[key] ?? surfaces.trefoil)());
    return cache.get(key)!;
}
