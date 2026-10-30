// The few behaviours native elements do not give: roving focus in a tab list or a segmented control, a menu's keyboard and placement,
// a dialog that hands focus back, a tooltip, a toast region. Each helper takes elements the host already wrote (real buttons, a real
// <dialog>), adds only ARIA state and listeners, and returns a way to drive it and to remove it. Decisions live in keys.ts and place.ts.
import { UI_CSS } from './css.ts';
import { step, typeahead, type Orientation } from './keys.ts';
import { place, type Align, type Side } from './place.ts';

// The stylesheet, added to the document once. The host also loads the kit tokens (TOKENS_CSS from @kit/tokens, or tokens.css).
export function ensureUiStyles(doc: Document = document): void {
  if (doc.getElementById('k-ui-css')) return;
  const s = doc.createElement('style'); s.id = 'k-ui-css'; s.textContent = UI_CSS; doc.head.append(s);
}

let seq = 0;
const idOf = (el: HTMLElement, prefix: string) => el.id || (el.id = `${prefix}-${++seq}`);
const isDisabled = (el: Element) => (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';

export interface Group { select(index: number, focus?: boolean): void; readonly index: number; destroy(): void }

// One selected item among siblings, one tab stop (roving tabindex). Arrow keys move and select; Home and End go to the ends; a click selects.
function roving(root: HTMLElement, role: 'tab' | 'radio', attr: 'aria-selected' | 'aria-checked', orientation: Orientation, onSelect?: (el: HTMLElement, i: number) => void): Group {
  const items = () => [...root.children].filter((c): c is HTMLElement => c.getAttribute('role') === role);
  let index = Math.max(0, items().findIndex((el) => el.getAttribute(attr) === 'true'));
  const apply = () => items().forEach((el, i) => {
    el.setAttribute(attr, String(i === index)); el.tabIndex = i === index ? 0 : -1;
    const panel = role === 'tab' && el.getAttribute('aria-controls') ? root.ownerDocument.getElementById(el.getAttribute('aria-controls')!) : null;
    if (panel) panel.hidden = i !== index;
  });
  const select = (i: number, focus = false) => {
    const list = items(); if (!list[i] || isDisabled(list[i])) return;
    const changed = i !== index; index = i; apply();
    if (focus) list[i].focus();
    if (changed) onSelect?.(list[i], i);
  };
  const onKey = (e: KeyboardEvent) => {
    const list = items(), at = list.indexOf(e.target as HTMLElement);
    if (at < 0) return;
    const next = step(at, e.key, list.length, orientation, (i) => isDisabled(list[i]));
    if (next === null) return;
    e.preventDefault(); select(next, true);
  };
  const onClick = (e: MouseEvent) => { const i = items().indexOf((e.target as Element).closest(`[role=${role}]`) as HTMLElement); if (i >= 0) select(i); };
  root.addEventListener('keydown', onKey); root.addEventListener('click', onClick);
  apply();
  return { select, get index() { return index; }, destroy() { root.removeEventListener('keydown', onKey); root.removeEventListener('click', onClick); } };
}

// Tabs: role=tablist holding role=tab buttons; each tab's aria-controls names its panel, and only the selected panel is shown.
export const tabs = (list: HTMLElement, o: { orientation?: 'horizontal' | 'vertical'; onSelect?(tab: HTMLElement, index: number): void } = {}): Group =>
  roving(list, 'tab', 'aria-selected', o.orientation ?? 'horizontal', o.onSelect);

// Segmented control: role=radiogroup holding role=radio buttons. Every arrow key moves and picks, as in a native radio group.
export const segmented = (group: HTMLElement, o: { onSelect?(item: HTMLElement, index: number): void } = {}): Group =>
  roving(group, 'radio', 'aria-checked', 'both', o.onSelect);

// Places a top-layer element next to its anchor, flipped and kept in the viewport.
function position(anchor: HTMLElement, pop: HTMLElement, side: Side, align: Align) {
  const a = anchor.getBoundingClientRect(), p = pop.getBoundingClientRect(), view = pop.ownerDocument.documentElement;
  const at = place(a, p, { width: view.clientWidth, height: view.clientHeight }, side, align);
  pop.style.top = `${at.top}px`; pop.style.left = `${at.left}px`; pop.dataset.side = at.side;
}

export interface Menu { open(focus?: 'first' | 'last'): void; close(): void; readonly isOpen: boolean; destroy(): void }

// Menu: a button that opens a [popover] holding role=menuitem (or menuitemradio / menuitemcheckbox) buttons.
// Down, Enter or Space opens on the first item, Up on the last; arrows, Home, End and typeahead move; Esc, Tab or a click outside closes;
// picking an item calls onSelect and hands focus back to the button. Placed below the button, flipped above at the bottom edge.
export function menu(button: HTMLElement, pop: HTMLElement, o: { onSelect?(item: HTMLElement): void; side?: Side; align?: Align } = {}): Menu {
  const doc = button.ownerDocument, win = doc.defaultView!;
  pop.popover = 'manual'; pop.setAttribute('role', 'menu'); pop.classList.add('k-menu');
  button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', idOf(pop, 'k-menu'));
  if (!pop.hasAttribute('aria-label') && !pop.hasAttribute('aria-labelledby')) pop.setAttribute('aria-labelledby', idOf(button, 'k-menu-button'));
  const items = () => [...pop.querySelectorAll<HTMLElement>('[role^=menuitem]')];
  let isOpen = false, typed = '', typedAt = 0;
  const reposition = () => position(button, pop, o.side ?? 'bottom', o.align ?? 'start');
  const open = (focus: 'first' | 'last' = 'first') => {
    if (!isOpen) { pop.showPopover(); isOpen = true; button.setAttribute('aria-expanded', 'true'); reposition(); win.addEventListener('resize', reposition); win.addEventListener('scroll', reposition, true); }
    const list = items().filter((el) => !isDisabled(el));
    list.forEach((el) => (el.tabIndex = -1));
    (focus === 'first' ? list[0] : list[list.length - 1])?.focus();
  };
  const close = (returnFocus = true) => {
    if (!isOpen) return;
    pop.hidePopover(); isOpen = false; button.setAttribute('aria-expanded', 'false');
    win.removeEventListener('resize', reposition); win.removeEventListener('scroll', reposition, true);
    if (returnFocus) button.focus();
  };
  const pick = (item: HTMLElement) => {
    if (isDisabled(item)) return;
    const role = item.getAttribute('role');
    if (role === 'menuitemcheckbox') item.setAttribute('aria-checked', String(item.getAttribute('aria-checked') !== 'true'));
    if (role === 'menuitemradio') { for (const r of items()) if (r.getAttribute('role') === 'menuitemradio') r.setAttribute('aria-checked', String(r === item)); }
    o.onSelect?.(item); close();
  };
  const onButtonClick = () => (isOpen ? close() : open('first'));
  const onButtonKey = (e: KeyboardEvent) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(e.key === 'ArrowDown' ? 'first' : 'last'); } };
  const onMenuKey = (e: KeyboardEvent) => {
    const list = items(), at = list.indexOf(doc.activeElement as HTMLElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') { close(false); return; }
    if ((e.key === 'Enter' || e.key === ' ') && at >= 0) { e.preventDefault(); pick(list[at]); return; }
    const next = step(at < 0 ? 0 : at, e.key, list.length, 'vertical', (i) => isDisabled(list[i]));
    if (next !== null) { e.preventDefault(); list[next].focus(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now(); typed = now - typedAt > 500 ? e.key : typed + e.key; typedAt = now;
      const hit = typeahead(list.map((el) => (isDisabled(el) ? '' : el.textContent ?? '')), at < 0 ? -1 : at, typed);
      if (hit !== null) list[hit].focus();
    }
  };
  const onMenuClick = (e: MouseEvent) => { const item = (e.target as Element).closest<HTMLElement>('[role^=menuitem]'); if (item) pick(item); };
  const onOutside = (e: PointerEvent) => { if (isOpen && !pop.contains(e.target as Node) && !button.contains(e.target as Node)) close(false); };
  button.addEventListener('click', onButtonClick); button.addEventListener('keydown', onButtonKey);
  pop.addEventListener('keydown', onMenuKey); pop.addEventListener('click', onMenuClick); doc.addEventListener('pointerdown', onOutside, true);
  return {
    open, close: () => close(), get isOpen() { return isOpen; },
    destroy() {
      close(false); button.removeEventListener('click', onButtonClick); button.removeEventListener('keydown', onButtonKey);
      pop.removeEventListener('keydown', onMenuKey); pop.removeEventListener('click', onMenuClick); doc.removeEventListener('pointerdown', onOutside, true);
    },
  };
}

export interface Dialog { open(opener?: HTMLElement | null): void; close(value?: string): void; destroy(): void }

// Dialog: a real <dialog> opened modal. Esc closes (native); a click on the backdrop closes unless dismissible is false;
// focus goes back to whatever opened it. The first .k-dialog-title names it. On a phone the CSS turns it into a bottom sheet.
export function dialog(dlg: HTMLDialogElement, o: { dismissible?: boolean } = {}): Dialog {
  dlg.classList.add('k-dialog');
  const title = dlg.querySelector<HTMLElement>('.k-dialog-title');
  if (title && !dlg.hasAttribute('aria-labelledby') && !dlg.hasAttribute('aria-label')) dlg.setAttribute('aria-labelledby', idOf(title, 'k-dialog-title'));
  let opener: HTMLElement | null = null;
  const onClose = () => { if (opener?.isConnected) opener.focus(); opener = null; };
  const onClick = (e: MouseEvent) => {
    if (o.dismissible === false || e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  };
  dlg.addEventListener('close', onClose); dlg.addEventListener('click', onClick);
  return {
    open(from) { opener = from ?? (dlg.ownerDocument.activeElement as HTMLElement | null); if (!dlg.open) dlg.showModal(); },
    close(value) { dlg.close(value); },
    destroy() { dlg.removeEventListener('close', onClose); dlg.removeEventListener('click', onClick); },
  };
}

export interface Tooltip { set(text: string): void; destroy(): void }

// Tooltip: extra words for a control, shown on hover (only where the device hovers) and on keyboard focus, hidden on leave, blur or Esc.
// Linked with aria-describedby, so a screen reader hears it too. Never put the only copy of information in one.
export function tooltip(trigger: HTMLElement, text: string, o: { side?: Side } = {}): Tooltip {
  const doc = trigger.ownerDocument, win = doc.defaultView!;
  const tip = doc.createElement('div');
  tip.className = 'k-tip'; tip.popover = 'manual'; tip.setAttribute('role', 'tooltip'); tip.textContent = text;
  doc.body.append(tip);
  const id = idOf(tip, 'k-tip');
  trigger.setAttribute('aria-describedby', [trigger.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
  const show = () => { if (!tip.matches(':popover-open')) tip.showPopover(); position(trigger, tip, o.side ?? 'top', 'center'); };
  const hide = () => { if (tip.matches(':popover-open')) tip.hidePopover(); };
  const onEnter = () => { if (win.matchMedia('(hover:hover)').matches) show(); };
  const onFocus = () => { if (trigger.matches(':focus-visible')) show(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
  trigger.addEventListener('pointerenter', onEnter); trigger.addEventListener('pointerleave', hide);
  trigger.addEventListener('focus', onFocus); trigger.addEventListener('blur', hide); doc.addEventListener('keydown', onKey);
  return {
    set(t) { tip.textContent = t; },
    destroy() {
      trigger.removeEventListener('pointerenter', onEnter); trigger.removeEventListener('pointerleave', hide);
      trigger.removeEventListener('focus', onFocus); trigger.removeEventListener('blur', hide); doc.removeEventListener('keydown', onKey);
      trigger.setAttribute('aria-describedby', (trigger.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x && x !== id).join(' '));
      tip.remove();
    },
  };
}

export type ToastKind = 'info' | 'success' | 'error';
export interface Toaster { show(text: string, o?: { kind?: ToastKind; timeout?: number }): HTMLElement; clear(): void }

// Toasts: one polite live region (role=status), made before the first message so screen readers listen to it. A toast goes away
// after `timeout` ms (0 keeps it), waits while hovered or focused, and has a dismiss button. An error that needs action is not a toast.
export function toaster(doc: Document = document): Toaster {
  let region = doc.querySelector<HTMLElement>('.k-toasts');
  if (!region) {
    region = doc.createElement('div'); region.className = 'k-toasts';
    region.setAttribute('role', 'status'); region.setAttribute('aria-live', 'polite');
    doc.body.append(region);
  }
  const root = region;
  return {
    show(text, { kind = 'info', timeout = 5000 } = {}) {
      const el = doc.createElement('div'), p = doc.createElement('p'), x = doc.createElement('button');
      el.className = 'k-toast'; el.dataset.kind = kind; p.textContent = text;
      x.type = 'button'; x.className = 'k-btn'; x.dataset.variant = 'ghost'; x.dataset.size = 'sm'; x.dataset.icon = ''; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
      x.addEventListener('click', () => el.remove());
      el.append(p, x); root.append(el);
      if (timeout > 0) {
        let timer = setTimeout(() => el.remove(), timeout);
        const hold = () => clearTimeout(timer), resume = () => { if (!el.matches(':hover,:focus-within')) timer = setTimeout(() => el.remove(), timeout); };
        el.addEventListener('pointerenter', hold); el.addEventListener('focusin', hold);
        el.addEventListener('pointerleave', resume); el.addEventListener('focusout', resume);
      }
      return el;
    },
    clear() { root.replaceChildren(); },
  };
}

// A button that is working: aria-busy shows the spinner in place of the label (the width does not change) and blocks it.
export function setBusy(button: HTMLElement, busy: boolean): void {
  if (busy) { button.setAttribute('aria-busy', 'true'); button.setAttribute('aria-disabled', 'true'); }
  else { button.removeAttribute('aria-busy'); button.removeAttribute('aria-disabled'); }
}

// A field's error: sets aria-invalid and the text of its .k-error, linked by aria-describedby (made if the field has none). null clears it.
export function setError(input: HTMLElement, message: string | null): void {
  const field = input.closest('.k-field') ?? input.parentElement!;
  let err = field.querySelector<HTMLElement>('.k-error');
  if (!err) { err = input.ownerDocument.createElement('p'); err.className = 'k-error'; field.append(err); }
  const id = idOf(err, 'k-error'), ids = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  if (!ids.includes(id)) input.setAttribute('aria-describedby', [...ids, id].join(' '));
  err.textContent = message ?? '';
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

// A slider's value in words, kept in its <output> as it moves.
export function bindOutput(range: HTMLInputElement, output: HTMLOutputElement, format: (v: number) => string = String): () => void {
  const sync = () => { output.value = format(range.valueAsNumber); };
  range.addEventListener('input', sync); sync();
  return () => range.removeEventListener('input', sync);
}
