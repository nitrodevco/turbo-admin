import { useCallback, useRef, useState } from 'react';

/**
 * The width of an element, followed as it changes: put the ref on it. 0 until it is drawn, and
 * followed again if the element is swapped for another.
 */
export const useWidth = () => {
    const [ width, setWidth ] = useState(0);
    const observer = useRef<ResizeObserver | null>(null);
    const ref = useCallback((element: HTMLDivElement | null) => {
        observer.current?.disconnect();

        if (!element) return;

        observer.current = new ResizeObserver(([ entry ]) => setWidth(entry?.contentRect.width ?? 0));
        observer.current.observe(element);
    }, []);

    return [ width, ref ] as const;
};
