---
next: simulating-webhooks
title: Testing
---

# Testing

We highly recommend working in the style of [test-driven development](http://agiledata.org/essays/tdd.html) when creating octotask apps. It is frustrating to constantly create real GitHub events in order to test an app. Redelivering webhooks is possible and can be accessed in your app's [settings](https://github.com/settings/apps) page under the **Advanced** tab. We do offer the above documented `receive` method to help make this easier; however, by writing your tests first, you can avoid repeatedly recreating actual events from GitHub to check if your code is working.

For our testing examples, we use [jest](https://facebook.github.io/jest/), but there are other options that can perform similar operations. We also recommend using [nock](https://github.com/nock/nock), a tool for mocking HTTP requests, which is often crucial to testing in Octotask, considering how much of Octotask depends on GitHub's APIs. Here's an example of creating an app instance and using nock to test that we correctly hit the GitHub API:

```js
import nock from "nock";
// Requiring our app implementation
import myOctotaskApp from "../index.js";
import { Octotask, OctotaskOctokit } from "octotask";
// Requiring our fixtures
import payload from "./fixtures/issues.opened.json" with { type: "json" };
const issueCreatedBody = { body: "Thanks for opening this issue!" };

describe("My Octotask app", () => {
  let octotask;

  beforeEach(() => {
    nock.disableNetConnect();
    octotask = new Octotask({
      githubToken: "test",
      // Disable throttling & retrying requests for easier testing
      Octokit: OctotaskOctokit.defaults((instanceOptions: any) => {
        return {
          ...instanceOptions,
          retry: { enabled: false },
          throttle: { enabled: false },
        };
      }),
    });
    myOctotaskApp(octotask);
  });

  test("creates a passing check", async () => {
    // Test that we correctly return a test token
    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test" });

    // Test that a comment is posted
    nock("https://api.github.com")
      .post("/repos/hiimbex/testing-things/issues/1/comments", (body) => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await octotask.receive({ name: "issues", payload });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
```

## Testing log output

Octotask is using [pino](https://getpino.io/) for logging. A custom `pino` instance can be passed to the `Octotask` constructor. You can write all log output into an array by passing a custom transport function:

```js
import pino from "pino";
import Stream from "stream";

const streamLogsToOutput = new Stream.Writable({ objectMode: true });
streamLogsToOutput._write = (object, encoding, done) => {
  output.push(JSON.parse(object));
  done();
};

const octotask = new Octotask({
  id: 1,
  githubToken: "test",
  // Disable throttling & retrying requests for easier testing
  Octokit: OctotaskOctokit.defaults({
    retry: { enabled: false },
    throttle: { enabled: false },
  }),
  log: pino(streamLogsToOutput),
});

octotask.log.info("test");
// output is now:
// [ { level: 30, time: 1600619283012, pid: 44071, hostname: 'Gregors-MacBook-Pro.local', msg: 'test' } ]
```

## Examples:

Using Jest

- [Settings](https://github.com/octotask/settings): [octotask/settings/test/integration/plugins/repository.test.js](https://github.com/octotask/settings/blob/master/test/integration/plugins/repository.test.js)
- [DCO](https://github.com/octotask/dco): [octotask/dco/test/index.test.js](https://github.com/octotask/dco/blob/master/test/index.test.js)

Using Tap

- [WIP](https://github.com/apps/wip/): [wip/app/test/integration](https://github.com/wip/app/tree/master/test/integration)

Using Mocha and Sinon

- [Auto-Me-Bot](https://github.com/TomerFi/auto-me-bot): [tests](https://github.com/TomerFi/auto-me-bot/tree/main/tests)
