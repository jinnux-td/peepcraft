// The UI gallery: every @kit/ui component in every state, on the kit tokens. The theme control switches light, dark and the brands
// (also ?theme=<name> in the address). Exposes the helpers on window.__ui for the browser test.
import { TOKENS_CSS } from '@kit/tokens';
import { ensureUiStyles, segmented, tabs, menu, dialog, tooltip, toaster, setBusy, setError, bindOutput } from '@kit/ui';

const style = document.createElement('style'); style.id = 'k-tokens-css'; style.textContent = TOKENS_CSS; document.head.prepend(style);
ensureUiStyles();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const root = document.documentElement;

const applyTheme = (el: HTMLElement) => {
  root.removeAttribute('data-theme'); root.removeAttribute('data-brand');
  if (el.dataset.setTheme) root.dataset.theme = el.dataset.setTheme;
  if (el.dataset.setBrand) root.dataset.brand = el.dataset.setBrand;
};
const themeGroup = segmented($('theme'), { onSelect: applyTheme });
const wanted = new URLSearchParams(location.search).get('theme');
const options = [...$('theme').children] as HTMLElement[];
const start = Math.max(0, options.findIndex((o) => (o.dataset.setTheme ?? o.dataset.setBrand) === wanted));
themeGroup.select(start); applyTheme(options[start]);

const toggle = $('toggle');
toggle.addEventListener('click', () => { const on = toggle.getAttribute('aria-pressed') !== 'true'; toggle.setAttribute('aria-pressed', String(on)); toggle.textContent = `Toggle (${on ? 'on' : 'off'})`; });
const busy = $('busy');
busy.addEventListener('click', () => { if (busy.getAttribute('aria-busy') === 'true') return; setBusy(busy, true); setTimeout(() => setBusy(busy, false), 1500); });

setError($('f-email'), 'Enter an email address, like name@example.com.');
bindOutput($<HTMLInputElement>('vol'), $<HTMLOutputElement>('vol-out'), (v) => `${v}%`);

segmented($('view'));
tabs($('tabs'));

const dlg = dialog($<HTMLDialogElement>('dialog'));
$('open-dialog').addEventListener('click', (e) => dlg.open(e.currentTarget as HTMLElement));
$('dialog-cancel').addEventListener('click', () => dlg.close('cancel'));
$('dialog-ok').addEventListener('click', () => dlg.close('ok'));

const picked = $('picked');
const actions = menu($('menu-button'), $('menu'), { onSelect: (item) => { picked.textContent = `Picked: ${item.textContent}`; } });
const help = tooltip($('help'), 'Shortcuts and documentation');

const toasts = toaster();
$('toast-info').addEventListener('click', () => toasts.show('Draft saved.'));
$('toast-success').addEventListener('click', () => toasts.show('Payment sent.', { kind: 'success' }));
$('toast-error').addEventListener('click', () => toasts.show('Could not reach the server. Try again.', { kind: 'error', timeout: 0 }));

(window as any).__ui = { themeGroup, actions, dlg, help, toasts };
