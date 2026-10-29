// The creator's stylesheet, as a string rendered inside the component, so it works wherever the component is placed (no CSS loader, no globals).
// Four themes, each from one reference: sunny (Opeeps), glass (soft light panels), noir (dark with gold), violet (gradient and pills).
// Layout follows the width of the component itself (container queries), not the window.
export const creatorCss = `
.pc,.pc[data-pc-theme=sunny]{color-scheme:light;--pc-page:#fffbf0;--pc-text:#1b1b1b;--pc-muted:#6f6a5c;--pc-surface:#fff;--pc-line:#eee6cf;--pc-tile:#faf5e4;--pc-accent:#f7d56e;--pc-on-accent:#1b1b1b;--pc-glow:#f7d56e66;--pc-shadow:0 12px 40px #0000001a;--pc-r:28px;--pc-blur:0px;--pc-caps:none;--pc-track:0;--pc-menu:#fff}
.pc[data-pc-theme=glass]{color-scheme:light;--pc-page:linear-gradient(135deg,#b4b9cc,#d9c9cf 60%,#c3c8dc);--pc-text:#1f2433;--pc-muted:#5b6275;--pc-surface:#ffffff55;--pc-line:#ffffff99;--pc-tile:#ffffff66;--pc-accent:#3d6bff;--pc-on-accent:#fff;--pc-glow:#3d6bff44;--pc-shadow:0 20px 60px #1f243326;--pc-r:26px;--pc-blur:22px;--pc-caps:uppercase;--pc-track:.12em;--pc-menu:#fff}
.pc[data-pc-theme=noir]{color-scheme:dark;--pc-page:radial-gradient(1200px 700px at 70% 10%,#2a2a2e,#101012);--pc-text:#f1efe9;--pc-muted:#9a978e;--pc-surface:#ffffff0d;--pc-line:#ffffff1f;--pc-tile:#ffffff0a;--pc-accent:#f0a431;--pc-on-accent:#1a1204;--pc-glow:#f0a43155;--pc-shadow:0 24px 70px #000000a0;--pc-r:14px;--pc-blur:18px;--pc-caps:none;--pc-track:0;--pc-menu:#1c1c20}
.pc[data-pc-theme=violet]{color-scheme:dark;--pc-page:linear-gradient(160deg,#7a6bd6,#8f86e0 55%,#6b5fc9);--pc-text:#fff;--pc-muted:#e0dcff;--pc-surface:#ffffff24;--pc-line:#ffffff40;--pc-tile:#ffffff1f;--pc-accent:#ff5c8a;--pc-on-accent:#fff;--pc-glow:#ff5c8a55;--pc-shadow:0 18px 50px #2a1f6a55;--pc-r:24px;--pc-blur:16px;--pc-caps:none;--pc-track:0;--pc-menu:#6f63cc}
.pc{container-type:inline-size;box-sizing:border-box;padding:16px;border-radius:var(--pc-r);background:var(--pc-page);color:var(--pc-text);font:15px/1.4 ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",sans-serif}
.pc *,.pc *::before,.pc *::after{box-sizing:border-box}
.pc button,.pc input{font:inherit;color:inherit}
.pc button{cursor:pointer}
.pc :focus-visible{outline:3px solid var(--pc-accent);outline-offset:2px}
.pc-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px}
.pc-title{margin:0;font-size:26px;letter-spacing:-.01em;display:flex;align-items:baseline;gap:10px}
.pc small{font-size:12px;font-weight:500;color:var(--pc-muted);text-transform:var(--pc-caps);letter-spacing:var(--pc-track)}
.pc h2{margin:0 0 10px;font-size:15px;display:flex;justify-content:space-between;align-items:center;text-transform:var(--pc-caps);letter-spacing:var(--pc-track)}
.pc h2 small{margin-left:10px}
.pc-dots{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px}
.pc-dots .pc-token{min-width:52px}
.pc-options>.pc-picked{margin:0 0 12px}
.pc-options>.pc-picked>.pc-field>.pc-label{position:static;width:auto;height:auto;clip-path:none}
.pc-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pc-panel{background:var(--pc-surface);border:1px solid var(--pc-line);border-radius:var(--pc-r);box-shadow:var(--pc-shadow);backdrop-filter:blur(var(--pc-blur));-webkit-backdrop-filter:blur(var(--pc-blur))}
.pc-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--pc-line);background:var(--pc-surface);backdrop-filter:blur(var(--pc-blur));border-radius:999px;padding:8px 14px;transition:transform .12s,box-shadow .12s}
.pc-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px var(--pc-glow)}
.pc-btn:disabled{opacity:.4;cursor:default}
.pc-btn.pc-primary{background:var(--pc-accent);color:var(--pc-on-accent);border-color:transparent;font-weight:600;padding:12px 8px;font-size:13px}
.pc-btn.pc-wide{width:100%;padding:10px 14px}
.pc-btn[aria-pressed=true]{background:var(--pc-accent);color:var(--pc-on-accent);border-color:transparent}
.pc-main{display:grid;grid-template-columns:minmax(300px,390px) minmax(0,1fr) minmax(260px,320px);gap:20px;align-items:start}
.pc-picker{display:grid;grid-template-columns:96px minmax(0,1fr);overflow:hidden}
.pc-rail{display:flex;flex-direction:column;gap:6px;padding:10px 8px;border-right:1px solid var(--pc-line)}
.pc-rail-btn{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:transparent;border-radius:16px;padding:10px 2px;font-size:9px;color:var(--pc-muted);text-transform:var(--pc-caps);letter-spacing:.02em;max-width:100%}
.pc-rail-btn[aria-selected=true]{background:var(--pc-accent);color:var(--pc-on-accent);box-shadow:0 6px 20px var(--pc-glow)}
.pc-options{padding:14px;min-width:0}
.pc-dice{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid var(--pc-line);background:var(--pc-tile);transition:transform .25s}
.pc-dice:hover{transform:rotate(90deg);background:var(--pc-accent);color:var(--pc-on-accent)}
.pc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:var(--pc-grid-height,560px);overflow:auto;padding:4px;margin:-4px}
.pc-tile{display:flex;flex-direction:column;align-items:center;gap:4px;border:2px solid transparent;background:var(--pc-tile);border-radius:calc(var(--pc-r) * .6);padding:6px 4px 8px;font-size:11px;color:var(--pc-muted);min-width:0;transition:box-shadow .15s,border-color .15s}
.pc-tile:hover{border-color:var(--pc-line)}
.pc-tile[aria-checked=true]{border-color:var(--pc-accent);box-shadow:0 0 0 4px var(--pc-glow),0 0 22px var(--pc-glow);color:var(--pc-text)}
.pc-tile svg,.pc-tile .pc-none{width:100%;aspect-ratio:1;display:block;border-radius:12px}
.pc-none{display:grid;place-items:center;color:var(--pc-muted)}
.pc-tile span:last-child{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-grid.pc-list{grid-template-columns:1fr;gap:4px}
.pc-tip{position:fixed;z-index:1000;max-width:220px;padding:6px 9px;border-radius:7px;background:#1f2328;color:#fff;font:600 12px/1.2 system-ui,sans-serif;text-align:center;pointer-events:none;box-shadow:0 4px 12px #0003}
.pc-tip::before{content:"";position:absolute;top:-6px;left:var(--pc-tip-arrow,50%);margin-left:-6px;border:6px solid transparent;border-top:0;border-bottom-color:#1f2328}
.pc .pc-list .pc-tile{flex-direction:row;gap:16px;padding:6px 14px 6px 6px;font-size:14px;color:var(--pc-text);text-align:left}
.pc-list .pc-tile svg,.pc-list .pc-tile .pc-none{width:72px;flex:none}
.pc-list .pc-tile span:last-child{flex:1}
.pc-note{grid-column:1/-1;display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:12px;color:var(--pc-muted);font-size:13px}
.pc-note p{margin:0}
.pc-dice:disabled{opacity:.35;cursor:default;transform:none}
.pc .pc-chip{margin-left:auto;padding:5px 10px;border-radius:999px;border:1px solid var(--pc-line);background:transparent;color:var(--pc-muted);font-size:11px;white-space:nowrap}
.pc-chip[aria-pressed=true]{background:var(--pc-accent);border-color:var(--pc-accent);color:var(--pc-on-accent)}
.pc-chip+.pc-lock{margin-left:4px}
.pc .pc-lock,.pc .pc-view{display:grid;place-items:center;width:32px;height:32px;margin-left:auto;margin-right:6px;padding:0;border-radius:50%;border:1px solid transparent;background:transparent;color:var(--pc-muted)}
.pc-lock:hover,.pc-view:hover{background:var(--pc-tile)}
.pc-lock[aria-pressed=true]{background:var(--pc-accent);color:var(--pc-on-accent)}
.pc .pc-chip+.pc-view,.pc .pc-view+.pc-lock{margin-left:0;margin-right:2px}
.pc-label .pc-lock{width:26px;height:26px;margin:0}
.pc-label .pc-lock svg{width:16px;height:16px}
.pc-stage-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;min-width:0}
.pc-stage{width:100%;max-width:var(--pc-stage-max,680px);min-width:240px;aspect-ratio:1;border-radius:var(--pc-r);overflow:hidden;box-shadow:var(--pc-shadow);border:1px solid var(--pc-line)}
.pc-stage[data-transparent]{background:repeating-conic-gradient(#d4d4d4 0 25%,#fff 0 50%) 0 0/24px 24px}
.pc-stage svg{display:block;width:100%;height:100%}
.pc-pill{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--pc-surface);border:1px solid var(--pc-line);backdrop-filter:blur(var(--pc-blur));box-shadow:var(--pc-shadow)}
.pc-pill button{border:0;background:transparent;border-radius:999px;padding:8px 18px;text-transform:capitalize}
.pc-pill button[aria-pressed=true]{background:var(--pc-accent);color:var(--pc-on-accent);font-weight:600}
.pc-hint{margin:0;color:var(--pc-muted);font-size:12px;text-align:center}
.pc kbd{border:1px solid var(--pc-line);border-radius:6px;padding:0 6px;background:var(--pc-tile);font:inherit}
.pc-side{padding:18px;display:flex;flex-direction:column;gap:18px}
.pc-field{display:flex;flex-direction:column;gap:8px}
.pc-label{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--pc-muted);text-transform:var(--pc-caps);letter-spacing:var(--pc-track)}
.pc-value{display:inline-grid;grid-template-columns:56px 12px 22px;align-items:center;gap:3px;color:var(--pc-text);font-variant-numeric:tabular-nums}
.pc-value input{width:56px;padding:2px 6px;border:1px solid var(--pc-line);border-radius:8px;background:var(--pc-tile);text-align:right;font-size:12px}
.pc-reset{display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--pc-muted)}
.pc-reset svg{width:15px;height:15px}
.pc-reset:hover:not(:disabled){color:var(--pc-text);background:var(--pc-tile)}
.pc-reset:disabled{opacity:.3;cursor:default}
.pc-pill button[aria-checked=true]{background:var(--pc-accent);color:var(--pc-on-accent);font-weight:600}
.pc-export{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.pc-export .pc-pill{box-shadow:none;padding:3px}
.pc-export .pc-pill button{padding:4px 10px;font-size:12px;text-transform:none}
.pc-swatches{display:flex;flex-wrap:wrap;gap:8px}
.pc-swatch{width:28px;height:28px;border-radius:50%;border:2px solid var(--pc-line);padding:0;position:relative;overflow:hidden;display:grid;place-items:center}
.pc-swatch[aria-pressed=true]{outline:3px solid var(--pc-accent);outline-offset:2px}
.pc-swatch.pc-custom{background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer}
.pc-swatch.pc-custom input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
.pc-swatch.pc-clear{background:repeating-conic-gradient(#d4d4d4 0 25%,#fff 0 50%) 0 0/10px 10px;color:#d33}
.pc-swatch.pc-clear svg{width:18px;height:18px}
.pc-swatch.pc-more{background:var(--pc-tile);color:var(--pc-muted);cursor:pointer}
.pc-swatch.pc-more[aria-expanded=true]{color:var(--pc-on-accent);background:var(--pc-accent);border-color:transparent}
.pc-swatch.pc-more svg{width:16px;height:16px}
.pc-palette{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--pc-line);border-radius:14px;background:var(--pc-tile)}
.pc-palette h4{margin:2px 0 0;font-size:11px;font-weight:600;color:var(--pc-muted);text-transform:var(--pc-caps);letter-spacing:var(--pc-track)}
.pc-hex{display:flex;gap:8px;align-items:center}
.pc-hex input{flex:1;min-width:0;padding:6px 10px;border:1px solid var(--pc-line);border-radius:10px;background:var(--pc-surface);font-size:13px}
.pc-hex input[aria-invalid=true]{border-color:#d33}
.pc-seven{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.pc-seven .pc-swatch{width:100%;height:auto;aspect-ratio:1}
.pc-slider{display:flex;flex-direction:column;gap:8px}
.pc input[type=range]{width:100%;accent-color:var(--pc-accent)}
.pc-track{position:relative;display:block}
.pc-track input[type=range]{display:block;margin:0;position:relative;z-index:1;background:transparent}
.pc-tick{position:absolute;top:50%;width:2px;height:14px;margin:-7px 0 0 -1px;border-radius:1px;background:var(--pc-muted);pointer-events:none}
.pc-save{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pc-member{display:flex;flex-direction:column;gap:14px;margin-top:16px;padding-top:14px;border-top:1px solid var(--pc-line)}
.pc-row{display:flex;flex-wrap:wrap;gap:8px}
.pc-add span:last-child{display:inline-flex;align-items:center;gap:4px;color:var(--pc-text);font-weight:600}
.pc-add span:last-child svg{width:14px;height:14px}
.pc-selected{fill:none;stroke:#1b1b1b;stroke-width:2.5;stroke-dasharray:8 6;vector-effect:non-scaling-stroke;pointer-events:none;filter:drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1.5px #fff)}
.pc-stage[data-view=scene]{aspect-ratio:var(--pc-ratio,1);width:min(100%,calc(72vh * var(--pc-ratio,1)))}
.pc-members .pc-tile[draggable]{cursor:grab}.pc-member-tile{position:relative;display:grid}.pc .pc-member-x{position:absolute;top:4px;right:4px;width:22px;height:22px;padding:0;border-radius:50%;border:1.5px solid #fff;background:#1b1b1b;color:#fff;display:grid;place-items:center;cursor:pointer}.pc .pc-member-x svg{width:14px;height:14px;stroke-width:2.6}.pc .pc-member-x:hover,.pc .pc-member-x:focus-visible{background:#e63946}.pc-members .pc-tile[data-over]{outline:2px dashed var(--pc-accent);outline-offset:2px}.pc-handle{touch-action:none}.pc-remove{cursor:pointer}.pc-remove circle{fill:#1b1b1b;stroke:#fff;stroke-width:1.5;vector-effect:non-scaling-stroke}.pc-remove path{stroke:#fff;stroke-width:2.5;stroke-linecap:round;vector-effect:non-scaling-stroke}.pc-remove:hover circle{fill:#e63946}.pc-handle circle:last-child{fill:#fff;stroke:#1b1b1b;stroke-width:1.5;vector-effect:non-scaling-stroke}
.pc-frame{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:center;width:100%}
.pc-frame .pc-pill button{padding:6px 12px;font-size:13px;text-transform:none}
.pc-frame .pc-slider{width:320px;max-width:100%}
.pc-stage[data-view=scene] [data-item]{cursor:grab;touch-action:none}
.pc-stage[data-view=scene]:active [data-item]{cursor:grabbing}
.pc-scene .pc-grid{max-height:none}
/* Things scroll after about three rows, so Uploads stay within reach. */
.pc-scene .pc-things{max-height:330px}
/* In the scene, the side panel stays in view and the member list takes the height that is left, then scrolls. */
.pc-side-scene{position:sticky;top:12px;max-height:var(--pc-side-max,calc(100dvh - 24px));overflow:auto}
.pc-side-scene{gap:8px}
.pc-side-scene>*{flex-shrink:0}
.pc-side-scene .pc-members{flex:0 1 auto;min-height:56px;max-height:none}
.pc-side-scene .pc-member{gap:8px}
.pc-side-scene .pc-row{flex-wrap:nowrap}
.pc-side-scene .pc-row .pc-btn{flex:1;padding:8px}
.pc-side-scene .pc-row .pc-btn span{display:none}
.pc-side-scene .pc-slider,.pc-frame .pc-slider{display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:8px}
.pc-side-scene .pc-slider .pc-label,.pc-frame .pc-slider .pc-label{display:contents}
.pc-side-scene .pc-slider .pc-track,.pc-frame .pc-slider .pc-track{grid-column:2;grid-row:1}
.pc-side-scene .pc-value,.pc-frame .pc-value{grid-column:3;grid-row:1}
.pc-colors{display:flex;flex-direction:column;gap:8px}
.pc-link{align-self:flex-start;border:0;background:transparent;padding:0;font-size:12px;color:var(--pc-muted);text-decoration:underline}
.pc-roles{flex-wrap:wrap;box-shadow:none;align-self:flex-start}
.pc-tokens{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.pc .pc-token{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;padding:6px 2px 4px;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--pc-muted);font-size:11px}
.pc-token:hover{background:var(--pc-tile)}
.pc-token[aria-checked=true]{background:var(--pc-tile);border-color:var(--pc-accent);color:var(--pc-text);font-weight:600}
.pc-token i{position:relative;width:24px;height:24px;border-radius:50%;border:2px solid var(--pc-line);box-shadow:inset 0 0 0 1px #0000001a}
.pc-token i[data-changed]::after{content:"";position:absolute;right:-3px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--pc-accent);border:2px solid var(--pc-surface)}
.pc-token i .pc-token-lock{position:absolute;right:-7px;bottom:-7px;display:grid;place-items:center;width:15px;height:15px;border-radius:50%;background:var(--pc-accent);color:var(--pc-on-accent);border:1.5px solid var(--pc-surface)}.pc-token i .pc-token-lock svg{width:10px;height:10px;stroke-width:2.6}
.pc-token>span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-picked{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:14px;background:var(--pc-tile)}
.pc-picked>.pc-field>.pc-label,.pc-compact .pc-token span,.pc-compact>.pc-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.pc-compact .pc-picked>.pc-field>.pc-label{position:static;width:auto;height:auto;clip-path:none}
.pc-compact .pc-tokens{grid-template-columns:repeat(auto-fill,minmax(24px,1fr));gap:2px}
.pc-compact .pc-token i{width:20px;height:20px}
.pc .pc-compact .pc-token{padding:3px 0;position:relative}
.pc-compact .pc-picked{padding:6px 8px}
.pc-picked .pc-swatches{gap:5px}
.pc-picked .pc-swatch{width:22px;height:22px}
.pc-picked .pc-seven .pc-swatch{width:100%;height:auto}
.pc-stage:not([data-view]) [data-slot],.pc-stage:not([data-view]) [data-figure]{cursor:pointer}
.pc-side-scene h2{margin:0}
.pc-side-scene .pc-member{margin-top:0}
.pc-small{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pc h3{margin:20px 0 10px;font-size:13px;display:flex;align-items:baseline;gap:10px;text-transform:var(--pc-caps);letter-spacing:var(--pc-track)}
.pc-file{position:relative;cursor:pointer}
.pc-file input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
.pc-file:focus-within{outline:3px solid var(--pc-accent);outline-offset:2px}
.pc-upload{position:relative;display:flex;min-width:0}
.pc-upload .pc-tile{flex:1}
.pc .pc-x{position:absolute;top:2px;right:2px;display:grid;place-items:center;width:28px;height:28px;padding:0;border-radius:50%;border:1px solid var(--pc-line);background:var(--pc-menu)}
.pc .pc-x svg{width:16px;height:16px}
.pc-theme{position:relative}
.pc-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:10;padding:6px;display:flex;flex-direction:column;min-width:160px;background:var(--pc-menu);border:1px solid var(--pc-line);border-radius:16px;box-shadow:var(--pc-shadow)}
.pc-item{display:flex;align-items:center;gap:10px;border:0;background:transparent;border-radius:10px;padding:8px 10px;text-align:left}
.pc-item:hover,.pc-item[aria-checked=true]{background:var(--pc-tile)}
.pc-item[aria-checked=true]{font-weight:600}
.pc-item i{width:14px;height:14px;border-radius:50%;display:block}
@container (max-width:1040px){
  .pc-main{grid-template-columns:minmax(0,1fr)}
  .pc-stage-wrap{order:-1}
  .pc-stage{max-width:520px}
  .pc-picker{grid-template-columns:minmax(0,1fr)}
  .pc-rail{flex-direction:row;overflow:auto;border-right:0;border-bottom:1px solid var(--pc-line)}
  .pc-rail-btn{flex:0 0 auto;min-width:68px}
  .pc-grid{grid-template-columns:repeat(auto-fill,minmax(88px,1fr));max-height:360px}
  .pc-side-scene{position:static;max-height:none;overflow:visible}
  .pc-side-scene .pc-members{max-height:272px}
}
@container (max-width:520px){.pc-btn span{display:none}.pc-btn.pc-primary span,.pc-btn.pc-wide span{display:inline}.pc-save{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.pc *{transition:none!important}}
`
