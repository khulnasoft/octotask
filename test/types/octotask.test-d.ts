import { RepositoryEditedEvent } from "@octokit/webhooks-types";
import { expectType } from "tsd";
import { Octotask } from "../../src/index.js";

const app = new Octotask({});

app.on("repository.edited", (context) => {
  expectType<RepositoryEditedEvent>(context.payload);
});
