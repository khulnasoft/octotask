import Stream from "node:stream";

import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { pino } from "pino";
import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import { describe, expect, it, beforeEach, test } from "vitest";

import { Server, Octotask } from "../src/index.js";

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
const pushEvent = (
  (WebhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === "push",
  )[0] as WebhookDefinition<"push">
).examples[0];

describe("Server", () => {
  let server: Server;

  let output: any[];
  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(async () => {
    output = [];
    const log = pino(streamLogsToOutput);
    server = new Server({
      Octotask: Octotask.defaults({
        appId,
        privateKey,
        secret: "secret",
        log: log.child({ name: "octotask" }),
      }),
      log: log.child({ name: "server" }),
    });

    // Error handler to avoid printing logs
    server.expressApp.use(
      (error: Error, _req: Request, res: Response, _next: NextFunction) => {
        res.status(500).send(error.message);
      },
    );
  });

  test("Server.version", () => {
    expect(Server.version).toEqual("0.0.0-development");
  });

  describe("GET /ping", () => {
    it("returns a 200 response", async () => {
      await request(server.expressApp).get("/ping").expect(200, "PONG");
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("GET /ping 200 -");
    });
  });

  describe("webhook handler by providing webhookPath (POST /)", () => {
    it("should return 200 and run event handlers in app function", async () => {
      expect.assertions(3);

      server = new Server({
        webhookPath: "/",
        Octotask: Octotask.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(streamLogsToOutput),
        port: await getPort(),
      });

      await server.load((app) => {
        app.on("push", (event) => {
          expect(event.name).toEqual("push");
        });
      });

      const dataString = JSON.stringify(pushEvent);

      await request(server.expressApp)
        .post("/")
        .send(dataString)
        .set("content-type", "application/json")
        .set("x-github-event", "push")
        .set("x-hub-signature-256", await sign("secret", dataString))
        .set("x-github-delivery", "3sw4d5f6g7h8");

      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("POST / 200 -");
    });

    test("respond with a friendly error when x-hub-signature-256 is missing", async () => {
      await server.load(() => {});

      await request(server.expressApp)
        .post("/api/github/webhooks")
        .send(JSON.stringify(pushEvent))
        .set("content-type", "application/json")
        .set("x-github-event", "push")
        .set("content-type", "application/json")
        // Note: 'x-hub-signature-256' is missing
        .set("x-github-delivery", "3sw4d5f6g7h8")
        .expect(
          400,
          '{"error":"Required headers missing: x-hub-signature-256"}',
        );
    });
  });

  describe("webhook handler (POST /api/github/webhooks)", () => {
    it("should return 200 and run event handlers in app function", async () => {
      expect.assertions(3);

      server = new Server({
        Octotask: Octotask.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(streamLogsToOutput),
        port: await getPort(),
      });

      await server.load((app) => {
        app.on("push", (event) => {
          expect(event.name).toEqual("push");
        });
      });

      const dataString = JSON.stringify(pushEvent);

      await request(server.expressApp)
        .post("/api/github/webhooks")
        .send(dataString)
        .set("content-type", "application/json")
        .set("x-github-event", "push")
        .set("x-hub-signature-256", await sign("secret", dataString))
        .set("x-github-delivery", "3sw4d5f6g7h8");

      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("POST /api/github/webhooks 200 -");
    });

    test("respond with a friendly error when x-hub-signature-256 is missing", async () => {
      await server.load(() => {});

      await request(server.expressApp)
        .post("/api/github/webhooks")
        .send(JSON.stringify(pushEvent))
        .set("content-type", "application/json")
        .set("x-github-event", "push")
        .set("content-type", "application/json")
        // Note: 'x-hub-signature-256' is missing
        .set("x-github-delivery", "3sw4d5f6g7h8")
        .expect(
          400,
          '{"error":"Required headers missing: x-hub-signature-256"}',
        );
    });
  });

  describe("GET unknown URL", () => {
    it("responds with 404", async () => {
      await request(server.expressApp).get("/notfound").expect(404);
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("GET /notfound 404 -");
    });
  });

  describe(".start() / .stop()", () => {
    it("should expect the correct error if port already in use", () =>
      new Promise<void>((next) => {
        expect.assertions(1);

        // block port 3001
        const http = require("http");
        const blockade = http.createServer().listen(3001, async () => {
          const server = new Server({
            Octotask: Octotask.defaults({ appId, privateKey }),
            log: pino(streamLogsToOutput),
            port: 3001,
          });

          try {
            await server.start();
          } catch (error) {
            expect((error as Error).message).toEqual(
              "Port 3001 is already in use. You can define the PORT environment variable to use a different port.",
            );
          }

          await server.stop();
          blockade.close(() => next());
        });
      }));

    it("should listen to port when not in use", async () => {
      const testApp = new Server({
        Octotask: Octotask.defaults({ appId, privateKey }),
        port: 3001,
        log: pino(streamLogsToOutput),
      });
      await testApp.start();

      expect(output.length).toEqual(2);
      expect(output[1].msg).toEqual("Listening on http://localhost:3001");

      await testApp.stop();
    });

    it("respects host/ip config when starting up HTTP server", async () => {
      const testApp = new Server({
        Octotask: Octotask.defaults({ appId, privateKey }),
        port: 3002,
        host: "127.0.0.1",
        log: pino(streamLogsToOutput),
      });
      await testApp.start();

      expect(output.length).toEqual(2);
      expect(output[1].msg).toEqual("Listening on http://127.0.0.1:3002");

      await testApp.stop();
    });
  });

  describe("router", () => {
    it("prefixes paths with route name", () => {
      const router = server.router("/my-app");
      router.get("/foo", (_req, res) => res.end("foo"));

      return request(server.expressApp).get("/my-app/foo").expect(200, "foo");
    });

    it("allows routes with no path", () => {
      const router = server.router();
      router.get("/foo", (_req, res) => res.end("foo"));

      return request(server.expressApp).get("/foo").expect(200, "foo");
    });

    it("allows you to overwrite the root path when webhookPath is not defined", () => {
      const log = pino(streamLogsToOutput);
      server = new Server({
        Octotask: Octotask.defaults({
          appId,
          privateKey,
          secret: "secret",
          log: log.child({ name: "octotask" }),
        }),
        log: log.child({ name: "server" }),
      });

      // Error handler to avoid printing logs
      server.expressApp.use(
        (error: Error, _req: Request, res: Response, _next: NextFunction) => {
          res.status(500).send(error.message);
        },
      );
      const router = server.router();
      router.get("/", (_req, res) => res.end("foo"));

      return request(server.expressApp).get("/").expect(200, "foo");
    });

    it("isolates apps from affecting each other", async () => {
      ["foo", "bar"].forEach((name) => {
        const router = server.router("/" + name);

        router.use((_req, res, next) => {
          res.append("X-Test", name);
          next();
        });

        router.get("/hello", (_req, res) => res.end(name));
      });

      await request(server.expressApp)
        .get("/foo/hello")
        .expect(200, "foo")
        .expect("X-Test", "foo");

      await request(server.expressApp)
        .get("/bar/hello")
        .expect(200, "bar")
        .expect("X-Test", "bar");
    });

    it("responds with 500 on error", async () => {
      server.expressApp.get("/boom", () => {
        throw new Error("boom");
      });

      await request(server.expressApp).get("/boom").expect(500);
    });
  });
});
