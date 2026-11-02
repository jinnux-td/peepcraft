---
name: peepcraft
description: Draw Open Peeps characters and scenes with PeepCraft (avatars, illustrations, a peep for a page, a scene of people and things). Use when the user asks for a peep, an Open Peeps character, an avatar or illustration made with PeepCraft, or to change one; it drives the peepcraft MCP tools, and the peep command when it is installed.
---

# PeepCraft

A picture is one JSON document. `{ "v": 1 }` alone is PeepCraft's default bust; add only what should differ:

```json
{ "v": 1, "type": "sitting", "parts": { "head": "afro", "face": "calm" }, "ink": "#1d3557", "partColors": { "body": { "top": "#e63946" } }, "bg": "#a8dadc" }
```

## With the MCP tools (peepcraft server)
1. `describe` once: types, slots per type, defaults, limits, examples.
2. `search_parts` for ids, with the pieces each item can colour (`category` head, face, facialHair, mask, accessories, body = bust torsos, standing and sitting = poses, figure, thing; `query` words).
3. `render` the document. It returns the SVG and a share link that opens the picture in PeepCraft, where the person can edit it and save a PNG. Give the person the link.
4. A bad document returns every problem with its path and the valid choices: fix those and render again. Do not guess ids; search.

`random` rolls only the parts left open (body, head, face, facial hair, glasses). Type, mask, extra and colours stay at PeepCraft's start unless `keep` sets them; a piece colour in `keep.partColors` for an open part rolls among the items that have it. Then `render` its document.

## With the peep command (when `peep --version` works)
```bash
peep random --type sitting --head afro --ink navy --color body.top=crimson   # a document, open parts rolled
peep render me.json --save --png                                            # named as PeepCraft's Save names it
peep parts head -q curly                                                    # ids and their pieces
peep share me.json                                                          # a PeepCraft link
```
Colours on the command line are names (navy, crimson, auburn, ...) or hex without `#`, because `#` can start a shell comment.

## Rules
- `body` is a pose for standing and sitting and a torso for a bust: search with the right category for the type.
- A scene: `"scene": [{ "type": "standing", "parts": { "head": "afro" } }, { "figure": "runner" }, { "thing": "potted-plant" }]` with `"frame": { "ratio": "16:9" }`; members stand on one ground line, back to front.
- Colours are `#rrggbb`; `bg` may be `"transparent"`.
- Art: Open Peeps and Transhumans by Pablo Stanley (CC0).
