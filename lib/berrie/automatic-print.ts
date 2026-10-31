import { reduceAction, type Action, type State } from './domain.ts';

/** Prototype adapter: record attempts after a successful business commit; no physical printer. */
export function recordAutomaticPrints(before: State, committed: State, action: Action, operation: string): { state: State; error?: string } {
    if (!['process', 'settle'].includes(action.kind)) return { state: committed };
    const order = committed.orders.find(x => x.id === action.order);
    if (!order || order.late) return { state: committed };
    const previous = before.orders.find(x => x.id === order.id);
    const jobs = order.batches.filter(batch => !previous?.batches.some(x => x.number === batch.number)).map(batch => ({ target: 'Dapur saja', batch: batch.number, key: `kitchen:${batch.number}` }));
    if (action.kind === 'settle' && order.settlement && !previous?.settlement) jobs.push({ target: 'Pelanggan saja', batch: 0, key: 'customer' });
    let state = committed;
    for (const job of jobs) {
        const current = state.orders.find(x => x.id === order.id)!;
        const print: Action = { kind: 'print', activity: 'Rutin', order: current.id, revision: current.revision, data: { target: job.target, batch: job.batch, stage: 'attempt' }, reason: '', amount: 0 };
        const printOperation = `${operation}:print:${job.key}`;
        // Re-checking the original committed result must never resend a physical job.
        if (state.operations[printOperation]) continue;
        try { state = reduceAction(state, print, printOperation); }
        catch (error) { return { state, error: error instanceof Error ? error.message : String(error) }; }
    }
    return { state };
}
