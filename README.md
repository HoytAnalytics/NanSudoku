# Nan's Sudoku — Web App

This is the corrected, offline-capable PWA version of Nan's Sudoku.

## Uploading to GitHub Pages

The files in this package must be uploaded **directly to the top level of the GitHub repository**. `index.html` must sit beside `app.js` and `styles.css`.

Top level:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.json`
- `sw.js`
- `icon-180.png`
- `icon-512.png`
- `DejaVuSans-Bold.ttf`
- `Atkinson-Hyperlegible-Bold.otf`
- `OFL.txt`

Do not put these files inside another folder.

In GitHub Pages, use **Deploy from a branch → main → / (root)**.

## iPad

Open the HTTPS GitHub Pages address in Safari, then use Share → Add to Home Screen.

## Corrected build

This version includes:

- mathematically valid 4×4 and 9×9 Sudoku solution generation;
- unique-solution checking before a puzzle is accepted;
- the specified very-easy Easy and easy Medium clue patterns;
- fixed back navigation on selection/list screens;
- Help returning to the exact puzzle and preserving the selected square;
- reliable correction/erase behaviour for previously incorrect entries;
- equal-sized board cells with thick box separators that do not change cell geometry;
- substantially larger puzzle and control typography;
- bundled DejaVu Sans Bold puzzle numerals;
- bundled Atkinson Hyperlegible Bold interface text;
- corrected PWA icon paths and offline font caching;
- immediate local saving of puzzle changes.

The web app cannot create a custom entry in the iPad Settings app, so relevant-box highlighting remains enabled by default.
