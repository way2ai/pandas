const http = require("node:http");
const { spawn } = require("node:child_process");

const HOST = "127.0.0.1";
const PORT = 3100;
const START_TIMEOUT_MS = 120000;
const POLL_INTERVAL_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, child, serverLogs) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited early.\n${serverLogs.join("")}`);
    }
    if (await httpReady(url)) {
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${url}.\n${serverLogs.join("")}`);
}

function runChild(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    await runChild("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

async function main() {
  const serverLogs = [];
  const nextBin = require.resolve("next/dist/bin/next");
  const playwrightCli = require.resolve("@playwright/test/cli");

  const server = spawn(
    process.execPath,
    [nextBin, "dev", "--hostname", HOST, "--port", String(PORT)],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  server.stdout.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
  });
  server.stderr.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
  });

  try {
    await waitForServer(`http://${HOST}:${PORT}/login`, server, serverLogs);

    const result = await runChild(
      process.execPath,
      [playwrightCli, "test", "tests/login.spec.ts", "--config", "playwright.smoke.config.ts"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        windowsHide: true,
      },
    );

    if (result.code !== 0) {
      throw new Error(`Playwright exited with code ${result.code}`);
    }
  } finally {
    await stopServer(server);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
