<p align="center">
  <a href="https://octotask.github.io"><img src="/static/robot.svg" width="160" alt="Octotask's logo, a cartoon robot" /></a>
</p>
<h3 align="center"><a href="https://octotask.github.io">Octotask</a></h3>
<p align="center">A framework for building GitHub Apps to automate and improve your workflow<p>
<p align="center"><a href="https://npmjs.com/package/octotask"><img src="https://badgen.net/npm/v/octotask" alt="npm"></a> <a href="https://github.com/octotask/octotask/actions?query=workflow%3ACI"><img src="https://github.com/octotask/octotask/workflows/CI/badge.svg" alt="Build Status"></a> <a href="https://codecov.io/gh/octotask/octotask/"><img src="https://badgen.now.sh/codecov/c/github/octotask/octotask" alt="Codecov"></a> <a href="https://twitter.com/OctotaskTheRobot"><img src="https://img.shields.io/twitter/follow/OctotaskTheRobot.svg?style=social&logo=twitter&label=Follow" alt="@OctotaskTheRobot on Twitter"></a>

---

If you've ever thought, "wouldn't it be cool if GitHub could…"; I'm going to stop you right there. Most features can actually be added via [GitHub Apps](https://docs.github.com/en/developers/apps), which extend GitHub and can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Apps are first class actors within GitHub.

## How it works

**Octotask is a framework for building [GitHub Apps](https://docs.github.com/en/developers/apps) in [Node.js](https://nodejs.org/)**, written in [TypeScript](https://www.typescriptlang.org/). GitHub Apps can listen to webhook events sent by a repository or organization. Octotask uses its internal event emitter to perform actions based on those events. A simple Octotask App might look like this:

```js
export default (app) => {
  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    return context.octokit.issues.createComment(issueComment);
  });

  app.onAny(async (context) => {
    context.log.info({ event: context.name, action: context.payload.action });
  });

  app.onError(async (error) => {
    app.log.error(error);
  });
};
```

## Building a Octotask App

If you've landed in this GitHub repository and are looking to start building your own Octotask App, look no further than [octotask.github.io](https://octotask.github.io/docs/)! The Octotask website contains our extensive getting started documentation and will guide you through the set up process.

This repository hosts the code for the npm Octotask package which is what all Octotask Apps run on. Most folks who land in this repository are likely looking to get started [building their own app](https://octotask.github.io/docs/).

## Contributing

Octotask is built by people just like you! Most of the interesting things are built _with_ Octotask, so consider starting by [writing a new app](https://octotask.github.io/docs/) or improving one of the [existing ones](https://github.com/search?q=topic%3Aoctotask-app&type=Repositories).

If you're interested in contributing to Octotask itself, check out our [contributing docs](CONTRIBUTING.md) to get started.

Want to discuss with Octotask users and contributors? [Discuss on GitHub](https://github.com/octotask/octotask/discussions)!

## Ideas

Have an idea for a cool new GitHub App (built with Octotask)? That's great! If you want feedback, help, or just to share it with the world you can do so by [creating an issue in the `octotask/ideas` repository](https://github.com/octotask/ideas/issues/new)!
