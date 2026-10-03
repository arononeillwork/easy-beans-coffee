import { expect, test } from '@playwright/test';
import { E2E_BOARD_PIN } from './builders/boardPin';
import { AdminPage } from './builders/pages';
import { testBoardTasks } from './builders/taskBuilder';

/** Lilac (#B7A3D8) — the pinned-row outline. */
const PIN_OUTLINE = 'rgb(183, 163, 216)';

test.describe('/admin PIN gate', () => {
  test('asks for the PIN, turns a wrong one away and opens on the right one', async ({ page }) => {
    await new AdminPage(page).withTasks(testBoardTasks());
    await page.goto('/admin');

    const pin = page.getByLabel('PIN');
    const open = page.getByRole('button', { name: 'Open the board' });
    await expect(pin).toBeVisible();
    await expect(page.getByText('Get the AC sorted')).toBeHidden();

    await pin.fill('0000');
    await open.click();
    await expect(page.getByText('That PIN didn’t match')).toBeVisible();

    await page.getByLabel('PIN').fill(E2E_BOARD_PIN);
    await page.getByRole('button', { name: 'Open the board' }).click();
    await expect(page.getByText('Get the AC sorted')).toBeVisible();
  });
});

test.describe('/admin task board', () => {
  test.beforeEach(async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.withDefaultView();
    await admin.withTasks(testBoardTasks());
    await admin.open();
    // Skip rather than fail when the board can't reach Supabase at all.
    test.skip(!(await admin.isConfigured()), 'NEXT_PUBLIC_BOARD_SUPABASE_* not set');
  });

  test('groups open jobs by priority and counts them', async ({ page }) => {
    const admin = new AdminPage(page);

    await expect(admin.group('Before we reopen')).toContainText('Get the AC sorted');
    await expect(admin.group('Before we reopen')).toContainText('3');
    await expect(admin.group('Next up')).toContainText('Branded fans');
    await expect(admin.group('Later')).toContainText('Image / video loop for the TV');

    // Done jobs stay hidden until asked for.
    await expect(page.getByText('Clean the outside terrace')).toBeHidden();
    await page.getByLabel('Show done').check();
    await expect(page.getByText('Clean the outside terrace')).toBeVisible();
  });

  test('the starred filter narrows the board to starred jobs', async ({ page }) => {
    const admin = new AdminPage(page);

    await page.getByRole('button', { name: /starred/i }).click();

    await expect(admin.rowTitles()).toHaveText(['Buy bowls and plates', 'Branded fans']);
    await expect(page.getByText('Get the AC sorted')).toBeHidden();
  });

  test('a pinned job is outlined and sits at the top of its group', async ({ page }) => {
    const admin = new AdminPage(page);
    const pinnedRow = admin.row('Branded fans');

    await expect(pinnedRow).toHaveCSS('outline-color', PIN_OUTLINE);
    await expect(pinnedRow).toHaveCSS('outline-style', 'solid');
    // Pinned first, even though "Rubbish bin" has the lower position.
    await expect(admin.groupRowTitles('Next up')).toHaveText([
      'Branded fans',
      'Rubbish bin for outside',
    ]);

    // An unpinned job has no outline.
    await expect(admin.row('Rubbish bin for outside')).toHaveCSS('outline-style', 'none');
  });

  test('grouping by category shows section sub-headings', async ({ page }) => {
    const admin = new AdminPage(page);

    await page.getByRole('button', { name: 'Category', exact: true }).click();

    await expect(admin.group('Tech & till')).toContainText('Square');
    await expect(admin.group('Shop')).toContainText('Get the AC sorted');
  });

  test('a category chip filters the board and shows its count', async ({ page }) => {
    const filters = page.getByRole('group', { name: 'Filter by category' });
    const buying = filters.getByRole('button', { name: /^Buying/ });

    // Two open Buying jobs; the done one in Shop isn't counted.
    await expect(buying).toContainText('2');
    await buying.click();
    await expect(buying).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Buy bowls and plates')).toBeVisible();
    await expect(page.getByText('Get the AC sorted')).toBeHidden();

    // Tapping it again goes back to everything.
    await buying.click();
    await expect(page.getByText('Get the AC sorted')).toBeVisible();
  });

  test('a job added while a category is filtered is filed under it', async ({ page }) => {
    const filters = page.getByRole('group', { name: 'Filter by category' });
    const categoryPill = page.getByRole('button', { name: 'Category for the new job' });

    await filters.getByRole('button', { name: /^Design/ }).click();
    await expect(categoryPill).toHaveText(/Design/);

    const created = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().includes('/rest/v1/ToDo'),
    );
    await page.getByPlaceholder('Add a job').fill('Window vinyl');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    expect((await created).postDataJSON()).toMatchObject({ title: 'Window vinyl', area: 'design' });
    await expect(page.getByText('Window vinyl')).toBeVisible();

    // Back on All, the pill keeps the last category rather than jumping.
    await filters.getByRole('button', { name: /^All/ }).click();
    await expect(categoryPill).toHaveText(/Design/);
  });
});
