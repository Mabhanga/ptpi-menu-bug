# PTPI Company Menu Bug: Dead "Careers" and "Leadership" Links

Automated Playwright reproduction of a navigation bug on [ptpi.co.za](https://www.ptpi.co.za/) (PTP Integrated).

**Tested:** 14 October 2026 · **Browser:** Chromium (desktop viewport)

## The bug

In the **Company** menu, some links work and some do nothing:

| Link | Header menu | Footer |

| About | Works | Works |
| How We Work | Works | not in footer |
| Leadership | **Dead link** | not in footer |
| Careers | **Dead link** | **Dead link** |

Clicking **Leadership** or **Careers** leaves the user on whatever page they were already on. The only change is a `#` added to the URL.

### Steps to reproduce

1. Go to https://www.ptpi.co.za/
2. Click **Company** in the main navigation.
3. Click **About**. The About page opens.
4. Click **Company**, then **How We Work**. The How We Work page opens.
5. Click **Company**, then **Careers** (or **Leadership**).

**Expected:** The Careers (or Leadership) page opens.
**Actual:** The browser stays on the current page, e.g. `https://www.ptpi.co.za/about/how-we-work/` becomes `https://www.ptpi.co.za/about/how-we-work/#`.

### Root cause

The affected links have a placeholder `href="#"` instead of a real URL. Hovering over them shows `.../#` in the browser status bar, and the tests read the attribute directly:

```
[header] About href = "https://www.ptpi.co.za/about/"
[header] How We Work href = "https://www.ptpi.co.za/about/how-we-work/"
[header] Leadership href = "#"
[header] Careers href = "#"
[footer] About href = "https://www.ptpi.co.za/about/"
[footer] Careers href = "#"
```

### Impact

Visitors cannot reach the Careers page from the main menu or the footer, which hurts recruitment for a company that is presumably hiring. The Leadership page is also unreachable from the menu.

## What the tests do

`tests/ptpi-menu-bug.spec.js` contains 7 tests:

| Test | Type | Expected result |

| Header: Company > About | Control | Pass |
| Header: Company > How We Work | Control | Pass |
| Header: Company > Leadership | Bug | **Fail** |
| Header: Company > Careers | Bug | **Fail** |
| Footer: Company > About | Control | Pass |
| Footer: Company > Careers | Bug | **Fail** |
| Careers clicked from the How We Work page | Bug (exact scenario) | **Fail** |

The control tests prove the test setup works and that other links on the same menu navigate correctly. The bug tests are **meant to fail** until the site is fixed. Each one checks two things:

1. The link's `href` is not the placeholder `#`.
2. Clicking the link changes the page. The `#fragment` is stripped before comparing URLs, so a jump to `#` does not count as navigation.

## Running the tests

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npx playwright install chromium
npx playwright test tests/ptpi-menu-bug.spec.js --project=chromium --workers=1 --headed
```

Expected result: **3 passed, 4 failed**.

## Notes

- **Cookie banner:** the site's cookie/GDPR banner (`#mfn-gdpr`) covers parts of the menu and blocks clicks, so the tests hide it with injected CSS. This is a test workaround, not part of the bug.
- **Slow site:** the page is slow to fire the `load` event, so the tests use `waitUntil: 'domcontentloaded'` and a 90 second timeout, and run with a single worker.
- **Selectors:** the dropdown links are scoped to `[id^="megamenu-menu-item-"]`. If PTPI changes their menu markup, these selectors may need updating.
- **When it's fixed:** once Careers and Leadership have real URLs, all 7 tests should pass.

## Tech

JavaScript · [Playwright Test](https://playwright.dev/)

## Author

Jacob Motsweni · [GitHub](https://github.com/Mabhanga) · [LinkedIn](https://www.linkedin.com/in/jacob-motsweni-3a2b8a144)
