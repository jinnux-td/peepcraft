// The light / dark mode an element is drawn in, read from the cascade rather than passed around: the kit tokens, every brand and a
// host's palette set `color-scheme`, so its computed value is the answer wherever the element sits (a noir brand is dark, a light panel
// inside a dark page is light). JS that draws its own colours (a heat map's ramp, a map's basemap) follows it with watchMode().
export type Mode = 'light' | 'dark';

// From a computed `color-scheme`: one of "light" or "dark" decides; both ("light dark") or none ("normal": the host set nothing)
// follow the system, the default when no host says otherwise.
export function schemeMode(scheme: string, systemDark: boolean): Mode {
  const s = scheme.split(/\s+/), light = s.includes('light'), dark = s.includes('dark');
  return light !== dark ? (dark ? 'dark' : 'light') : systemDark ? 'dark' : 'light';
}
