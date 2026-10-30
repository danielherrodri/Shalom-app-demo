import { showDate } from '../api';
import { EmptyState } from '../ui/Primitives';
import { SWAP_LABELS, type ClassSummary, type Swap } from './model';

export type SwapStep = 'confirm' | 'reject' | 'cancel';

export const classLabel = (c: ClassSummary) => `${showDate(c.date)} · ${c.service} (${c.starts_at}) · ${c.group}`;

/** Swaps with the steps each side may take: coordination confirms or rejects, either teacher withdraws. */
export function SwapList({ swaps, busy, coordinator, empty, onStep }: {
  swaps: Swap[]; busy: boolean; coordinator: boolean; empty: string; onStep: (swap: Swap, step: SwapStep) => void;
}) {
  if (!swaps.length) return <EmptyState>{empty}</EmptyState>;
  return <ul className="shalom-list">{swaps.map(swap => {
    const name = `${swap.fromName} a ${swap.toName}, ${showDate(swap.entry.date)}`;
    return <li key={swap.id}>
      <div>
        <strong>{swap.fromName} → {swap.toName}</strong> <span className="shalom-field-hint">· {SWAP_LABELS[swap.status]}</span>
        <p className="shalom-field-hint">{classLabel(swap.entry)}</p>
        {swap.returnEntry && <p className="shalom-field-hint">Intercambio: {swap.toName} devuelve el {classLabel(swap.returnEntry)}</p>}
      </div>
      {swap.status === 'pendiente' && (coordinator ? <>
        <button type="button" disabled={busy} onClick={() => onStep(swap, 'confirm')}>Confirmar permuta de {name}</button>
        <button type="button" className="shalom-secondary" disabled={busy} onClick={() => onStep(swap, 'reject')}>Rechazar permuta de {name}</button>
      </> : <button type="button" className="shalom-secondary" disabled={busy} onClick={() => onStep(swap, 'cancel')}>Retirar permuta de {name}</button>)}
    </li>;
  })}</ul>;
}
