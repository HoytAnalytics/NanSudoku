# Nan's Sudoku — Web App

A free, offline-capable Progressive Web App designed from the existing Nan's Sudoku specification.

## What is included

- 4×4 and 9×9 Sudoku
- Easy / Medium / Hard
- Very easy Easy and quite easy Medium generation
- Large high-contrast controls
- Blue selected-square outline
- Relevant-box highlighting
- Large number pad and Erase
- Correct/incorrect visual feedback
- Multiple unfinished puzzles
- Completed-puzzle history
- Local automatic saving
- Read-only completed boards
- PWA install support
- Offline caching after first successful load
- No account, backend, advertising or purchases

## iPad setup

This folder needs to be hosted from HTTPS for Safari's PWA/service-worker features to work reliably.

1. Upload the folder to a static web host.
2. Open the HTTPS address in Safari on the iPad.
3. Use Safari's Share menu.
4. Choose "Add to Home Screen".
5. Name it "Nan's Sudoku".
6. Open it from the new Home Screen icon.

The app stores puzzle data locally on the iPad.

## Important limitation

A web app cannot add its own custom entry to the iPad Settings app. The original native-app requirement for a system Settings toggle therefore cannot be reproduced exactly. The current build keeps relevant-box highlighting enabled by default.
