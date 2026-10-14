// tests/ptpi-menu-bug.spec.js
const { test, expect } = require('@playwright/test');

const HOME = 'https://www.ptpi.co.za/';
const HEADER_LINKS = ['About', 'How We Work', 'Leadership', 'Careers'];
const HEADER_BROKEN = ['Leadership', 'Careers'];
// The footer's Company section only has these two
const FOOTER_LINKS = ['About', 'Careers'];
const FOOTER_BROKEN = ['Careers'];

test.setTimeout(90000);

// Ignore the #fragment so a link to "#" does not count as navigation
const stripHash = (url) => url.split('#')[0];

// Visible desktop "Company" nav link
const companyLink = (page) =>
  page.getByRole('link', { name: 'Company', exact: true }).filter({ visible: true }).first();

// Dropdown links live inside the mega-menu items (same IDs as codegen)
const menuLink = (page, name) =>
  page
    .locator('[id^="megamenu-menu-item-"]')
    .getByRole('link', { name, exact: true })
    .filter({ visible: true })
    .first();

// Footer links: the footer is last in the DOM, so take the last match
const footerLink = (page, name) =>
  page.getByRole('link', { name, exact: true }).last();

async function gotoHome(page) {
  await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // The cookie/GDPR banner covers links and blocks clicks, so hide it
  await page.addStyleTag({ content: '#mfn-gdpr { display: none !important; }' });
}

// Open the Company menu only if it is not already open
async function ensureMenuOpen(page, probeName = 'About') {
  const probe = menuLink(page, probeName);
  await companyLink(page).hover();
  if (!(await probe.isVisible())) {
    await companyLink(page).click();
  }
  await expect(probe).toBeVisible({ timeout: 10000 });
}

async function openCompanyMenu(page) {
  await gotoHome(page);
  await ensureMenuOpen(page);
}

// Click, then wait up to 8s for the page (ignoring #fragment) to change.
async function clickAndGetUrl(page, link) {
  const before = stripHash(page.url());
  await link.click();
  try {
    await page.waitForURL((u) => stripHash(u.href) !== before, {
      timeout: 8000,
      waitUntil: 'domcontentloaded',
    });
  } catch {
    // Page did not change: this is what the bug looks like
  }
  return page.url();
}

// ---------- HEADER MENU ----------
for (const name of HEADER_LINKS) {
  const label = HEADER_BROKEN.includes(name) ? 'BUG' : 'CONTROL';

  test(`${label}: header Company > ${name} navigates`, async ({ page }) => {
    await openCompanyMenu(page);

    const link = menuLink(page, name);
    const href = await link.getAttribute('href');
    console.log(`[header] ${name} href = "${href}"`);

    const urlBefore = page.url();
    const urlAfter = await clickAndGetUrl(page, link);

    expect.soft(href, `${name} has a placeholder href`).not.toBe('#');
    expect.soft(stripHash(urlAfter), `${name} left the user on the same page`).not.toBe(stripHash(urlBefore));
  });
}

// ---------- FOOTER (comparison) ----------
for (const name of FOOTER_LINKS) {
  const label = FOOTER_BROKEN.includes(name) ? 'BUG' : 'CONTROL';

  test(`${label}: footer Company > ${name} navigates`, async ({ page }) => {
    await gotoHome(page);

    const link = footerLink(page, name);
    await link.scrollIntoViewIfNeeded({ timeout: 10000 });
    const href = await link.getAttribute('href');
    console.log(`[footer] ${name} href = "${href}"`);

    const urlBefore = page.url();
    const urlAfter = await clickAndGetUrl(page, link);

    expect.soft(href, `${name} has a placeholder href`).not.toBe('#');
    expect.soft(stripHash(urlAfter), `${name} left the user on the same page`).not.toBe(stripHash(urlBefore));
  });
}

// ---------- Your exact scenario ----------
test('BUG: header Careers keeps the user on the How We Work page', async ({ page }) => {
  await openCompanyMenu(page);
  const howWeWorkUrl = await clickAndGetUrl(page, menuLink(page, 'How We Work'));
  expect(howWeWorkUrl, 'How We Work should have navigated').toContain('/how-we-work');

  // The banner can reappear on the new page, so hide it again
  await page.addStyleTag({ content: '#mfn-gdpr { display: none !important; }' });

  await ensureMenuOpen(page, 'Careers');
  const afterCareers = await clickAndGetUrl(page, menuLink(page, 'Careers'));
  console.log(`Before Careers: ${howWeWorkUrl}`);
  console.log(`After Careers:  ${afterCareers}`);

  expect(
    stripHash(afterCareers),
    'Careers should leave the How We Work page'
  ).not.toBe(stripHash(howWeWorkUrl));
});