import { describe, expect, test } from "vitest";

import { octotaskView } from "../../src/views/octotask.js";

describe("octotaskView", () => {
  test("not providing parameters", () => {
    expect(octotaskView({})).toMatchSnapshot();
  });

  test("providing name", () => {
    expect(
      octotaskView({
        name: "My App",
      }),
    ).toMatchSnapshot();
  });

  test("providing description", () => {
    expect(
      octotaskView({
        description: "My App with Octotask",
      }),
    ).toMatchSnapshot();
  });

  test("providing description", () => {
    expect(
      octotaskView({
        version: "1.0.0",
      }),
    ).toMatchSnapshot();
  });
});
