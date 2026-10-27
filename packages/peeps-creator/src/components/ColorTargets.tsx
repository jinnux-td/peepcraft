import { useState } from 'react'
import type { ColorTarget } from '../colors.ts'
import { Swatches } from './Swatches.tsx'

/** A token per colour (its dot shows the colour now, its name below), then one row of swatches for the picked one. */
/** `compact` draws the tokens as one row of dots (names for screen readers and tooltips), the picked name above its swatches: for a tight panel. */
export function ColorTargets({ targets, used, compact = false }: { targets: ColorTarget[]; used: readonly string[]; compact?: boolean }) {
  const [role, pick] = useState(targets[0].id)
  const t = targets.find((x) => x.id === role) ?? targets.find((x) => x.id === 'paper') ?? targets[0]
  return (
    <div className={compact ? 'pc-colors pc-compact' : 'pc-colors'}>
      <span className="pc-label">Colours</span>
      <div className="pc-tokens" role="radiogroup" aria-label="Colour of">
        {targets.map((x) => (
          <button key={x.id} role="radio" aria-checked={x.id === t.id} className="pc-token" data-tip={`${x.label} ${x.value}`} onClick={() => pick(x.id)}>
            <i style={{ background: x.value }} data-changed={x.reset ? '' : undefined} /><span>{x.label}</span>
          </button>
        ))}
      </div>
      <div className="pc-picked">
        <Swatches label={t.label} value={t.value} options={t.options} used={used} onChange={t.onChange} />
        {t.reset && <button className="pc-link" onClick={t.reset.run}>{t.reset.label}</button>}
      </div>
    </div>
  )
}
