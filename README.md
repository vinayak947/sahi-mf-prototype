# SAHI Mutual Funds prototype (source)

Mobile prototype of the Mutual Funds market inside the SAHI app. React 19, Vite, Tailwind 4, TypeScript. All data is sample data.

## Run it

```bash
npm install
npm run dev        # http://localhost:8443  (set PORT=xxxx to change)
```

Publishing: every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`). There is no `gh-pages` branch. `npm run deploy` re-runs the deploy for the current `main` without a new commit.

Open it at phone width (browser device mode, 375 wide). The first screen is the "Where would you like to start?" sheet; pick Mutual Funds.

## Where things are

| You want to change | Look in |
|---|---|
| Colours (light and dark) | `src/tokens.css`. Figma "Base Design System" tokens, frame 291:3473. Nothing else should hold a colour value. |
| Home widgets (banner, Top Performing, Collections, All mutual funds, goal cards) | `src/mf/MfHome.tsx` |
| Fund list pages, fund page (graph, calculator, key facts), amount, pay, done | `src/mf/screens.tsx` |
| Return calculator and its ruler dial | `src/mf/ReturnCalculator.tsx` |
| Shared pieces (back header, filter row, stars, riskometer, return switch) | `src/mf/parts.tsx` |
| Sample funds and categories | `src/mf/data.ts` |
| Money, dates, chart maths | `src/mf/format.ts` |
| Styles for all of the above | `src/mf/mf.css` (shell and base: `src/index.css`, `src/screens.css`) |
| Light / dark switch | Profile button on home (`src/App.tsx`), or `?theme=dark` / `?theme=light` in the URL |

Colour map from the old prototype hexes to tokens: `colour-token-map.md` (also in this zip's root).

## Conventions we kept

- Plain words on screen: "Mutual Funds" not "MF", no jargon on cards, number before stars ("5 ★").
- Widget titles are 16px SAHI Sans Medium, 48px between widgets (24 + 24), 16px under the title.
- Outlined cards use a 1px `--border-L1` line and no fill.
- Dividers are `--line`; strong lines are `--line-strong`.

## One-file builds

`build-share.py` is not in this zip; it lives next to the project in the SAHI Brain folder.
`python3 build-share.py` makes the stakeholder file; `python3 build-share.py --editable` makes the readable one.
