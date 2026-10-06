const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { PostsApi } = require('../api/PostsApi');
const { VALID, SPECIAL_TITLES, INVALID_PAYLOADS, longTitle, withTitle } = require('../api/payloads');

async function send(world, payload, opts) {
  world.ctx.sent = payload;
  world.ctx.res = await new PostsApi(world.api).create(payload, opts);
  const { status, elapsedMs, text } = world.ctx.res;
  const preview = text.length > 400 ? `${text.slice(0, 400)}… (${text.length} chars)` : text;
  world.attach(`POST /posts → ${status} in ${elapsedMs} ms\nResponse: ${preview}`);
}

When('I create a post with a valid payload', async function () {
  await send(this, { ...VALID });
});

When('I create a post whose title is {int} characters long', async function (length) {
  await send(this, withTitle(longTitle(length)));
});

When('I create a post whose title contains {string}', async function (name) {
  if (!(name in SPECIAL_TITLES)) throw new Error(`Unknown special-character case "${name}"`);
  await send(this, withTitle(SPECIAL_TITLES[name]));
});

When('I create a post with an invalid payload {string}', async function (name) {
  if (!(name in INVALID_PAYLOADS)) throw new Error(`Unknown invalid payload "${name}"`);
  await send(this, INVALID_PAYLOADS[name]);
});

When('I send a POST request with a malformed JSON body', async function () {
  await send(this, null, { rawBody: '{"title": "broken", "userId": 1,' });
});

Then('the response status should be {int}', async function (status) {
  expect(this.ctx.res.status).toBe(status);
});

Then('the response status should be one of {string}', async function (list) {
  const allowed = list.split(',').map((s) => Number(s.trim()));
  expect(allowed).toContain(this.ctx.res.status);
});

Then('the API should not fail with a server error', async function () {
  expect(this.ctx.res.status, 'server-side failure (5xx)').toBeLessThan(500);
});

Then('the response should echo the submitted fields', async function () {
  expect(this.ctx.res.json).toMatchObject(this.ctx.sent);
});

Then('the response should contain a numeric {string}', async function (field) {
  expect(typeof this.ctx.res.json[field]).toBe('number');
});

Then('if the post was accepted the title should be stored without truncation', async function () {
  if (this.ctx.res.status !== 201) return;
  expect(this.ctx.res.json.title.length).toBe(this.ctx.sent.title.length);
});

Then('if the post was accepted the title should be returned exactly as sent', async function () {
  if (this.ctx.res.status !== 201) return;
  expect(this.ctx.res.json.title).toBe(this.ctx.sent.title);
});

Then('the response should arrive within {int} ms', async function (ms) {
  expect(this.ctx.res.elapsedMs).toBeLessThan(ms);
});

Then('the API should reject the request with a 4xx client error and an error message', async function () {
  const { status, text } = this.ctx.res;
  expect(status, `expected 4xx but API returned ${status} with body ${text.slice(0, 200)}`).toBeGreaterThanOrEqual(400);
  expect(status).toBeLessThan(500);
  expect(text.trim().length, 'error response should explain what is wrong').toBeGreaterThan(2);
});
