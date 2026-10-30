// The kit's shared controls (docs/ui/components.md), as one stylesheet on native elements. Every value is a kit token (--k-*, from
// @kit/tokens) or computed from one; the host loads the tokens (TOKENS_CSS or tokens.css). Variants and sizes are data attributes,
// and states come from the element itself (:disabled, aria-pressed, aria-checked, aria-selected, aria-invalid, aria-busy), never
// from a separate class. Hover lives under (hover:hover) only. Classes start with `k-`.
const ring = 'outline:2px solid var(--k-focus);outline-offset:2px';
const motion = 'transition:background-color var(--k-dur-fast) var(--k-ease-out),border-color var(--k-dur-fast) var(--k-ease-out),color var(--k-dur-fast) var(--k-ease-out),box-shadow var(--k-dur-fast) var(--k-ease-out)';
// a small round badge before a status message: "!" for an error, and so on (the word is in the message itself)
const badge = (bg: string, fg: string, glyph: string) => `content:"${glyph}";flex:none;display:inline-grid;place-items:center;width:1.25em;height:1.25em;border-radius:var(--k-radius-full);background:${bg};color:${fg};font-weight:700;font-size:.85em;line-height:1`;

export const UI_CSS = `
:where(.k-btn,.k-input,.k-check,.k-switch,.k-slider,.k-seg,.k-tabs,.k-card,.k-chip,.k-dialog,.k-menu,.k-tip,.k-toasts,.k-toast,.k-skeleton,.k-spinner,.k-empty,.k-banner),
:where(.k-btn,.k-input,.k-check,.k-switch,.k-slider,.k-seg,.k-tabs,.k-card,.k-chip,.k-dialog,.k-menu,.k-tip,.k-toasts,.k-toast,.k-skeleton,.k-spinner,.k-empty,.k-banner) *{box-sizing:border-box}
:where(.k-btn,.k-chip,.k-toast,.k-banner,.k-empty)[hidden]{display:none!important}

.k-btn{--ku-btn-bg:var(--k-surface);--ku-btn-fg:var(--k-text);--ku-btn-line:var(--k-line-strong);position:relative;display:inline-flex;align-items:center;justify-content:center;gap:var(--k-space-2);
  min-height:var(--k-space-10);min-width:var(--k-space-10);padding:0 var(--k-space-4);border:1px solid var(--ku-btn-line);border-radius:var(--k-radius-md);background:var(--ku-btn-bg);color:var(--ku-btn-fg);
  font-family:inherit;font-size:var(--k-text-base);font-weight:500;line-height:var(--k-leading-tight);text-decoration:none;white-space:nowrap;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;${motion}}
.k-btn[data-variant=primary]{--ku-btn-bg:var(--k-accent);--ku-btn-fg:var(--k-on-accent);--ku-btn-line:var(--k-accent)}
.k-btn[data-variant=ghost]{--ku-btn-bg:transparent;--ku-btn-line:transparent}
.k-btn[data-variant=danger]{--ku-btn-bg:var(--k-danger);--ku-btn-fg:var(--k-on-danger);--ku-btn-line:var(--k-danger)}
.k-btn[data-size=sm]{min-height:var(--k-space-8);min-width:var(--k-space-8);padding:0 var(--k-space-3);font-size:var(--k-text-sm)}
.k-btn[data-size=lg]{min-height:var(--k-space-12);min-width:var(--k-space-12);padding:0 var(--k-space-6);font-size:var(--k-text-lg)}
.k-btn[data-icon]{padding:0}
.k-btn svg{width:1.25em;height:1.25em;flex:none}
.k-btn[aria-pressed=true]{--ku-btn-bg:var(--k-surface-2);--ku-btn-line:var(--k-text)}
.k-btn:focus-visible{${ring}}
.k-btn:disabled,.k-btn[aria-disabled=true]{opacity:.5;cursor:not-allowed}
.k-btn[aria-busy=true]{color:transparent;cursor:progress}
.k-btn[aria-busy=true]::after{content:"";position:absolute;inset:0;margin:auto;width:1em;height:1em;border:2px solid var(--ku-btn-fg);border-right-color:transparent;border-radius:var(--k-radius-full);animation:k-spin calc(var(--k-dur-slow) * 2.5) linear infinite}
@media (pointer:coarse){.k-btn:not([data-size=sm]){min-height:var(--k-space-12);min-width:var(--k-space-12)}}

.k-field{display:grid;align-content:start;gap:var(--k-space-1);min-width:0}
.k-label{color:var(--k-text);font-size:var(--k-text-sm);font-weight:500}
.k-hint{margin:0;color:var(--k-muted);font-size:var(--k-text-sm)}
.k-error{display:flex;align-items:center;gap:var(--k-space-2);margin:0;color:var(--k-danger);font-size:var(--k-text-sm);font-weight:500}
.k-error::before{${badge('var(--k-danger)', 'var(--k-on-danger)', '!')}}
.k-error:empty{display:none}
.k-input{width:100%;min-height:var(--k-space-10);padding:0 var(--k-space-3);border:1px solid var(--k-line-strong);border-radius:var(--k-radius-md);background-color:var(--k-surface);color:var(--k-text);
  font-family:inherit;font-size:var(--k-text-base);line-height:var(--k-leading-snug);${motion}}
textarea.k-input{min-height:var(--k-space-24);padding:var(--k-space-2) var(--k-space-3);resize:vertical}
select.k-input{appearance:none;padding-right:var(--k-space-10);cursor:pointer;background-repeat:no-repeat;background-size:calc(var(--k-space-1) + 1px) calc(var(--k-space-1) + 1px);
  background-image:linear-gradient(45deg,transparent 50%,var(--k-muted) 50%),linear-gradient(135deg,var(--k-muted) 50%,transparent 50%);
  background-position:calc(100% - var(--k-space-5)) 50%,calc(100% - var(--k-space-4) + 1px) 50%}
select.k-input option{background:var(--k-popover);color:var(--k-text)}
.k-input::placeholder{color:var(--k-muted);opacity:1}
.k-input:focus-visible{${ring};border-color:var(--k-focus)}
.k-input[aria-invalid=true]{border-color:var(--k-danger)}
.k-input:disabled{opacity:.5;cursor:not-allowed;background-color:var(--k-surface-2)}

.k-check{display:inline-flex;align-items:center;gap:var(--k-space-2);min-height:var(--k-space-6);color:var(--k-text);cursor:pointer;-webkit-tap-highlight-color:transparent}
.k-check input:not(.k-switch){flex:none;width:var(--k-space-5);height:var(--k-space-5);margin:0;accent-color:var(--k-accent);cursor:inherit}
.k-check input:focus-visible{${ring}}
.k-check:has(input:disabled){opacity:.5;cursor:not-allowed}
.k-switch{appearance:none;position:relative;flex:none;width:var(--k-space-10);height:var(--k-space-6);margin:0;border:1px solid var(--k-line-strong);border-radius:var(--k-radius-full);background:var(--k-surface-2);cursor:inherit;${motion}}
.k-switch::before{content:"";position:absolute;top:50%;left:calc(var(--k-space-1) - 1px);width:var(--k-space-4);height:var(--k-space-4);border-radius:var(--k-radius-full);background:var(--k-muted);transform:translateY(-50%);transition:transform var(--k-dur-fast) var(--k-ease-out),background-color var(--k-dur-fast) var(--k-ease-out)}
.k-switch:checked{border-color:var(--k-accent);background:var(--k-accent)}
.k-switch:checked::before{background:var(--k-on-accent);transform:translate(var(--k-space-4),-50%)}
.k-switch:focus-visible{${ring}}

.k-slider{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:var(--k-space-3);min-width:0}
.k-slider input[type=range]{width:100%;height:var(--k-space-6);margin:0;background:transparent;accent-color:var(--k-accent);cursor:pointer}
.k-slider input[type=range]:focus-visible{${ring}}
.k-slider input[type=range]:disabled{opacity:.5;cursor:not-allowed}
.k-slider output{min-width:4ch;color:var(--k-text);font-size:var(--k-text-sm);font-variant-numeric:tabular-nums;text-align:end}

.k-seg{display:inline-flex;flex-wrap:wrap;gap:var(--k-space-1);padding:var(--k-space-1);border:1px solid var(--k-line);border-radius:var(--k-radius-md);background:var(--k-surface-2)}
.k-seg>[role=radio]{min-height:var(--k-space-8);min-width:var(--k-space-8);padding:0 var(--k-space-3);border:1px solid transparent;border-radius:calc(var(--k-radius-md) - var(--k-space-1));background:transparent;color:var(--k-muted);
  font-family:inherit;font-size:var(--k-text-sm);font-weight:500;cursor:pointer;${motion}}
.k-seg>[aria-checked=true]{border-color:var(--k-line-strong);background:var(--k-surface);color:var(--k-text);box-shadow:var(--k-shadow-sm)}
.k-seg>[role=radio]:focus-visible{${ring}}
.k-seg>[role=radio]:disabled{opacity:.5;cursor:not-allowed}

.k-tabs{display:flex;gap:var(--k-space-1);overflow-x:auto;border-bottom:1px solid var(--k-line);scrollbar-width:none}
.k-tabs>[role=tab]{position:relative;flex:none;min-height:var(--k-space-10);padding:0 var(--k-space-4);border:0;background:none;color:var(--k-muted);font-family:inherit;font-size:var(--k-text-sm);font-weight:500;white-space:nowrap;cursor:pointer;${motion}}
.k-tabs>[aria-selected=true]{color:var(--k-text)}
.k-tabs>[aria-selected=true]::after{content:"";position:absolute;right:var(--k-space-2);bottom:0;left:var(--k-space-2);height:2px;border-radius:var(--k-radius-full);background:var(--k-text)}
.k-tabs>[role=tab]:focus-visible{outline:2px solid var(--k-focus);outline-offset:-2px}
.k-tabs>[role=tab]:disabled{opacity:.5;cursor:not-allowed}
.k-tabpanel:focus-visible{${ring}}

.k-card{position:relative;display:block;padding:var(--k-space-6);border:1px solid var(--k-line);border-radius:var(--k-radius-lg);background:var(--k-surface);color:var(--k-text);backdrop-filter:blur(var(--k-blur));${motion}}
.k-card[data-variant=raised]{box-shadow:var(--k-shadow-md)}
.k-card-link{color:inherit;text-decoration:none}
.k-card-link::after{content:"";position:absolute;inset:0;border-radius:inherit}
.k-card-link:focus-visible{outline:none}
.k-card:has(.k-card-link:focus-visible){${ring}}

.k-chip{display:inline-flex;align-items:center;gap:var(--k-space-2);min-height:var(--k-space-6);padding:0 var(--k-space-3);border:1px solid var(--k-line);border-radius:var(--k-radius-full);background:var(--k-surface-2);color:var(--k-text);
  font-family:inherit;font-size:var(--k-text-sm);font-weight:500;line-height:var(--k-leading-tight);white-space:nowrap;${motion}}
.k-chip[data-status]::before{content:"";flex:none;width:var(--k-space-2);height:var(--k-space-2);border-radius:var(--k-radius-full);background:var(--k-muted)}
.k-chip[data-status=success]::before{background:var(--k-success)}
.k-chip[data-status=warning]::before{background:var(--k-warning)}
.k-chip[data-status=danger]::before{background:var(--k-danger)}
button.k-chip{cursor:pointer}
button.k-chip[aria-pressed=true]{border-color:var(--k-text);background:var(--k-surface)}
button.k-chip:focus-visible{${ring}}
button.k-chip:disabled{opacity:.5;cursor:not-allowed}

.k-dialog{width:min(100% - 2 * var(--k-gutter),calc(var(--k-space-32) * 4.5));max-width:none;max-height:calc(100% - 2 * var(--k-gutter));padding:var(--k-space-6);border:1px solid var(--k-line);border-radius:var(--k-radius-lg);
  background:var(--k-popover);color:var(--k-text);box-shadow:var(--k-shadow-lg)}
.k-dialog[open]{display:flex;flex-direction:column;gap:var(--k-space-4)}
.k-dialog::backdrop{background:var(--k-overlay)}
.k-dialog-title{margin:0;font-size:var(--k-text-xl);font-weight:600;line-height:var(--k-leading-snug)}
.k-dialog-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:var(--k-space-2)}
@media (max-width:767px){.k-dialog{width:100%;margin:auto 0 0;border-bottom:0;border-radius:var(--k-radius-xl) var(--k-radius-xl) 0 0;padding-bottom:calc(var(--k-space-6) + env(safe-area-inset-bottom))}}

.k-menu{position:fixed;inset:auto;margin:0;min-width:calc(var(--k-space-32) + var(--k-space-16));padding:var(--k-space-1);border:1px solid var(--k-line);border-radius:var(--k-radius-md);background:var(--k-popover);color:var(--k-text);box-shadow:var(--k-shadow-lg)}
.k-menu:popover-open{display:flex;flex-direction:column}
.k-menu [role^=menuitem]{display:flex;align-items:center;gap:var(--k-space-2);min-height:var(--k-space-8);padding:0 var(--k-space-3);border:0;border-radius:var(--k-radius-sm);background:none;color:inherit;
  font-family:inherit;font-size:var(--k-text-sm);text-align:start;cursor:pointer}
.k-menu [role^=menuitem]:focus{outline:none;background:var(--k-surface-2)}
.k-menu [role^=menuitem]:focus-visible{outline:2px solid var(--k-focus);outline-offset:-2px}
.k-menu [role^=menuitem][aria-disabled=true]{opacity:.5;cursor:not-allowed}
.k-menu [role=menuitemradio]::after,.k-menu [role=menuitemcheckbox]::after{content:"";margin-left:auto}
.k-menu [aria-checked=true]::after{content:"\\2713"}
.k-menu [role=separator]{height:1px;margin:var(--k-space-1) 0;border:0;background:var(--k-line)}

.k-tip{position:fixed;inset:auto;margin:0;max-width:calc(var(--k-space-32) * 2);padding:var(--k-space-1) var(--k-space-2);border:0;border-radius:var(--k-radius-sm);background:var(--k-text);color:var(--k-page);
  font-size:var(--k-text-xs);line-height:var(--k-leading-snug);pointer-events:none}

.k-toasts{position:fixed;inset:auto var(--k-gutter) var(--k-gutter) auto;z-index:var(--k-z-toast);display:flex;flex-direction:column;gap:var(--k-space-2);width:min(100% - 2 * var(--k-gutter),calc(var(--k-space-32) * 3));pointer-events:none}
.k-toast{display:flex;align-items:center;gap:var(--k-space-3);padding:var(--k-space-2) var(--k-space-2) var(--k-space-2) var(--k-space-4);border:1px solid var(--k-line);border-radius:var(--k-radius-md);background:var(--k-popover);color:var(--k-text);
  box-shadow:var(--k-shadow-lg);font-size:var(--k-text-sm);pointer-events:auto}
.k-toast::before{${badge('var(--k-text)', 'var(--k-popover)', 'i')}}
.k-toast[data-kind=success]::before{${badge('var(--k-success)', 'var(--k-page)', '\\2713')}}
.k-toast[data-kind=error]::before{${badge('var(--k-danger)', 'var(--k-on-danger)', '!')}}
.k-toast p{flex:1;margin:0}
@media (max-width:767px){.k-toasts{inset:auto var(--k-gutter) var(--k-gutter)}}

.k-skeleton{display:block;min-height:1em;border-radius:var(--k-radius-sm);background:linear-gradient(90deg,var(--k-surface-2) 25%,color-mix(in srgb,var(--k-surface-2) 50%,var(--k-line)) 50%,var(--k-surface-2) 75%);
  background-size:400% 100%;animation:k-shimmer calc(var(--k-dur-slow) * 5) ease-in-out infinite}
.k-spinner{display:inline-block;flex:none;width:var(--k-space-5);height:var(--k-space-5);border:2px solid var(--k-line);border-top-color:var(--k-text);border-radius:var(--k-radius-full);animation:k-spin calc(var(--k-dur-slow) * 2.5) linear infinite}
.k-empty{display:grid;place-items:center;gap:var(--k-space-2);padding:var(--k-space-10) var(--k-space-6);color:var(--k-muted);font-size:var(--k-text-sm);text-align:center}
.k-empty strong{color:var(--k-text);font-size:var(--k-text-base)}
.k-banner{display:flex;align-items:flex-start;gap:var(--k-space-3);padding:var(--k-space-3) var(--k-space-4);border:1px solid var(--k-line-strong);border-radius:var(--k-radius-md);background:var(--k-surface);color:var(--k-text);font-size:var(--k-text-sm)}
.k-banner::before{${badge('var(--k-text)', 'var(--k-page)', 'i')}}
.k-banner[data-kind=error]{border-color:var(--k-danger)}
.k-banner[data-kind=error]::before{${badge('var(--k-danger)', 'var(--k-on-danger)', '!')}}
.k-banner[data-kind=warning]{border-color:var(--k-warning)}
.k-banner[data-kind=warning]::before{${badge('var(--k-warning)', 'var(--k-page)', '!')}}
.k-banner p{flex:1;margin:0}

@media (hover:hover){
  .k-btn:not(:disabled,[aria-disabled=true],[aria-busy=true]):hover{background:color-mix(in srgb,var(--ku-btn-bg) 88%,var(--ku-btn-fg))}
  .k-input:not(:disabled,:focus):hover{border-color:var(--k-text)}
  .k-check:not(:has(input:disabled)):hover .k-switch:not(:checked){border-color:var(--k-text)}
  .k-seg>[role=radio]:not(:disabled,[aria-checked=true]):hover{color:var(--k-text)}
  .k-tabs>[role=tab]:not(:disabled,[aria-selected=true]):hover{color:var(--k-text)}
  .k-card:has(.k-card-link):hover{border-color:var(--k-line-strong)}
  button.k-chip:not(:disabled):hover{border-color:var(--k-line-strong)}
  .k-menu [role^=menuitem]:not([aria-disabled=true]):hover{background:var(--k-surface-2)}
}
@keyframes k-spin{to{transform:rotate(1turn)}}
@keyframes k-shimmer{from{background-position:100% 0}to{background-position:0 0}}
@media (prefers-reduced-motion:reduce){
  :where(.k-btn,.k-input,.k-switch,.k-seg>*,.k-tabs>*,.k-card,.k-chip),.k-switch::before{transition:none}
  .k-skeleton{animation:none}
  .k-spinner,.k-btn[aria-busy=true]::after{animation-duration:calc(var(--k-dur-slow) * 8)}
}
`;
