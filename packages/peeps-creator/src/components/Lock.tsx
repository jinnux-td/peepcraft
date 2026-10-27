import { icons } from './icons.tsx'

/** Keeps the background or a part as it is when "Shuffle all" is pressed. */
export function Lock({ what, locked, onToggle }: { what: string; locked: boolean; onToggle: () => void }) {
  const I = locked ? icons.lock : icons.unlock
  return (
    <button className="pc-lock" aria-pressed={locked} aria-label={`Lock ${what}`} title={locked ? `${what} is kept when shuffling all` : `Keep ${what.toLowerCase()} when shuffling all`} onClick={onToggle}>
      <I />
    </button>
  )
}
