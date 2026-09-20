// A light static drawing of a figure, inlined in the page. It is what every visitor sees first -
// and all they see if JavaScript never runs, if three.js never arrives or if WebGL is turned off.
// The rendered figure fades over it as soon as a renderer has drawn it.
import { loadShape } from "./shapes";
import { project } from "./project";

/** Points in the sketch: enough for the shape to read, few enough to inline on every page. */
const BUDGET = 900;
/** Strokes to keep whatever the budget says, so a figure is never down to a few scraps. */
const FLOOR = 8;

const sketches = new Map<string, string>();

/** Splits the line geometry back into the strokes it was drawn as, so the sketch can drop
 *  whole iso-lines instead of leaving gaps in every one of them. */
function strokes(positions: Float32Array, index: ArrayLike<number> | null) {
    const segments = index ? index.length / 2 : positions.length / 6;
    const lines: number[][] = [];
    let current: number[] = [];
    let previous = -1;
    for (let segment = 0; segment < segments; segment++) {
        const start = index ? index[segment * 2] : segment * 2;
        const end = index ? index[segment * 2 + 1] : segment * 2 + 1;
        if (start !== previous) {
            current = [start];
            lines.push(current);
        }
        current.push(end);
        previous = end;
    }
    return lines;
}

function thin(line: number[], step: number) {
    if (step < 2) return line;
    const kept = line.filter((_, at) => at % step === 0);
    if (kept[kept.length - 1] !== line[line.length - 1]) kept.push(line[line.length - 1]);
    return kept;
}

/** The figure `key` as a one-path SVG, in the resting orientation the stage gives it. */
export async function figureSketch(key: string) {
    const cached = sketches.get(key);
    if (cached) return cached;

    const shape = await loadShape(key);
    const positions = shape.lines.getAttribute("position").array as Float32Array;
    const { x, y, depth } = project(positions, shape.view);
    const lines = strokes(positions, shape.lines.getIndex()?.array ?? null);
    const points = lines.reduce((total, line) => total + line.length, 0);
    // Whole strokes go first - the ones left keep their shape - and only then are the survivors
    // sampled, which is all a figure drawn as one long curve can do.
    const every = Math.max(1, Math.min(Math.ceil(points / BUDGET), Math.floor(lines.length / FLOOR)));
    // A solid's edges come one segment at a time, and dropping every n-th of those leaves a
    // scatter; they are dropped from the back forward instead, leaving the front of the figure.
    const far = (line: number[]) => line.reduce((total, point) => total + depth[point], 0) / line.length;
    const kept =
        points <= lines.length * 2
            ? lines.sort((one, other) => far(one) - far(other)).slice(0, Math.ceil(lines.length / every))
            : lines.filter((_, at) => at % every === 0);
    const step = Math.ceil(kept.reduce((total, line) => total + line.length, 0) / BUDGET);

    const round = (value: number) => Math.round(value * 1000) / 10;
    const path = kept
        .map(
            (line) =>
                `M${thin(line, step)
                    .map((point) => `${round(x[point])} ${round(y[point])}`)
                    .join("L")}`
        )
        .join("");
    const svg =
        `<svg class="figure-sketch" viewBox="0 0 100 100" aria-hidden="true" focusable="false">` +
        `<path d="${path}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"` +
        ` stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
    sketches.set(key, svg);
    return svg;
}
