const running = new WeakMap<HTMLElement, number>();

export default function smoothScrollTo(element: HTMLElement, left: number, duration=400) {
    const start = element.scrollLeft;
    const target = Math.max(0, Math.min(left, element.scrollWidth - element.clientWidth));
    const distance = target - start;
    console.log("TEST SCROLL WIDTH", element.scrollLeft, target, left, distance);

    cancelAnimationFrame(running.get(element) ?? 0);
    if (Math.abs(distance) < 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        element.scrollLeft = target;
        return;
    }

    // the animation advances by the time of each frame, capped: when the page is busy (e.g. rendering the tab that was
    // just clicked) the scroll waits instead of jumping forward to catch up
    let elapsed = 0;
    let lastTime: number | undefined;
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now: number) => {
        if (lastTime !== undefined)
            elapsed += Math.min(now - lastTime, 32);
        lastTime = now;
        const progress = Math.min(elapsed / duration, 1);
        element.scrollLeft = start + distance * ease(progress);
        console.log("TEST", element.scrollLeft, start, ease(progress), progress, elapsed);
        if (progress < 1)
            running.set(element, requestAnimationFrame(step));
    };
    running.set(element, requestAnimationFrame(step));
}
