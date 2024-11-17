export function octotaskView({
  name,
  description,
  version,
}: {
  name?: string;
  description?: string;
  version?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" class="height-full" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${name || "Your App"} | built with Octotask</title>
    <link rel="icon" href="/octotask/static/octotask-head.png">
    <link rel="stylesheet" href="/octotask/static/primer.css">
  </head>
  <body class="height-full bg-gray-light">
    <div class="d-flex flex-column flex-justify-center flex-items-center text-center height-full">
      <img src="/octotask/static/robot.svg" alt="Octotask Logo" width="100" class="mb-6">
      <div class="box-shadow rounded-2 border p-6 bg-white">
        <h1>
          Welcome to ${name || "your Octotask App"}
${
  version
    ? `            <span class="Label Label--outline v-align-middle ml-2 text-gray-light">v${version}</span>\n`
    : ""
}        </h1>

          <p>${
            description
              ? description
              : 'This bot was built using <a href="https://github.com/octotask/octotask">Octotask</a>, a framework for building GitHub Apps.'
          }</p>
      </div>

      <div class="mt-4">
        <h4 class="alt-h4 text-gray-light">Need help?</h4>
        <div class="d-flex flex-justify-center mt-2">
          <a href="https://octotask.github.io/docs/" class="btn btn-outline mr-2">Documentation</a>
          <a href="https://github.com/octotask/octotask/discussions" class="btn btn-outline">Discuss on GitHub</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
