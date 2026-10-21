import {ReactNode, useEffect, useRef, useState} from "react";

function getScrollParent(element: HTMLElement | null) {
    for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
        const overflowY = getComputedStyle(parent).overflowY;
        if (overflowY === "auto" || overflowY === "scroll")
            return parent;
    }
    return null;
}

export default function InfiniteScroll({children, hasMore, loading, onLoadMore, loader} : {children: ReactNode, hasMore: boolean, loading: boolean, onLoadMore: () => void, loader?: ReactNode}) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element)
            return;
        // load the next section a bit before reaching the bottom
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {root: getScrollParent(element), rootMargin: "0px 0px 600px 0px"});
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // checked again after each load, in case the bottom is still visible
    useEffect(() => {
        if (inView && hasMore && !loading)
            onLoadMore();
    }, [inView, hasMore, loading, onLoadMore]);

    return (<div className="w-full">
        {children}
        {loading && loader}
        <div ref={ref} aria-hidden={true}/>
    </div>);
}
