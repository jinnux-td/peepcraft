// The seams between the packages: each declares its own copy of a shape, so none imports the other. If the copies drift apart,
// this file stops compiling (npm run typecheck).

// A transhumans figure is Art a peeps Scene can place.
import type { Art } from '@kit/peeps';
import { lookup as lookupFigure } from '@kit/transhumans';
export const figureIsArt: Art = lookupFigure('runner');

// A thing of @kit/things is Art too.
import { lookup as lookupThing } from '@kit/things';
export const thingIsArt: Art = lookupThing('chair');
