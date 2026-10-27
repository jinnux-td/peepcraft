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
.pc-note{grid-column:1/-1;display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:12px;color:var(--pc-muted);font-size:13px}
.pc-note p{margin:0}
.pc-dice:disabled{opacity:.35;cursor:default;transform:none}
.pc-stage-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;min-width:0}
.pc-stage{width:100%;max-width:680px;min-width:240px;aspect-ratio:1;border-radius:var(--pc-r);overflow:hidden;box-shadow:var(--pc-shadow);border:1px solid var(--pc-line)}
.pc-stage[data-transparent]{background:repeating-conic-gradient(#d4d4d4 0 25%,#fff 0 50%) 0 0/24px 24px}
.pc-stage svg{display:block;width:100%;height:100%}
.pc-pill{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--pc-surface);border:1px solid var(--pc-line);backdrop-filter:blur(var(--pc-blur));box-shadow:var(--pc-shadow)}
.pc-pill button{border:0;background:transparent;border-radius:999px;padding:8px 18px;text-transform:capitalize}
.pc-pill button[aria-pressed=true]{background:var(--pc-accent);color:var(--pc-on-accent);font-weight:600}
.pc-hint{margin:0;color:var(--pc-muted);font-size:12px;text-align:center}
.pc kbd{border:1px solid var(--pc-line);border-radius:6px;padding:0 6px;background:var(--pc-tile);font:inherit}
.pc-side{padding:18px;display:flex;flex-direction:column;gap:18px}
.pc-field{display:flex;flex-direction:column;gap:8px}
.pc-label{display:flex;justify-content:space-between;font-size:12px;color:var(--pc-muted);text-transform:var(--pc-caps);letter-spacing:var(--pc-track)}
.pc-label output{color:var(--pc-text);font-variant-numeric:tabular-nums}
.pc-swatches{display:flex;flex-wrap:wrap;gap:8px}
.pc-swatch{width:28px;height:28px;border-radius:50%;border:2px solid var(--pc-line);padding:0;position:relative;overflow:hidden;display:grid;place-items:center}
.pc-swatch[aria-pressed=true]{outline:3px solid var(--pc-accent);outline-offset:2px}
.pc-swatch.pc-custom{background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer}
.pc-swatch.pc-custom input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
.pc-swatch.pc-clear{background:repeating-conic-gradient(#d4d4d4 0 25%,#fff 0 50%) 0 0/10px 10px;color:#d33}
.pc-swatch.pc-clear svg{width:18px;height:18px}
.pc-slider{display:flex;flex-direction:column;gap:8px}
.pc input[type=range]{width:100%;accent-color:var(--pc-accent)}
.pc-save{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pc-member{display:flex;flex-direction:column;gap:14px;margin-top:16px;padding-top:14px;border-top:1px solid var(--pc-line)}
.pc-row{display:flex;flex-wrap:wrap;gap:8px}
.pc-add span:last-child{display:inline-flex;align-items:center;gap:4px;color:var(--pc-text);font-weight:600}
.pc-add span:last-child svg{width:14px;height:14px}
.pc-selected{fill:none;stroke:#1b1b1b;stroke-width:2.5;stroke-dasharray:8 6;vector-effect:non-scaling-stroke;pointer-events:none;filter:drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1.5px #fff)}
.pc-stage[data-view=scene] [data-item]{cursor:pointer}
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
}
@container (max-width:520px){.pc-btn span{display:none}.pc-btn.pc-primary span,.pc-btn.pc-wide span{display:inline}.pc-save{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.pc *{transition:none!important}}
`
