import Stream from "node:stream";

import type {
  EmitterWebhookEvent,
  EmitterWebhookEvent as WebhookEvent,
} from "@octokit/webhooks";
import Bottleneck from "bottleneck";
import fetchMock from "fetch-mock";
import { pino, type LogFn } from "pino";
import { describe, expect, test, beforeEach, it, vi, type Mock } from "vitest";

import { Octotask, OctotaskOctokit, Context } from "../src/index.js";

import webhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import type { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types.js";

const appId = 1056116;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA8L33Xb8OvUO2bDC+VWlqREamImfMG6lcXfpowzocXGHC32NX
27TZJQV1TKIdO+yEMTSKl8IRBoP/y5VwzQ3x6IjlHauehWb0ZMMnGllcOk/bjueU
zZ0gzedFHIEvbt7E7PNmDocgykcZshR1MwrNCvKiT9O0Ko9P7ZuD2rv7FkHw5A7R
kVbAfBpzxxpgMXzED65pTlLmAajMuz7K0NtK9vI1Haz0XJ802H2znVMwyXw6zwjg
XQZHY86x3Kp/VEmBTZrsCNLSY22YLkSRcEuQVPeY8P9LtuoAlPWEiTSOdX7nNMHl
SxIAoS2/Z65RTiSy+kE5Z/RwK+OUDKe2Ku4pUQIDAQABAoIBAQC8QNCezjiIZ9rO
347222ft3BEt9lz1hIpmMtqZT2e+FfR9GwIpHFJxUMNZGawin+D/WUbHRUpq/e2Z
FVMQBkeUvvfrK7jaOJgD81cwk5A7SRc3uH/0CVsNqDuy/pJI8Iqtf+felGxfwRmm
17iOIXQVi4bBRZstbMPj2ihRc4306Dc2l1TqWLQzw9XenqU2IfkBd3KqHBNu7nUQ
T4EAdS8HOJH4xMjdqR8X1pD0aOHKqCeLWYkixgV2IHoZvefvrLrQtNBHU2fxVVAY
G+P61SKRDr39qDGZXUTydTvBGBENBgy5P3jln1H6dd0AZZ/1nFz7yOToqW7Q5+lg
U8aysynBAoGBAP/qAHFj/IwrV4NEfp8fOmt3qCYPAuich4J4NE/4zsNMTkvyLJRk
cEA6aua+7QDZQTf4Mo+t1v4RrUFmh510r8aaDwxTpY5zvFoN6uC7L5wzKpMXBONK
IRBQmRDFmwPXa5PSZgS+yh86zevXkSibYH+eLqQjjDTt8QnUj4AYn6JDAoGBAPDS
qQ2bLmmkpIUUISFG+UyCCvUnGfkGK2utPRDdDabGfwT6J2j9IPwgKcZXCXF1k2Ww
Y0fUwPLcc4VuQ3u9xNYg4r9be4QDNTEciLSrjXXRyhIEoJNqtmeEQBZ1u9GQxb/t
DELUkmmfj76C6cPvxIHioxWKB7l40Y82lxjd057bAoGAbAJLJZBZqp8wVEq4VlhL
w8fAxC9ZvusxljM9gPM18N9nvE392rN5XOJK9BBo3w7So9ixHkr0jk7PnOa1HhN9
jIjBCSbUnQbj2+47z5WxRm+h7GquuW8z/TrHH3kHL9vfn4gRXrdXf07GUl+s+EJ7
u+D7NnN6XWx/avK3jgzWcxkCgYBn++43C8yMnSTUuY5cmhLHMFee51VVq45QHiuB
/pEIdCkgcwtVUAdQFmszUx2mugf9Hp6fw4PU2c+fy66j3ZsCgoyl59B7fg8Xt6Rn
rrOULhO8l/bl8Gv2YqpxiECjCon4h1iF+teFd/pPXqOlkQAevUeB42nWcg66ce3o
NNBNhQKBgA9gnFqrD7pCL5l2+0BEF2es0mm7h+pyDzRhlS0T6s7sdFAG1EOCUZBE
72Dm7v5PvMOqeHdmZ7MY5IAwzterApwClylwhE3HRHfVUSKfaIXfQDoXjHno9nRJ
rvvAx/vNJIrLMvcj5MXjIcuW7xnQzTS486tzH71cR6440mgpbdJM
-----END RSA PRIVATE KEY-----`;

const getPayloadExamples = <TName extends EmitterWebhookEventName>(
  name: TName,
) => {
  return (webhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === name.split(".")[0],
  )[0].examples as EmitterWebhookEvent<TName>["payload"][];
};
const getPayloadExample = <TName extends EmitterWebhookEventName>(
  name: TName,
) => {
  const examples = getPayloadExamples<TName>(name);
  if (name.includes(".")) {
    const [, action] = name.split(".");
    return examples.filter((payload) => {
      // @ts-expect-error
      return payload.action === action;
    })[0];
  }
  return examples[0];
};
describe("Octotask", () => {
  let octotask: Octotask;
  let event: WebhookEvent<
    "push" | "pull_request" | "installation" | "check_run"
  >;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    // Clear log output
    output = [];
    octotask = new Octotask({ githubToken: "faketoken" });
  });

  test(".version", () => {
    expect(Octotask.version).toEqual("0.0.0-development");
  });

  describe(".defaults()", () => {
    test("sets default options for constructor", async () => {
      const fetch = fetchMock.sandbox().getOnce("https://api.github.com/app", {
        status: 200,
        body: {
          id: 1,
        },
      });

      const MyOctotask = Octotask.defaults({ appId, privateKey });
      const octotask = new MyOctotask({
        request: { fetch },
      });
      const octokit = await octotask.auth();
      await octokit.apps.getAuthenticated();
    });
  });

  describe("constructor", () => {
    it("no options", () => {
      expect(() => new Octotask()).toThrow(
        "[@octokit/auth-app] appId option is required",
      );
    });

    it('{ githubToken: "faketoken" }', () => {
      // octotask with token. Should not throw
      new Octotask({ githubToken: "faketoken" });
    });

    it('{ appId, privateKey" }', () => {
      // octotask with appId/privateKey
      new Octotask({ appId, privateKey });
    });

    it("shouldn't overwrite `options.throttle` passed to `{Octokit: OctotaskOctokit.defaults(options)}`", () => {
      expect.assertions(1);

      const MyOctokit = OctotaskOctokit.plugin((_octokit, options) => {
        expect(options.throttle?.enabled).toEqual(true);
      }).defaults({
        appId,
        privateKey,
        throttle: {
          enabled: false,
        },
      });

      new Octotask({ Octokit: MyOctokit, appId, privateKey });
    });

    it("sets version", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });
      expect(octotask.version).toBe("0.0.0-development");
    });
  });

  describe("webhooks", () => {
    let event: WebhookEvent<"push"> = {
      id: "0",
      name: "push",
      payload: getPayloadExample("push"),
    };

    it("responds with the correct error if webhook secret does not match", async () => {
      expect.assertions(1);

      octotask.log.error = vi.fn() as LogFn;
      octotask.webhooks.on("push", () => {
        throw new Error("X-Hub-Signature-256 does not match blob signature");
      });

      try {
        await octotask.webhooks.receive(event);
      } catch (e) {
        expect((octotask.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is not found", async () => {
      expect.assertions(1);

      octotask.log.error = vi.fn() as LogFn;
      octotask.webhooks.on("push", () => {
        throw new Error("No X-Hub-Signature-256 found on request");
      });

      try {
        await octotask.webhooks.receive(event);
      } catch (e) {
        expect((octotask.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is wrong", async () => {
      expect.assertions(1);

      octotask.log.error = vi.fn() as LogFn;
      octotask.webhooks.on("push", () => {
        throw Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature-256",
        );
      });

      try {
        await octotask.webhooks.receive(event);
      } catch (e) {
        expect((octotask.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the PEM file is missing", async () => {
      expect.assertions(1);

      octotask.log.error = vi.fn() as LogFn;
      octotask.webhooks.onAny(() => {
        throw new Error(
          "error:0906D06C:PEM routines:PEM_read_bio:no start line",
        );
      });

      try {
        await octotask.webhooks.receive(event);
      } catch (e) {
        expect((octotask.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the jwt could not be decoded", async () => {
      expect.assertions(1);

      octotask.log.error = vi.fn() as LogFn;
      octotask.webhooks.onAny(() => {
        throw new Error(
          '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}',
        );
      });

      try {
        await octotask.webhooks.receive(event);
      } catch (e) {
        expect((octotask.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });
  });

  describe("ghe support", () => {
    it("requests from the correct API URL", async () => {
      const appFn = async (app: Octotask) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3",
        );
      };

      new Octotask({
        appId,
        privateKey,
        baseUrl: "https://notreallygithub.com/api/v3",
      }).load(appFn);
    });

    it("requests from the correct API URL when setting `baseUrl` on Octokit constructor", async () => {
      const appFn = async (app: Octotask) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3",
        );
      };

      new Octotask({
        appId,
        privateKey,
        Octokit: OctotaskOctokit.defaults({
          baseUrl: "https://notreallygithub.com/api/v3",
        }),
      }).load(appFn);
    });
  });

  describe("ghe support with http", () => {
    it("requests from the correct API URL", async () => {
      const appFn = async (app: Octotask) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "http://notreallygithub.com/api/v3",
        );
      };

      new Octotask({
        appId,
        privateKey,
        baseUrl: "http://notreallygithub.com/api/v3",
      }).load(appFn);
    });
  });

  describe.skipIf(process.env.REDIS_URL === undefined)(
    "options.redisConfig as string",
    () => {
      it("sets throttle options", async () => {
        expect.assertions(2);

        octotask = new Octotask({
          githubToken: "faketoken",
          redisConfig: process.env.REDIS_URL,
          Octokit: OctotaskOctokit.plugin((_octokit, options) => {
            expect(options.throttle?.Bottleneck).toBe(Bottleneck);
            expect(options.throttle?.connection).toBeInstanceOf(
              Bottleneck.IORedisConnection,
            );
          }),
        });
      });
    },
  );

  describe.skipIf(process.env.REDIS_URL === undefined)(
    "redis configuration object",
    () => {
      it("sets throttle options", async () => {
        expect.assertions(2);
        const redisConfig = {
          host: process.env.REDIS_URL,
        };

        octotask = new Octotask({
          githubToken: "faketoken",
          redisConfig,
          Octokit: OctotaskOctokit.plugin((_octokit, options) => {
            expect(options.throttle?.Bottleneck).toBe(Bottleneck);
            expect(options.throttle?.connection).toBeInstanceOf(
              Bottleneck.IORedisConnection,
            );
          }),
        });
      });
    },
  );

  describe("on", () => {
    beforeEach(() => {
      event = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request"),
      };
    });

    it("calls callback when no action is specified", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      octotask.on("pull_request", spy);

      expect(spy).toHaveBeenCalledTimes(0);
      await octotask.receive(event);
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Context);
      expect(spy.mock.calls[0][0].payload).toBe(event.payload);
    });

    it("calls callback with same action", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      octotask.on("pull_request.opened", spy);

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      await octotask.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("does not call callback with different action", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      octotask.on("pull_request.closed", spy);

      await octotask.receive(event);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it("calls callback with onAny", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      octotask.onAny(spy);

      await octotask.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("calls callback x amount of times when an array of x actions is passed", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      const event2: WebhookEvent<"issues.opened"> = {
        id: "123",
        name: "issues",
        payload: getPayloadExample("issues.opened"),
      };

      const spy = vi.fn();
      octotask.on(["pull_request.opened", "issues.opened"], spy);

      await octotask.receive(event);
      await octotask.receive(event2);
      expect(spy.mock.calls.length).toEqual(2);
    });

    it("adds a logger on the context", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
        log: pino(streamLogsToOutput),
      });

      const handler = vi.fn().mockImplementation((context) => {
        expect(context.log.info).toBeDefined();
        context.log.info("testing");

        expect(output[0]).toEqual(
          expect.objectContaining({
            id: context.id,
            msg: "testing",
          }),
        );
      });

      octotask.on("pull_request", handler);
      await octotask.receive(event).catch(console.error);
      expect(handler).toHaveBeenCalled();
    });

    it("returns an authenticated client for installation.created", async () => {
      const fetch = fetchMock
        .sandbox()
        .postOnce("https://api.github.com/app/installations/1/access_tokens", {
          status: 201,
          body: {
            token: "v1.1f699f1069f60xxx",
            permissions: {
              issues: "write",
              contents: "read",
            },
          },
        })
        .getOnce(
          function (url, opts) {
            if (url === "https://api.github.com/") {
              expect(
                (opts.headers as Record<string, string>).authorization,
              ).toEqual("token v1.1f699f1069f60xxx");
              return true;
            }
            throw new Error("Should have matched");
          },
          {
            status: 200,
            body: {},
          },
        );

      const octotask = new Octotask({
        appId,
        privateKey,
        request: {
          fetch,
        },
      });

      event = {
        id: "123-456",
        name: "installation",
        payload: getPayloadExample("installation.created"),
      };
      event.payload.installation.id = 1;

      octotask.on("installation.created", async (context) => {
        await context.octokit.request("/");
      });

      await octotask.receive(event);
    });

    it("returns an unauthenticated client for installation.deleted", async () => {
      const fetch = fetchMock.sandbox().getOnce(
        function (url, opts) {
          if (url === "https://api.github.com/") {
            expect(
              (opts.headers as Record<string, string>).authorization,
            ).toEqual(undefined);
            return true;
          }
          throw new Error("Should have matched");
        },
        {
          body: {},
        },
      );

      const octotask = new Octotask({
        appId,
        privateKey,
        request: {
          fetch,
        },
      });

      event = {
        id: "123-456",
        name: "installation",
        payload: getPayloadExample("installation.deleted"),
      };
      event.payload.installation.id = 1;

      octotask.on("installation.deleted", async (context) => {
        await context.octokit.request("/");
      });

      await octotask.receive(event).catch(console.log);
    });

    it("returns an authenticated client for events without an installation", async () => {
      const fetch = fetchMock.sandbox().mock(
        function (url, opts) {
          if (url === "https://api.github.com/") {
            expect(
              (opts.headers as Record<string, string>).authorization,
            ).toEqual(undefined);
            return true;
          }
          throw new Error("Should have matched");
        },
        {
          body: {},
        },
      );

      const octotask = new Octotask({
        appId,
        privateKey,
        request: {
          fetch,
        },
      });

      event = {
        id: "123-456",
        name: "check_run",
        payload: getPayloadExamples("check_run").filter(
          (event) => typeof event.installation === "undefined",
        )[0],
      };

      octotask.on("check_run", async (context) => {
        await context.octokit.request("/");
      });

      await octotask.receive(event).catch(console.log);
    });
  });

  describe("receive", () => {
    beforeEach(() => {
      event = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };
    });

    it("delivers the event", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      octotask.on("pull_request", spy);

      await octotask.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("waits for async events to resolve", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      octotask.on("pull_request", () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            spy();
            resolve(null);
          }, 1);
        });
      });

      await octotask.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("returns a reject errors thrown in apps", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
        log: pino(streamLogsToOutput),
      });

      octotask.on("pull_request", () => {
        throw new Error("error from app");
      });

      try {
        await octotask.receive(event);
        throw new Error("expected error to be raised from app");
      } catch (error) {
        expect((error as Error).message).toMatch(/error from app/);
      }
    });

    it("passes logger to webhooks", async () => {
      const octotask = new Octotask({
        appId,
        privateKey,
        log: pino(streamLogsToOutput),
      });

      // @ts-expect-error
      octotask.on("unknown-event", () => {});

      expect(output.length).toEqual(1);
      expect(output[0].msg).toEqual(
        '"unknown-event" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)',
      );
    });
  });
});
