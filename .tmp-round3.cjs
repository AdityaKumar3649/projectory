async (page) => {
  const L = "http://localhost:3001";
  const r = {};
  const f = (id) => page.locator("#" + id);

  await page.context().clearCookies();
  await page.goto(L + "/sign-in", { waitUntil: "domcontentloaded" });
  await f("sign-in-email").waitFor({ timeout: 10000 });
  await f("sign-in-email").fill("demo@projectory.app");
  await f("sign-in-password").fill("projectory");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // ---- sort: do titles order correctly for each option?
  await page.goto(L + "/dashboard", { waitUntil: "domcontentloaded" });
  const titles = async () =>
    page.$$eval("main a[href*='/edit']", (as) =>
      as.map((a) => (a.textContent || "").trim()).filter(Boolean),
    );
  const sorts = ["updated", "created", "title"];
  r.sortOrder = {};
  for (const s of sorts) {
    await page.goto(L + "/dashboard?sort=" + s, { waitUntil: "domcontentloaded" });
    r.sortOrder[s] = await titles();
  }
  // an unknown sort must fall back, not crash or empty the list
  await page.goto(L + "/dashboard?sort=bogus", { waitUntil: "domcontentloaded" });
  r.unknownSortCount = (await titles()).length;

  // ---- filter
  for (const fl of ["all", "pending", "approved", "rejected"]) {
    await page.goto(L + "/dashboard?filter=" + fl, { waitUntil: "domcontentloaded" });
    r["filter_" + fl] = (await titles()).length;
  }

  // ---- does the status filter actually agree with the visible badges?
  await page.goto(L + "/dashboard?filter=approved", { waitUntil: "domcontentloaded" });
  r.approvedBadges = await page.$$eval("main", (m) =>
    (m[0].innerText.match(/approved|pending|rejected/gi) || []),
  );

  // ---- keyboard: tab order on the dashboard, and skip link presence
  await page.goto(L + "/dashboard", { waitUntil: "domcontentloaded" });
  const tabbed = [];
  await page.evaluate(() => document.body.focus());
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    tabbed.push(
      await page.evaluate(() => {
        const a = document.activeElement;
        return (a?.getAttribute("aria-label") || a?.textContent || a?.tagName || "?").trim().slice(0, 34);
      }),
    );
  }
  r.tabOrder = tabbed;
  r.skipLink = await page.evaluate(() => {
    const a = document.querySelector("a[href^='#']");
    return a ? { text: a.textContent.trim(), href: a.getAttribute("href"), visibleOnFocus: null } : null;
  });

  // ---- empty states: filter that matches nothing
  await page.goto(L + "/dashboard?filter=rejected", { waitUntil: "domcontentloaded" });
  r.emptyState = await page.evaluate(() => {
    const main = document.querySelector("main");
    const t = main.innerText.trim();
    return { length: t.length, hasHeading: !!main.querySelector("h2, h3"), text: t.slice(0, 160) };
  });

  // ---- long-content resilience: a 120-char title must not break the card
  await page.goto(L + "/dashboard/new", { waitUntil: "domcontentloaded" });
  await f("title").fill("A".repeat(120));
  await f("description").fill("D".repeat(200));
  await f("repoUrl").fill("https://github.com/probe/" + "x".repeat(60));
  await page.getByRole("button", { name: /create project/i }).click();
  await page.waitForURL(/\/dashboard(?!\/new)/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  r.longContentOverflow = await page.evaluate(() => ({
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // any element wider than its container is an overflow bug
    widest: Math.max(...[...document.querySelectorAll("main *")].map((e) => e.scrollWidth - e.clientWidth).filter((n) => n > 0), 0),
  }));

  // ---- unicode + RTL + emoji in a title
  await page.goto(L + "/dashboard/new", { waitUntil: "domcontentloaded" });
  await f("title").fill("Ünïcödé テスト \u{1F680} عربي");
  await f("description").fill("Checking bidirectional and emoji rendering in cards.");
  await f("repoUrl").fill("https://github.com/probe/unicode");
  await page.getByRole("button", { name: /create project/i }).click();
  await page.waitForURL(/\/dashboard(?!\/new)/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  r.unicodeOverflow = await page.evaluate(() => ({
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    widest: Math.max(...[...document.querySelectorAll("main *")].map((e) => e.scrollWidth - e.clientWidth).filter((n) => n > 0), 0),
  }));
  r.unicodeRendered = await page.evaluate(() => document.querySelector("main").innerText.includes("\u{1F680}"));

  return r;
}