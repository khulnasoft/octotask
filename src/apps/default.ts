import { resolve } from "node:path";

import type { ApplicationFunctionOptions, Octotask } from "../index.js";
import { loadPackageJson } from "../helpers/load-package-json.js";
import { octotaskView } from "../views/octotask.js";

export function defaultApp(
  _app: Octotask,
  { getRouter, cwd = process.cwd() }: ApplicationFunctionOptions,
) {
  if (!getRouter) {
    throw new Error("getRouter() is required for defaultApp");
  }

  const pkg = loadPackageJson(resolve(cwd, "package.json"));
  const octotaskViewRendered = octotaskView({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  });
  const router = getRouter();

  router.get("/octotask", (_req, res) => {
    res.send(octotaskViewRendered);
  });

  router.get("/", (_req, res) => res.redirect("/octotask"));
}
