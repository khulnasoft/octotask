import { createOctotask, Octotask } from "../src/index.js";
import { captureLogOutput } from "./helpers/capture-log-output.js";
import { describe, expect, test } from "vitest";

const env = {
  APP_ID: "1056116",
  PRIVATE_KEY: `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`,
  WEBHOOK_SECRET: "secret",
};
describe("createOctotask", () => {
  test("createOctotask()", () => {
    const octotask = createOctotask({ env });
    expect(octotask).toBeInstanceOf(Octotask);
  });

  test("defaults, env", () => {
    const octotask = createOctotask({
      env: {
        ...env,
        LOG_LEVEL: "debug",
      },
      defaults: { logLevel: "trace" },
    });
    expect(octotask.log.level).toEqual("debug");
  });

  test("defaults, overrides", () => {
    const octotask = createOctotask({
      env,
      defaults: { logLevel: "debug" },
      overrides: { logLevel: "trace" },
    });
    expect(octotask.log.level).toEqual("trace");
  });

  test("defaults, custom host", () => {
    const octotask = createOctotask({
      env: {
        ...env,
        GHE_HOST: "github.acme-inc.com",
        GHE_PROTOCOL: "https",
      },
    });
    // @ts-expect-error This is private
    expect(octotask.state.octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
      "https://github.acme-inc.com/api/v3",
    );
  });

  test("env, overrides", () => {
    const octotask = createOctotask({
      env: {
        ...env,
        LOG_LEVEL: "fatal",
      },
      overrides: { logLevel: "trace" },
    });
    expect(octotask.log.level).toEqual("trace");
  });

  test("defaults, env, overrides", () => {
    const octotask = createOctotask({
      env: {
        ...env,
        LOG_LEVEL: "fatal",
      },
      defaults: { logLevel: "debug" },
      overrides: { logLevel: "trace" },
    });
    expect(octotask.log.level).toEqual("trace");
  });

  test("env, logger message key", async () => {
    const octotask = createOctotask({
      env: {
        ...env,
        LOG_LEVEL: "info",
        LOG_FORMAT: "json",
        LOG_MESSAGE_KEY: "myMessage",
      },
      defaults: { logLevel: "trace" },
    });
    const outputData = await captureLogOutput(() => {
      octotask.log.info("Ciao");
    }, octotask.log);
    expect(JSON.parse(outputData).myMessage).toEqual("Ciao");
  });

  test("env, octokit logger set", async () => {
    const octotask = createOctotask({
      env: {
        ...env,
        LOG_LEVEL: "info",
        LOG_FORMAT: "json",
        LOG_MESSAGE_KEY: "myMessage",
      },
    });
    const outputData = await captureLogOutput(async () => {
      const octokit = await octotask.auth();
      octokit.log.info("Ciao");
    }, octotask.log);
    expect(JSON.parse(outputData)).toMatchObject({
      myMessage: "Ciao",
      name: "octokit",
    });
  });
});
