# MF prototype: colour to token map

Source: Figma "Base Design System", frame `291:3473` (Brand kit V2, New 1 mapping). Values are the **NEW · LIGHT / NEW · DARK** columns. Token names are the core tokens (`surface/L1` is `--surface-L1`). All values live in `mf-prototype-src/src/tokens.css`. Dark is opt-in: add `?theme=dark` to the URL.

| Was (hex) | Where it was used | Token | Light | Dark |
|---|---|---|---|---|
| #0f0f0f | text, black buttons, icons | `text/primary`, `surface/inverse` | #0F0F0F | #FFFFFF |
| #535353 | secondary text | `text/secondary` | #535353 | #A3A3A3 |
| #727272 | tertiary text, major ruler ticks | `text/tertiary` | #727272 | #727272 |
| #fff | screens, sheets, cards | `surface/L1` | #FFFFFF | #171717 |
| #fff | text on dark or coloured fills | `text/inverse`, `fixed/white` | #FFFFFF | #0F0F0F, #FFFFFF |
| #f5f5f5 | grey fills (tiles, pills) | `surface/L2` | #F5F5F5 | #1F1F1F |
| #e1e1e1 | invested bar, dots | `surface/L3` | #DDDDDD | #272727 |
| #d3d3d3 | strong lines, dashed lines, minor ticks | `surface/L4` (as `--line-strong`) | #D3D3D3 | #404040 |
| #e6e6e6, 12% black | hairlines, dividers, chip borders | `border/L1` (as `--line`) | #0F0F0F 12% | #FFFFFF 12% |
| 7% black | back circle | `transparent/L1` | #0F0F0F 7% | #FFFFFF 8% |
| #b3b3b3 | middle ruler ticks | `transparent/L4` | #0F0F0F 30% | #FFFFFF 40% |
| #116a40 | up figures (text) | `positive/text` (as `--up`) | #08955A | #40E897 |
| #116a40 | bars, success fills | `positive/surface` | #116A40 | #0E854D |
| #daf3e6 | success pill | `positive/subtle` | #DAFEEC | #02311D |
| #c4342e | down figures, errors | `negative/text`, `negative/surface` | #C4342E | #EE807B, #C4342E |
| #fdf3f3 | error pill and notice | `negative/subtle` | #FCE5E4 | #41100E |
| #782724 | text on error fill | `negative/text-contrast` | #782724 | #FAD0CE |
| #66033c, #a50f66, #8a1157 | accent, loader, pending | `accent/default` | #66033C | #A50F66 |
| #fecdf1, #fef1fa, #fea3e5 | accent tints | `accent/subtle` | #FECCF1 | #3D0920 |
| #f9f6f1 | warning notice | `warning/subtle` | #FFE7CD | #321D00 |
| card tints | goal cards | Save tax: `warning/subtle` 45%; Emergency fund: `positive/subtle` 45%; Grow faster: `accent/subtle` 30%; Become a crorepati and Grow with India: `surface/L2` | | |
| risk gauge | riskometer | `positive/text-subtle`, `positive/text`, `warning/surface`, `negative/text-subtle`, `negative/surface`, `negative/bold` | | |
| shadows | sheets, modals | `shadow/raised` (8%), `shadow/overlay` (14%) | | |
| dim behind the start sheet | | `transparent/scrim` (50% black light, 70% dark) | | |

## Where we picked, and you may want to decide

1. **Green text.** Decided 2026-10-30: up figures use the system's `positive/text` (#08955A light, #40E897 dark). It is lighter than the #116A40 we shipped, so small green numbers read about 3.9:1 on white. `--up` in `tokens.css` is the one line to change.
2. **Lavender and blue cards.** The New mode has no purple or blue, so Become a crorepati and Grow with India are neutral (`surface/L2`).
3. **Accent in light.** The magenta we used (#A50F66) is the dark-mode accent. Light accent is the darker burgundy #66033C, so loaders and pending states are darker than before.
4. **Strong lines.** The board collapses all `border/default` into one 12% hairline. Lines we drew darker (#D3D3D3) use `surface/L4`.
5. **Start-sheet dim.** `transparent/scrim` is 50% black; the old dim was 82%, so the page behind the sheet is lighter.

## Not covered by tokens
Bitmap and Lottie assets (logo, nav icons, close icon, AMC logos, 3D art) keep their own colours. Stocks heat-map colours and the 96% black splash fade in `index.css` are literals.
