// Service object for the JSONPlaceholder /posts resource (the API equivalent of a page object).
class PostsApi {
  /** @param {import('playwright').APIRequestContext} request */
  constructor(request) {
    this.request = request;
  }

  /** POST /posts. `rawBody` lets a test send a body that is not a JS object (e.g. broken JSON). */
  async create(payload, { rawBody } = {}) {
    const started = Date.now();
    const response = await this.request.post('posts', rawBody !== undefined ? { data: rawBody } : { data: payload });
    const elapsedMs = Date.now() - started;
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }
    return { status: response.status(), headers: response.headers(), text, json, elapsedMs };
  }
}

module.exports = { PostsApi };
