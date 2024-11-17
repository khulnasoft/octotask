import Stream from "node:stream";

import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { Octotask, Server } from "../../src/index.js";
import { defaultApp } from "../../src/apps/default.js";

describe("default app", () => {
  let output = [];

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  async function instantiateServer(cwd = process.cwd()) {
    output = [];
    const server = new Server({
      Octotask: Octotask.defaults({
        appId: 1,
        privateKey: "private key",
      }),
      log: pino(streamLogsToOutput),
      cwd,
    });

    await server.load(defaultApp);
    return server;
  }

  describe("GET /octotask", () => {
    it("returns a 200 response", async () => {
      const server = await instantiateServer();
      return request(server.expressApp).get("/octotask").expect(200);
    });

    describe("get info from package.json", () => {
      it("returns the correct HTML with values", async () => {
        const server = await instantiateServer();
        const actual = await request(server.expressApp)
          .get("/octotask")
          .expect(200);
        expect(actual.text).toMatch("Welcome to octotask");
        expect(actual.text).toMatch("A framework for building GitHub Apps");
        expect(actual.text).toMatch(/v\d+\.\d+\.\d+/);
        expect(actual.text).toMatchSnapshot();
      });

      it("returns the correct HTML without values", async () => {
        const server = await instantiateServer(__dirname);
        const actual = await request(server.expressApp)
          .get("/octotask")
          .expect(200);
        expect(actual.text).toMatch("Welcome to your Octotask App");
        expect(actual.text).toMatchSnapshot();
      });
    });
  });

  // Redirect does not work because webhooks middleware is using root path
  describe("GET /", () => {
    it("redirects to /octotask", async () => {
      const server = await instantiateServer(__dirname);
      await request(server.expressApp)
        .get("/")
        .expect(302)
        .expect("location", "/octotask");
    });
  });
});
