import type { Page, Route } from '@playwright/test';
import type { MenuResponse } from '@/features/order/types';
import type { PriceBook } from '@/features/menu/priceBook';
import type { Task } from '@/features/admin/taskModel';
import { TaskBuilder } from './taskBuilder';
import { E2E_BOARD_PIN } from './boardPin';

/**
 * Page objects with fluent, builder-style setup so specs stay one-liners.
 * `SitePage` handles shared concerns (popup, language, API mocking);
 * concrete pages add their own accessors.
 */

export class SitePage {
  /** Locale lives in the URL (`/es/...`, `/en/...`); Spanish is the default tree. */
  protected lang: 'en' | 'es' = 'es';

  constructor(protected readonly page: Page) {}

  /** Pre-marks the first-visit popup as seen so it doesn't interfere. */
  async withPopupDismissed(): Promise<this> {
    await this.page.addInitScript(() => {
      window.localStorage.setItem('ebc:popup-seen', new Date().toISOString());
    });
    return this;
  }

  /** Selects which locale tree subsequent `open()` calls navigate into. */
  async withLanguage(lang: 'en' | 'es'): Promise<this> {
    this.lang = lang;
    return this;
  }

  /** Locale-prefixed path, e.g. `path('/shop')` → `/es/shop`. */
  protected path(suffix = ''): string {
    return `/${this.lang}${suffix}`;
  }

  /** Mocks GET /api/menu with a built MenuResponse. Still used by /shop. */
  async withMenu(menu: MenuResponse): Promise<this> {
    await this.page.route('**/api/menu', (route: Route) =>
      route.fulfill({ json: menu }),
    );
    return this;
  }

  /**
   * Mocks GET /api/prices for the drink studio.
   *
   * Reachable only because the e2e server leaves Square unconfigured (see
   * playwright.config.ts): the page then prerenders an empty book and the
   * client fills it in from this route. With Square configured — production —
   * prices are already in the HTML and nothing is fetched.
   */
  async withPrices(book: PriceBook): Promise<this> {
    await this.page.route('**/api/prices', (route: Route) => route.fulfill({ json: book }));
    return this;
  }
}

export class HomePage extends SitePage {
  async open(): Promise<this> {
    await this.page.goto(this.path());
    return this;
  }

  heroHeadline() {
    return this.page.getByRole('heading', { level: 1 });
  }

  popup() {
    return this.page.getByRole('dialog');
  }
}

export class ShopPage extends SitePage {
  async open(collection?: string): Promise<this> {
    await this.page.goto(this.path(collection ? `/shop/${collection}` : '/shop'));
    return this;
  }

  async openProduct(collection: string, handle: string): Promise<this> {
    await this.page.goto(this.path(`/shop/${collection}/${handle}`));
    return this;
  }

  /** The drinks menu — one page with ordering — in this page's locale tree. */
  async openMenu(): Promise<this> {
    await this.page.goto(this.path('/order'));
    return this;
  }

  productCard(name: string) {
    return this.page.getByRole('link', { name, exact: true });
  }

  addToCartButtons() {
    return this.page.getByRole('button', { name: /add to cart|añadir a la cesta/i });
  }

  cartBadge() {
    return this.page.locator('header .MuiBadge-badge');
  }

  /** Scoped to the MUI Alert — Next's route announcer is also role="alert". */
  placeholderNotice() {
    return this.page.locator('.MuiAlert-root');
  }
}

export class AdminPage extends SitePage {
  /**
   * Mocks the Supabase REST calls for the `ToDo` table: the initial select, any
   * PATCH (echoed back so optimistic updates stick) and any POST (echoed back as
   * the created row). Keeps the board off the live table — and off the network
   * for writes.
   */
  async withTasks(tasks: Task[]): Promise<this> {
    await this.page.route('**/rest/v1/ToDo*', (route: Route) => {
      const method = route.request().method();
      if (method === 'GET') return route.fulfill({ json: tasks });
      if (method === 'PATCH') {
        const body = route.request().postDataJSON() as Partial<Task>;
        return route.fulfill({ json: [{ ...tasks[0], ...body }] });
      }
      if (method === 'POST') {
        const body = route.request().postDataJSON() as Partial<Task>;
        return route.fulfill({
          status: 201,
          json: { ...new TaskBuilder('New job').build(), id: 'new-job', ...body },
        });
      }
      return route.fulfill({ json: [] });
    });
    return this;
  }

  /** Starts with a clean view so a remembered grouping can't leak between specs. */
  async withDefaultView(): Promise<this> {
    await this.page.addInitScript(() => {
      window.localStorage.removeItem('ebc:admin:view');
    });
    return this;
  }

  /** Opens the board already signed in; the PIN gate has its own spec. */
  async open(): Promise<this> {
    await this.page
      .context()
      .addCookies([{ name: 'eb_board', value: E2E_BOARD_PIN, domain: 'localhost', path: '/' }]);
    await this.page.goto('/admin');
    return this;
  }

  group(name: string) {
    return this.page.locator('section').filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  row(title: string) {
    return this.page.locator('.MuiPaper-root').filter({ hasText: title }).first();
  }

  /** Job titles in board order — each row's title is its only paragraph. */
  rowTitles() {
    return this.page.locator('.MuiPaper-root p');
  }

  groupRowTitles(name: string) {
    return this.group(name).locator('.MuiPaper-root p');
  }

  /**
   * Waits for the board to settle, then reports whether it loaded. False means
   * Supabase config was missing, so the page is showing its error notice.
   */
  async isConfigured(): Promise<boolean> {
    const notice = this.page.locator('.MuiAlert-root');
    await this.page
      .locator('section')
      .first()
      .or(notice)
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => undefined);
    return !(await notice.isVisible().catch(() => false));
  }
}

/** The drink studio at /order: the menu and the ordering flow, one screen. */
export class OrderPage extends SitePage {
  async open(): Promise<this> {
    await this.page.goto(this.path('/order'));
    return this;
  }

  /** The board's first fork: Drinks or Food. Sections live under one of the two. */
  menuGroup(name: string) {
    return this.page.getByRole('radio', { name, exact: true });
  }

  /** Which part of the board is showing: Coffee, Speciality, Bakery… */
  section(name: string) {
    return this.page.getByRole('tab', { name, exact: true });
  }

  /**
   * A drink's entry in the rail under the stage. The accessible name is the
   * drink followed by its from-price, so the match is anchored on both sides of
   * the name — otherwise "Espresso" also finds "Espresso Doble".
   */
  railEntry(name: string) {
    return this.page.getByRole('option', { name: new RegExp(`^${name} (·|€)`) });
  }

  /** The price tile, rather than any of the prices along the rail. */
  price() {
    return this.page.locator('[data-stat="price"]');
  }

  /** The stage panel for one drink, whether or not it is the one on screen. */
  stagePanel(drinkId: string) {
    return this.page.locator(`[data-drink="${drinkId}"]`);
  }

  /** The photograph currently shown for a drink. */
  photo(drinkId: string) {
    return this.stagePanel(drinkId).locator('img').last();
  }

  /** The name of the drink being built — it changes with the flavour chosen. */
  drinkName() {
    return this.page.getByRole('heading', { level: 2 }).first();
  }

  temperature(label: string) {
    return this.page.getByRole('radio', { name: label, exact: true });
  }

  /**
   * One chip on a milk / syrup / purée rail, found by the rail's label and the
   * chip's own text. Anchored to the start of the text so "Caramel" cannot also
   * match "Salted Caramel".
   */
  optionChip(rail: string, name: string) {
    return this.page
      .locator(`[aria-label="${rail}"]`)
      .first()
      .locator('button')
      .filter({ hasText: new RegExp(`^${name}`) })
      .first();
  }

  addButton() {
    return this.page.getByRole('button', { name: /añadir al pedido|add to order|agotado|sold out/i });
  }

  /** Stage arrows, for stepping drinks without swiping. */
  nextArrow() {
    return this.page.getByRole('button', { name: /siguiente bebida|next drink/i });
  }

  prevArrow() {
    return this.page.getByRole('button', { name: /bebida anterior|previous drink/i });
  }

  /** The basket count in the sticky site header — the studio has no FAB. */
  cartBadge() {
    return this.page.locator('header .MuiBadge-badge');
  }

  /** Opens the cart drawer from the header. */
  async openCart(): Promise<void> {
    await this.page.locator('header').getByRole('button', { name: /tu pedido|your order/i }).click();
  }
}
