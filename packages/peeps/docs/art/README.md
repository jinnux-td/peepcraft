# Source art

The two original packs by Pablo Stanley that the kit's drawings are made from. Both are CC0 (public domain).

| Folder | Pack | Used by |
|---|---|---|
| `Flat Assets/` | Open Peeps: `Separate Atoms/` (heads, faces, bodies, poses…) and `Templates/` (302 ready-made peeps) | `@kit/peeps` (`PEEPS_ASSETS` for the template check), the portfolio's PeepCraft cover (`portfolio/tools/art.sh`) |
| `transhumans art/` | Transhumans: `SVG/`, `PNG/`, `PSD/` | `@kit/transhumans` (`scripts/build-figures.ts`), the portfolio's work covers (`portfolio/tools/art.sh`) |

PNG and PSD files are stored with Git LFS (`.gitattributes` at the kit root); run `git lfs install` once on a new machine before cloning.
The packages ship their own generated code, never these files.

```bash
PEEPS_ASSETS="docs/art/Flat Assets" npm test                                   # in packages/peeps
node scripts/build-figures.ts "../peeps/docs/art/transhumans art/SVG"          # in packages/transhumans
```
