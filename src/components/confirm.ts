import { create } from 'zustand';

export interface Question {
    /** The question itself, short: "Delete the backup Summer?" */
    title: string;
    /** What follows from it, in a sentence or two. */
    body?: string;
    /** The button that goes ahead; "Continue" unless named. */
    confirm?: string;
    /** Red for what can't be taken back; found from the question's first word unless set. */
    danger?: boolean;
}

export interface Asking extends Required<Omit<Question, 'body'>> {
    body?: string;
    answer: (yes: boolean) => void;
}

export const useAsking = create<{ asking: Asking | null; set: (asking: Asking | null) => void }>(set => ({
    asking: null,
    set: asking => set({ asking }),
}));

/** Words a question starts with when it takes something away. */
const DANGER = /^(delete|remove|throw|discard|ban|kick|shut|reset|revoke|take|unload|end|clear|roll|disconnect|call off|forget|wipe|replace|overwrite)\b/i;

/**
 * A question as a line of text, split the way the panel writes them: up to the first question
 * mark is the question, the rest is what it means.
 */
const questionOf = (question: string | Question): Question => {
    if (typeof question !== 'string')
        return question;

    const end = question.indexOf('?');

    return end < 0 || end === question.length - 1
        ? { title: question }
        : { title: question.slice(0, end + 1), body: question.slice(end + 1).trim() };
};

/** Asks, and answers true when the viewer goes ahead. */
export const confirmAsync = (question: string | Question) => new Promise<boolean>((resolve) => {
    const asked = questionOf(question);
    const previous = useAsking.getState().asking;

    // A second question replaces the first, which counts as turned down.
    previous?.answer(false);
    useAsking.getState().set({
        title: asked.title,
        body: asked.body,
        confirm: asked.confirm ?? 'Continue',
        danger: asked.danger ?? DANGER.test(asked.title),
        answer: (yes) => {
            useAsking.getState().set(null);
            resolve(yes);
        },
    });
});

/** Asks, and runs `then` only if the viewer goes ahead: the panel's stand-in for `window.confirm`. */
export const ask = (question: string | Question, then: () => void) => {
    void confirmAsync(question).then(yes => yes && then());
};
