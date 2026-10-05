import type { ReactNode } from 'react';

/** The card the signed-out pages (sign-in, setup) sit in. */
export const AuthCard = ({ title, children }: { title: string; children: ReactNode }) => (
    <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-sm animate-rise rounded-xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-accent font-mono text-base font-bold text-on-accent">T</span>
                <span className="font-mono text-xs font-medium tracking-[0.08em] text-muted uppercase">Turbo Admin</span>
            </div>
            <h1 className="mt-6 text-xl font-semibold tracking-tight">{title}</h1>
            <div className="mt-4">{children}</div>
        </div>
    </main>
);
