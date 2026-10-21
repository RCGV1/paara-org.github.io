# Mobile navigation review assets

Screenshots and browser validation for the PAARA mobile navigation drawer. Application changes are kept on the `fix/mobile-navigation-drawer` branch; these assets do not add files to the website pull request.

## Screenshots

- `mobile-before.png`: original layout at 390 × 844.
- `mobile-after-light.png`: revised first screen at 390 × 844.
- `drawer-light.png` and `drawer-dark.png`: opened navigation drawer in Chrome.
- `drawer-webkit.png`: opened navigation drawer in WebKit.
- `desktop-before.png` and `desktop-after.png`: 1280 × 900 desktop layout.

The existing gallery selects random photos, so its image content varies between captures.

## Browser validation

`validation-results.json` records the passing browser/viewport matrix. `validate-mobile.cjs` exercises modal interaction, scrolling, focus management, page navigation, themes, responsive behavior, reduced motion, enlarged text, and scoped axe accessibility audits.

Serve the built website at `http://localhost:4000`, or set `BASE_URL` to its HTTP preview URL. The validation script requires Chrome, Playwright, axe-core, and Playwright WebKit. Install these test dependencies separately from the website:

```sh
npm install --prefix /tmp/paara-review-tools playwright axe-core
/tmp/paara-review-tools/node_modules/.bin/playwright install webkit
NODE_PATH=/tmp/paara-review-tools/node_modules node validate-mobile.cjs
```

The script writes screenshots and results beside itself. These tools are for validation and do not change the site's dependency list.
