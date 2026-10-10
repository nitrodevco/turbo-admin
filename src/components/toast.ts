import { create } from 'zustand';

export interface Toast {
    id: number;
    tone: 'good' | 'bad';
    text: string;
}

interface ToastState {
    toasts: Toast[];
    push: (tone: Toast['tone'], text: string) => void;
    dismiss: (id: number) => void;
}

let nextId = 1;

/** The panel's short notes: what an action did, or why the server refused it. Shown by `Toasts`, mounted once in the shell. */
export const useToasts = create<ToastState>(set => ({
    toasts: [],
    push: (tone, text) => {
        const id = nextId++;

        set(state => ({ toasts: [ ...state.toasts.slice(-3), { id, tone, text } ] }));
        setTimeout(() => set(state => ({ toasts: state.toasts.filter(x => x.id !== id) })), tone === 'bad' ? 6000 : 2600);
    },
    dismiss: id => set(state => ({ toasts: state.toasts.filter(x => x.id !== id) })),
}));

export const toast = (text: string) => useToasts.getState().push('good', text);

/** A refusal's words: the server's own when it gave them. */
export const toastError = (error: unknown) => useToasts.getState().push('bad', error instanceof Error ? error.message : 'That didn\'t work.');

const BURST_COLOURS = [ '#ffcc00', '#4fd1c5', '#ff6b9a', '#7048e8', '#5bd68a', '#ff9f43' ];

/**
 * A little burst of confetti from an element: for a publish, the moment a catalog goes in front
 * of players. Skipped for anyone who asked for less motion.
 */
export const celebrate = (from: HTMLElement | null) => {
    if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        return;

    const box = from.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;

    for (let i = 0; i < 36; i++) {
        const bit = document.createElement('span');
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 140;
        const size = 5 + Math.random() * 5;

        Object.assign(bit.style, {
            position: 'fixed',
            left: `${x}px`,
            top: `${y}px`,
            width: `${size}px`,
            height: `${size * (Math.random() > 0.5 ? 1 : 0.45)}px`,
            background: BURST_COLOURS[i % BURST_COLOURS.length],
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: '60',
        });
        document.body.appendChild(bit);
        bit.animate(
            [
                { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance + 80}px)) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
            ],
            { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
        ).onfinish = () => bit.remove();
    }
};
