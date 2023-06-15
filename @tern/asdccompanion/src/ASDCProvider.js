import got from "got";
import Provider from "@uppy/companion/lib/server/provider/Provider.js";
import { withProviderErrorHandling } from "@uppy/companion/lib/server/provider/providerErrors.js";
import { prepareStream } from "@uppy/companion/lib/server/helpers/utils.js";

import { adaptData } from "./adapter.js";

// TODO: configurable would be good
const DEFAULT_BASE_URL = "https://asdc.cloud.edu.au";

const getClient = ({ baseUrl, token }) => got.extend({
  prefixUrl: baseUrl,
  headers: {
    authorization: `Bearer ${token}`,
  },
});

/**
 * A provider to interact with WebODM
 */
export class ASDCProvider extends Provider {
  // static version = 2

  // used in /connect/<provider>
  static get authProvider() {
    return "asdc";
  }

  constructor(options) {
    super(options);
    this.authProvider = ASDCProvider.authProvider

    // make url building easier
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    // console.log("CONSTRUCT: ", options);
  }

  async list({
    token, directory, // query, companion,
  }) {
    // if directory is not set, then list all projects
    // otherwise directory has full API path within /projects
    const path = directory ? `/projects/${directory}` : "/projects/";

    return this.#withErrorHandling("provider.asdc.list.error", async () => {
      const listing = await getClient({ baseUrl: this.baseUrl, token }).get(`api/${path}`).json();
      return adaptData(listing);
    });
  }

  async download({
    id, token, // query
  }) {
    // console.log("DOWNLOAD: ", id);
    return this.#withErrorHandling("provider.asdc.download.error", async () => {
      const stream = getClient({ baseUrl: this.baseUrl, token }).stream.get(`api/projects/${id}`);
      await prepareStream(stream);
      return { stream };
    });
  }

  async size({
    id, token, // query
  }) {
    // console.log("SIZE:", id);
    // TODO: does WebODM support HEAD requests to get size ?
    return this.#withErrorHandling("provider.asdc.size.error", async () => {
      const resp = await getClient({ baseUrl: this.baseUrl, token }).head(`api/projects/${id}`);
      return parseInt(resp.headers["content-length"], 10);
    });
  }

  // TODO: imprement this in case we can get thumbnails from WebODM
  async thumbnail({ id, token }) {
    return super.thumbnail({ id, token });
    // not implementing this because WebODM does not provide thumbnails
    // console.error('call to thumbnail is not implemented', 'provider.asdc.thumbnail.error');
    // throw new Error('call to thumbnail is not implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  async logout() { // { token, companion }) {
    // keys: revoked, manuel_revoke_url ... (latter is only used if revoked is false)
    return { revoked: true };
  }

  // helper to handle WebODM API Errors
  async #withErrorHandling(tag, fn) {
    return withProviderErrorHandling({
      fn,
      tag,
      providerName: this.authProvider,
      isAuthError: (response) => response.statusCode === 401,
      getJsonErrorMessage: (body) => body?.message,
    });
  }
}
