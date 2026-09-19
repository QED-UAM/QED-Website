// One WebGL renderer for every engraved figure on the page. A transparent canvas covers the
// viewport; each frame, every visible `[data-figure]` element gets its scene drawn into its own
// box (scissor), so a page can show many figures with a single WebGL context.
import * as THREE from "three";
import { loadShape } from "./shapes";

interface View {
    element: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    fill: THREE.Mesh;
    lines: THREE.LineSegments;
    view: [number, number, number];
    phase: number;
    speed: number;
    visible: boolean;
    appear: number;
    key: string;
}

const views: View[] = [];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let renderer: THREE.WebGLRenderer | undefined;
let canvas: HTMLCanvasElement | undefined;
let clock = 0;
let last = performance.now();
let pointer = { x: 0, y: 0 };
let dirty = true;

function color(name: string, fallback: string) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return new THREE.Color(value || fallback);
}

const paper = () => color("--qed-paper", "#f7f8fb");
const ink = () => color("--qed-ink", "#1d3b9c");
// Hidden-line removal: the surface is drawn into the depth buffer only (no color), so it
// hides the lines behind it while the paper and its grid stay visible through it.
const fillMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
});
const lineMaterial = new THREE.LineBasicMaterial({ color: ink(), fog: true });

function ensureRenderer() {
    if (renderer) return renderer;
    canvas = document.createElement("canvas");
    canvas.className = "figure-stage";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setAnimationLoop(loop);

    window.addEventListener(
        "pointermove",
        (event) => {
            if (event.pointerType === "touch") return;
            pointer = { x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 };
        },
        { passive: true }
    );
    const invalidate = () => (dirty = true);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    window.addEventListener("on-theme-change", () => {
        lineMaterial.color = ink();
        for (const view of views) (view.scene.fog as THREE.Fog).color = paper();
        dirty = true;
    });
    return renderer;
}

function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const animate = !reduceMotion.matches;
    const active = views.filter((view) => view.visible && view.element.isConnected);
    if (active.length === 0 || document.hidden) return;
    if (!animate && !dirty) return;
    if (animate) clock += dt;
    dirty = false;

    const r = renderer!;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = r.getSize(new THREE.Vector2());
    if (size.x !== width || size.y !== height) r.setSize(width, height, false);
    // The canvas is absolutely positioned at the top of the document and follows the scroll,
    // which keeps figures in sync with the page better than position: fixed.
    canvas!.style.transform = `translateY(${window.scrollY}px)`;

    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);
    for (const view of active) {
        const rect = view.element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width || rect.width === 0) continue;
        if (animate) view.appear = Math.min(1, view.appear + dt * 2);
        const sway = animate ? Math.sin(clock * view.speed + view.phase) * 0.45 : 0;
        const lean = animate ? { x: pointer.y * 0.3, y: pointer.x * 0.45 } : { x: 0, y: 0 };
        view.group.rotation.set(view.view[0] + lean.x, view.view[1] + sway + lean.y, view.view[2]);
        view.group.scale.setScalar(0.85 + 0.15 * (1 - Math.pow(1 - view.appear, 3)));
        view.camera.aspect = rect.width / rect.height;
        view.camera.updateProjectionMatrix();
        const bottom = height - rect.bottom;
        r.setViewport(rect.left, bottom, rect.width, rect.height);
        r.setScissor(rect.left, bottom, rect.width, rect.height);
        r.render(view.scene, view.camera);
    }
}

const observer = new IntersectionObserver(
    (entries) => {
        for (const entry of entries) {
            const view = views.find((item) => item.element === entry.target);
            if (view) view.visible = entry.isIntersecting;
        }
        dirty = true;
    },
    { rootMargin: "100px" }
);

async function buildView(element: HTMLElement, key: string): Promise<View> {
    const shape = await loadShape(key);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(paper(), 3.6, 6.2);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 4.4);
    const group = new THREE.Group();
    const fill = new THREE.Mesh(shape.fill ?? new THREE.BufferGeometry(), fillMaterial);
    fill.renderOrder = 0;
    const lines = new THREE.LineSegments(shape.lines, lineMaterial);
    lines.renderOrder = 1;
    group.add(fill, lines);
    scene.add(group);
    return {
        element,
        scene,
        camera,
        group,
        fill,
        lines,
        view: shape.view,
        phase: Number(element.dataset.phase ?? Math.random() * TAU_SAFE),
        speed: Number(element.dataset.speed ?? 0.35),
        visible: false,
        appear: reduceMotion.matches ? 1 : 0,
        key
    };
}

const TAU_SAFE = Math.PI * 2;

/** Starts drawing the figure named by `element.dataset.figure` inside `element`. */
export async function mountFigure(element: HTMLElement) {
    ensureRenderer();
    const view = await buildView(element, element.dataset.figure ?? "cube");
    views.push(view);
    observer.observe(element);
    dirty = true;
    return view;
}

/** Replaces the shape drawn in a mounted figure (e.g. the hero's click-to-change). */
export async function setFigure(element: HTMLElement, key: string) {
    const view = views.find((item) => item.element === element);
    if (!view) return;
    const shape = await loadShape(key);
    view.fill.geometry = shape.fill ?? new THREE.BufferGeometry();
    view.lines.geometry = shape.lines;
    view.view = shape.view;
    view.key = key;
    view.appear = reduceMotion.matches ? 1 : 0;
    element.dataset.figure = key;
    dirty = true;
}

/** Mounts every figure on the page once it's close to the viewport. */
export function mountAll(root: ParentNode = document) {
    const lazy = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                lazy.unobserve(entry.target);
                mountFigure(entry.target as HTMLElement).catch((error) => console.warn("[figure]", error));
            }
        },
        { rootMargin: "300px" }
    );
    root.querySelectorAll<HTMLElement>("[data-figure]:not([data-figure-mounted])").forEach((element) => {
        element.dataset.figureMounted = "";
        lazy.observe(element);
    });
}
