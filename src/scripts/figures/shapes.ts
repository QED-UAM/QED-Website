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

/** A parametric surface on an (nu+1)×(nv+1) grid, drawing every n-th iso-line. */
function gridShape(
    positions: Float32Array,
    nu: number,
    nv: number,
    stepU: number,
    stepV: number,
    view: Shape["view"]
): Shape {
    const at = (a: number, b: number) => a * (nv + 1) + b;
    const faces: number[] = [];
    const segments: number[] = [];
    for (let a = 0; a < nu; a++) {
        for (let b = 0; b < nv; b++) {
            faces.push(at(a, b), at(a + 1, b), at(a + 1, b + 1), at(a, b), at(a + 1, b + 1), at(a, b + 1));
        }
    }
    for (let a = 0; a <= nu; a += stepU) for (let b = 0; b < nv; b++) segments.push(at(a, b), at(a, b + 1));
    for (let b = 0; b <= nv; b += stepV) for (let a = 0; a < nu; a++) segments.push(at(a, b), at(a + 1, b));

    const fill = new THREE.BufferGeometry();
    fill.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    fill.setIndex(faces);
    const lines = new THREE.BufferGeometry();
    lines.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    lines.setIndex(segments);
    normalize([fill, lines]);
    return { fill, lines, view };
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
function tubeShape(curve: (t: number) => Vec, radius: number, view: Shape["view"]): Shape {
    class Path extends THREE.Curve<THREE.Vector3> {
        constructor() {
            super();
        }
        getPoint(t: number, target = new THREE.Vector3()) {
            const [x, y, z] = curve(t);
            return target.set(x, y, z);
        }
    }
    const tube = new THREE.TubeGeometry(new Path(), 200, radius, 14, true);
    return gridShape(new Float32Array(tube.getAttribute("position").array), 200, 14, 2, 1, view);
}

/** Hidden-line drawing of a solid: paper fill plus its sharp edges. */
function solidShape(geometry: THREE.BufferGeometry, view: Shape["view"], threshold = 1): Shape {
    const fill = geometry.index ? geometry.toNonIndexed() : geometry;
    const lines = new THREE.EdgesGeometry(fill, threshold);
    normalize([fill, lines], 0.95);
    return { fill, lines, view };
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
    sphere: () =>
        gridShape(
            parametric((u, v) => {
                const phi = u * Math.PI;
                const theta = v * TAU;
                return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
            }, 24, 48),
            24,
            48,
            2,
            4,
            [0.35, 0, 0.25]
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
    tetrahedron: () => solidShape(new THREE.TetrahedronGeometry(1), [0.35, 0.6, 0]),
    cube: () => solidShape(new THREE.BoxGeometry(1, 1, 1), [0.45, 0.6, 0]),
    octahedron: () => solidShape(new THREE.OctahedronGeometry(1), [0.3, 0.5, 0]),
    dodecahedron: () => solidShape(new THREE.DodecahedronGeometry(1), [0.4, 0.3, 0]),
    icosahedron: () => solidShape(new THREE.IcosahedronGeometry(1), [0.3, 0.4, 0])
};

const cache = new Map<string, Shape>();

export const SHAPE_KEYS = Object.keys(surfaces);

export async function loadShape(key: string): Promise<Shape> {
    if (!cache.has(key)) cache.set(key, (surfaces[key] ?? surfaces.cube)());
    return cache.get(key)!;
}
