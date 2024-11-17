import type { RequestListener } from "http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import type { ApplicationFunction, MiddlewareOptions } from "./types.js";
import { defaultWebhooksPath } from "./server/server.js";
import { createOctotask } from "./create-octotask.js";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { octotask = createOctotask(), webhooksPath } = {} as MiddlewareOptions,
): RequestListener {
  octotask.load(appFn);

  return createWebhooksMiddleware(octotask.webhooks, {
    path: webhooksPath || octotask.webhookPath || defaultWebhooksPath,
  });
}
