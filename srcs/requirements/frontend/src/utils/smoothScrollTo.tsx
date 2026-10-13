const running = new WeakMap<HTMLElement, number>();

export default function smoothScrollTo(element: HTMLElement, left: number, duration=400) {
    const start = element.scrollLeft;
    const target = Math.max(0, Math.min(left, element.scrollWidth - element.clientWidth));
    const distance = target - start;

    cancelAnimationFrame(running.get(element) ?? 0);
    if (Math.abs(distance) < 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        element.scrollLeft = target;
        return;
    }

    const startTime = performance.now();
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        element.scrollLeft = start + distance * ease(progress);
        if (progress < 1)
            running.set(element, requestAnimationFrame(step));
    };
    running.set(element, requestAnimationFrame(step));
}
