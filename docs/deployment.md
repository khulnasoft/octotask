---
next: http
title: Deployment
---

# Deployment

Every app can either be deployed stand-alone, or combined with other apps in one deployment.

> **Heads up!** Note that most [apps in the @octotask organization](https://github.com/search?q=topic%3Aoctotask-app+org%3Aoctotask&type=Repositories) have an official hosted app that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

**Contents:**

<!-- toc -->

- [Register the GitHub App](#register-the-github-app)
- [Deploy the app](#deploy-the-app)
  - [As node app](#as-node-app)
    - [Glitch](#glitch)
    - [Heroku](#heroku)
  - [As serverless function](#as-serverless-function)
    - [AWS Lambda](#aws-lambda)
    - [Azure Functions](#azure-functions)
    - [Google Cloud Functions](#google-cloud-functions)
    - [GitHub Actions](#github-actions)
    - [Begin](#begin)
    - [Vercel](#vercel)
    - [Netlify Functions](#netlify-functions)
- [Share the app](#share-the-app)
- [Combining apps](#combining-apps)
- [Error tracking](#error-tracking)

<!-- tocstop -->

## Register the GitHub App

Every deployment will need a [GitHub App registration](https://docs.github.com/apps).

1. [Register a new GitHub App](https://github.com/settings/apps/new) with:

   - **Homepage URL**: the URL to the GitHub repository for your app
   - **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed app.
   - **Webhook Secret**: Generate a unique secret with (e.g. with `openssl rand -base64 32`) and save it because you'll need it in a minute to configure your Octotask app.

1. Download the private key from the app.

1. Make sure that you click the green **Install** button on the top left of the app page. This gives you an option of installing the app on all or a subset of your repositories.

## Deploy the app

To deploy an app to any cloud provider, you will need 3 environment variables:

- `APP_ID`: the ID of the app, which you can get from the [app settings page](https://github.com/settings/apps).
- `WEBHOOK_SECRET`: the **Webhook Secret** that you generated when you created the app.

And one of:

- `PRIVATE_KEY`: the contents of the private key you downloaded after creating the app, OR...
- `PRIVATE_KEY_PATH`: the path to a private key file.

`PRIVATE_KEY` takes precedence over `PRIVATE_KEY_PATH`.

### As node app

Octotask can run your app function using the `octotask` binary. If your app function lives in `./app.js`, you can start it as node process using `octotask run ./app.js`

#### Glitch

Glitch lets you host node applications for free and edit them directly in your browser. It’s great for experimentation and entirely sufficient for simple apps.

1. [Create a new app on Glitch](https://glitch.com/edit/#!/new-project).
2. Click on your app name on the top-right, press on advanced options and then on `Import from GitHub` (You will need to login with your GitHub account to enable that option). Enter the full repository name you want to import, e.g. for the [welcome app](https://github.com/behaviorbot/new-issue-welcome) it would be `behaviorbot/new-issue-welcome`. The `new-issue-welcome` app is a great template to get started with your own app, too!
3. Next open the `.env` file and replace its content with
   ```
   APP_ID=<your app id>
   WEBHOOK_SECRET=<your app secret>
   PRIVATE_KEY_PATH=.data/private-key.pem
   NODE_ENV=production
   ```
   Replace the two `<...>` placeholders with the values from your app. The `.env` file cannot be accessed or seen by others.
4. Press the `New File` button and enter `.data/private-key.pem`. Paste the content of your GitHub App’s `private-key.pem` in there and save it. Files in the `.data` folder cannot be seen or accessed by others, so your private key is safe.
5. That’s it, your app should have already started :thumbsup: Press on the `Show` button on top and paste the URL as the value of `Webhook URL`. Ensure that you remove `/octotask` from the end of the `Webhook URL` that was just pasted.

Enjoy!

#### Heroku

Octotask runs like [any other Node app](https://devcenter.heroku.com/articles/deploying-nodejs) on Heroku. After [creating the GitHub App](#register-the-github-app):

1.  Make sure you have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) client installed.

1.  Clone the app that you want to deploy. e.g. `git clone https://github.com/octotask/stale`

1.  Create the Heroku app with the `heroku create` command:

        $ heroku create
        Creating arcane-lowlands-8408... done, stack is cedar
        http://arcane-lowlands-8408.herokuapp.com/ | git@heroku.com:arcane-lowlands-8408.git
        Git remote heroku added

1.  Go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your deployment, e.g. `http://arcane-lowlands-8408.herokuapp.com/`.

1.  Configure the Heroku app, replacing the `APP_ID` and `WEBHOOK_SECRET` with the values for those variables, and setting the path for the `PRIVATE_KEY`:

        $ heroku config:set APP_ID=aaa \
            WEBHOOK_SECRET=bbb \
            PRIVATE_KEY="$(cat ~/Downloads/*.private-key.pem)"

1.  Deploy the app to heroku with `git push`:

        $ git push heroku main
        ...
        -----> Node.js app detected
        ...
        -----> Launching... done
              http://arcane-lowlands-8408.herokuapp.com deployed to Heroku

1.  Your app should be up and running! To verify that your app
    is receiving webhook data, you can tail your app's logs:

         $ heroku config:set LOG_LEVEL=trace
         $ heroku logs --tail

### As serverless function

When deploying your Octotask app to a serverless/function environment, you don't need to worry about handling the http webhook requests coming from GitHub, the platform takes care of that. In many cases you can use [`createNodeMiddleware`](/docs/development/#use-createNodeMiddleware) directly, e.g. for Vercel or Google Cloud Function.

```js
import { Octotask, createOctotask } from "octotask";
import { createMyMiddleware } from "my-octotask-middleware";
import myApp from "./my-app.js";

export default createMyMiddleware(myApp, { octotask: createOctotask() });
```

For other environments such as AWS Lambda, Netlify Functions or GitHub Actions, you can use one of [Octotask's adapters](https://github.com/octotask/?q=adapter).

#### AWS Lambda

```js
// handler.js
import {
  createLambdaFunction,
  createOctotask,
} from "@octotask/adapter-aws-lambda-serverless";
import appFn from "./app.js";

export const webhooks = createLambdaFunction(appFn, {
  octotask: createOctotask(),
});
```

Learn more

- Octotask's official adapter for AWS Lambda using the Serverless framework: [@octotask/adapter-aws-lambda-serverless](https://github.com/octotask/adapter-aws-lambda-serverless#readme)

Examples

- Octotask's "Hello, world!" example deployed to AWS Lambda: [octotask/example-aws-lambda-serverless](https://github.com/octotask/example-aws-lambda-serverless/#readme)
- Issue labeler bot deployed to AWS Lambda: [riyadhalnur/issuelabeler](https://github.com/riyadhalnur/issuelabeler#issuelabeler)
- Auto-Me-Bot is deployed to AWS Lambda without using the _serverless_ framework and adapter: [TomerFi/auto-me-bot](https://github.com/TomerFi/auto-me-bot)

Please add yours!

#### Azure Functions

```js
// OctotaskFunction/index.js
import {
  createOctotask,
  createAzureFunction,
} from "@octotask/adapter-azure-functions";
import app from "../app.js";

export default createAzureFunction(app, { octotask: createOctotask() });
```

Learn more

- Octotask's official adapter for Azure functions: [@octotask/adapter-azure-functions](https://github.com/octotask/adapter-azure-functions#readme)

Examples

- Octotask's "Hello, world!" example deployed to Azure functions: [octotask/example-azure-function](https://github.com/octotask/example-azure-function/#readme)

Please add yours!

#### Google Cloud Functions

```js
// function.js
import { createNodeMiddleware, createOctotask } from "octotask";
import app from "./app.js";

exports.octotaskApp = createNodeMiddleware(app, { octotask: createOctotask() });
```

Examples

- Octotask's "Hello, world!" example deployed to Google Cloud Functions: [octotask/example-google-cloud-function](https://github.com/octotask/example-google-cloud-function#readme)

Please add yours!

#### GitHub Actions

```js
import { run } from "@octotask/adapter-github-actions";
import app from "./app.js";

run(app);
```

Learn more

- Octotask's official adapter for GitHub Actions: [@octotask/adapter-github-actions](https://github.com/octotask/adapter-github-actions#readme)

Examples

- Octotask's "Hello, world!" example deployed as a GitHub Action: [octotask/example-github-action](https://github.com/octotask/example-github-action/#readme)

Please add yours!

#### Begin

[Begin](https://begin.com/) is a service to deploy serverless applications build using the [Architect](https://arc.codes/) to AWS.

1. Add the `@http` pragma to your `app.arc` file

   ```
   @app
   my-app-name

   @http
   post /api/github/webhooks
   ```

2. Make sure to [configure your app](../confinguration) using environment variables

3. Create the `src/http/post-api-github-webhooks` folder with the following files

   ```js
   {
     "name": "http-post-api-github-webhooks",
     "dependencies": {}
   }
   ```

   in the new directory, install the `octotask` and `@architect/functions`

   ```
   cd src/http/post-api-github-webhooks
   npm install octotask @architect/functions
   ```

4. Create `src/http/post-api-github-webhooks/app.js` with your Octotask application function, e.g.

   ```
   /**
    * @param {import('octotask').Octotask} app
    */
   export default (app) => {
     app.log("Yay! The app was loaded!");

     app.on("issues.opened", async (context) => {
       return context.octokit.issues.createComment(
         context.issue({ body: "Hello, World!" })
       );
     });
   };
   ```

5. Create `src/http/post-api-github-webhooks/index.js` with the request handler. See [/octotask/example-begin/src/http/post-api-github-webhooks/index.js](https://github.com/octotask/example-begin/blob/main/src/http/post-api-github-webhooks/index.js) for an example.

Examples

- [octotask/example-begin](https://github.com/octotask/example-begin#readme)

Please add yours!

#### Vercel

```js
// api/github/webhooks/index.js
import { createNodeMiddleware, createOctotask } from "octotask";

import app from "../../../app.js";

export default createNodeMiddleware(app, {
  octotask: createOctotask(),
  webhooksPath: "/api/github/webhooks",
});
```

**Important:** Set `NODEJS_HELPERS` environment variable to `0` in order to prevent Vercel from parsing the response body.
See [Disable Helpers](https://vercel.com/docs/functions/runtimes/node-js#disabling-helpers-for-node.js) for detail.

Examples

- [octotask/example-vercel](https://github.com/octotask/example-vercel#readme)
- [wip/app](https://github.com/wip/app#readme)
- [all-contributors/app](https://github.com/all-contributors/app#readme)
- [octotask-nextjs-starter](https://github.com/maximousblk/octotask-nextjs-starter#readme)

Please add yours!

#### Netlify Functions

[Netlify Functions](https://www.netlify.com/products/functions/) are deployed on AWS by Netlify itself. So we can use `@octotask/adapter-aws-lambda-serverless` adapter for Netlify Functions as well.

```js
// functions/index.js
import {
  createLambdaFunction,
  createOctotask,
} from "@octotask/adapter-aws-lambda-serverless";
import appFn from "../src/app";

export const handler = createLambdaFunction(appFn, {
  octotask: createOctotask(),
});
```

## Share the app

The Octotask website includes a list of [featured apps](https://octotask.github.io/apps). Consider [adding your app to the website](https://github.com/octotask/octotask.github.io/blob/master/CONTRIBUTING.md#adding-your-app) so others can discover and use it.

## Combining apps

To deploy multiple apps in one instance, create a new app that has the existing apps listed as dependencies in `package.json`:

```json
{
  "name": "my-octotask-app",
  "private": true,
  "dependencies": {
    "octotask-autoresponder": "octotask/autoresponder",
    "octotask-settings": "octotask/settings"
  },
  "scripts": {
    "start": "octotask run"
  },
  "octotask": {
    "apps": ["octotask-autoresponder", "octotask-settings"]
  }
}
```

Note that this feature is only supported when [run as Node app](#as-node-app). For serverless/function deployments, create a new Octotask app that combines others programmatically

```js
// app.js
import autoresponder from "octotask-autoresponder";
import settings from "octotask-settings";

export default async (app, options) => {
  await autoresponder(app, options);
  await settings(app, options);
};
```

## Error tracking

Octotask logs messages using [pino](https://getpino.io/). There is a growing number of tools that consume these logs and send them to error tracking services: https://getpino.io/#/docs/transports.

By default, Octotask can send errors to [Sentry](https://sentry.io/) using its own transport [`@octotask/pino`](https://github.com/octotask/pino/#readme). Set the `SENTRY_DSN` environment variable to enable it.