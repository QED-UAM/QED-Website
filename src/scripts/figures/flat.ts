// The engraved figures without WebGL: the same shapes and the same camera, projected on the CPU
// and drawn into a 2D canvas inside each figure. Surfaces erase whatever was drawn behind them,
// which stands in for the depth buffer and keeps the hidden-line look. The drawing is still -
// repainting costs a few milliseconds, so it only happens on a resize, a theme change or a new
// shape, never frame by frame.
import { loadShape, type Shape } from "./shapes";
import { fade, project, type Mesh, type Projected } from "./project";

interface Drawing {
    element: HTMLElement;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    shape: Shape;
}

const drawings: Drawing[] = [];
let sizes: ResizeObserver | undefined;
let queued = false;

const ink = () =>
    getComputedStyle(document.documentElement).getPropertyValue("--qed-ink").trim() || "#1d3b9c";

function mesh(geometry: Shape["lines"] | undefined): Mesh | null {
    if (!geometry) return null;
    const position = geometry.getAttribute("position");
    if (!position) return null;
    return { positions: position.array as Float32Array, index: geometry.getIndex()?.array ?? null };
}

const vertex = (from: Mesh, slot: number) => (from.index ? from.index[slot] : slot);

/** Erases everything already drawn inside a triangle: the stand-in for the depth buffer. */
function erase(context: CanvasRenderingContext2D, view: Projected, from: Mesh, triangle: number, box: Box) {
    const xs = [0, 0, 0];
    const ys = [0, 0, 0];
    for (let corner = 0; corner < 3; corner++) {
        const point = vertex(from, triangle * 3 + corner);
        xs[corner] = view.x[point] * box.width;
        ys[corner] = view.y[point] * box.height;
    }
    if (
        Math.max(...xs) < 0 ||
        Math.min(...xs) > box.width ||
        Math.max(...ys) < 0 ||
        Math.min(...ys) > box.height
    )
        return;
    context.beginPath();
    context.moveTo(xs[0], ys[0]);
    context.lineTo(xs[1], ys[1]);
    context.lineTo(xs[2], ys[2]);
    context.closePath();
    context.fill();
}

function stroke(context: CanvasRenderingContext2D, view: Projected, from: Mesh, segment: number, box: Box) {
    const start = vertex(from, segment * 2);
    const end = vertex(from, segment * 2 + 1);
    const alpha = fade((view.depth[start] + view.depth[end]) / 2);
    if (alpha < 0.04) return;
    context.globalAlpha = alpha;
    context.beginPath();
    context.moveTo(view.x[start] * box.width, view.y[start] * box.height);
    context.lineTo(view.x[end] * box.width, view.y[end] * box.height);
    context.stroke();
}

interface Box {
    width: number;
    height: number;
}

function paint(drawing: Drawing) {
    const { element, canvas, context, shape } = drawing;
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const box: Box = { width: Math.round(rect.width * ratio), height: Math.round(rect.height * ratio) };
    if (canvas.width !== box.width || canvas.height !== box.height) {
        canvas.width = box.width;
        canvas.height = box.height;
    }
    context.clearRect(0, 0, box.width, box.height);

    const surface = mesh(shape.fill);
    const wire = mesh(shape.lines);
    if (!wire) return;
    const aspect = rect.width / rect.height;
    const lines = project(wire.positions, shape.view, aspect);
    const faces = surface ? project(surface.positions, shape.view, aspect) : null;

    // One list of triangles and line segments, drawn from the farthest to the nearest.
    const triangles = surface ? (surface.index ? surface.index.length / 3 : surface.positions.length / 9) : 0;
    const segments = wire.index ? wire.index.length / 2 : wire.positions.length / 6;
    const order = new Uint32Array(triangles + segments);
    const depth = new Float32Array(order.length);
    for (let triangle = 0; triangle < triangles; triangle++) {
        order[triangle] = triangle;
        // Farthest corner, so a surface is drawn before the lines that run along it and never
        // rubs out its own edges - what polygon offset does for the WebGL stage.
        depth[triangle] = Math.max(
            faces!.depth[vertex(surface!, triangle * 3)],
            faces!.depth[vertex(surface!, triangle * 3 + 1)],
            faces!.depth[vertex(surface!, triangle * 3 + 2)]
        );
    }
    for (let segment = 0; segment < segments; segment++) {
        order[triangles + segment] = triangles + segment;
        depth[triangles + segment] =
            (lines.depth[vertex(wire, segment * 2)] + lines.depth[vertex(wire, segment * 2 + 1)]) / 2;
    }
    order.sort((one, other) => depth[other] - depth[one]);

    context.lineWidth = Math.max(1, ratio * 0.8);
    context.lineCap = "round";
    context.strokeStyle = ink();
    let erasing = false;
    for (const item of order) {
        if (item < triangles) {
            if (!erasing) {
                context.globalCompositeOperation = "destination-out";
                context.globalAlpha = 1;
                erasing = true;
            }
            erase(context, faces!, surface!, item, box);
        } else {
            if (erasing) {
                context.globalCompositeOperation = "source-over";
                erasing = false;
            }
            stroke(context, lines, wire, item - triangles, box);
        }
    }
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    canvas.style.opacity = "1";
    element.dataset.figureReady = "";
}

function repaint() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        for (const drawing of drawings) paint(drawing);
    });
}

function watch(element: HTMLElement) {
    if (!sizes) {
        sizes = new ResizeObserver(repaint);
        window.addEventListener("on-theme-change", repaint);
    }
    sizes.observe(element);
}

/** Draws the figure named by `key` inside `element`, once. */
export async function mountFlat(element: HTMLElement, key: string) {
    if (drawings.some((drawing) => drawing.element === element)) return;
    const canvas = document.createElement("canvas");
    canvas.className = "figure-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    // Without a 2D context either, the static sketch in the markup is all there is to show.
    if (!context) return;
    element.appendChild(canvas);
    const drawing: Drawing = { element, canvas, context, shape: await loadShape(key) };
    drawings.push(drawing);
    watch(element);
    paint(drawing);
}

/** Replaces the shape drawn in a figure (the hero's click-to-change). */
export async function setFlatFigure(element: HTMLElement, key: string) {
    const drawing = drawings.find((item) => item.element === element);
    if (!drawing) return;
    drawing.shape = await loadShape(key);
    element.dataset.figure = key;
    paint(drawing);
}
