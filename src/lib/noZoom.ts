/**
 * Keeps phones from zooming the page, which the viewport's `user-scalable=no` asks for but iOS
 * Safari has ignored since iOS 10: its pinch arrives as `gesture*` events (cancelled here) and as
 * a two-finger `touchmove` (cancelled while it scales). Double-tap zoom is turned off in CSS
 * (`touch-action: manipulation`), and focusing a field no longer zooms because fields are 16px on
 * phones (`index.css`).
 */
export const stopPhoneZoom = () => {
    const cancel = (event: Event) => event.preventDefault();

    for (const name of [ 'gesturestart', 'gesturechange', 'gestureend' ])
        document.addEventListener(name, cancel, { passive: false });

    document.addEventListener('touchmove', (event) => {
        // `scale` is Safari's; elsewhere two fingers is what a pinch looks like.
        const scale = (event as TouchEvent & { scale?: number }).scale;

        if ((scale !== undefined && scale !== 1) || event.touches.length > 1)
            event.preventDefault();
    }, { passive: false });
};
