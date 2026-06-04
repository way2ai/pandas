const fs = require("fs");
const path = require("path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(relativePath, base = webRoot) {
  return fs.existsSync(path.resolve(base, relativePath));
}

const pkg = require(path.resolve(webRoot, "package.json"));
assert(pkg.dependencies && pkg.dependencies.next, "missing next dependency");

[
  "next-env.d.ts",
  "tsconfig.json",
  "next.config.ts",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/app/login/page.test.tsx",
  "src/app/admin/page.tsx",
  "src/app/admin/users/page.tsx",
  "src/app/admin/tenants/page.tsx",
  "src/app/app/page.tsx",
  "src/app/tenant/page.tsx",
  "src/app/tenant/members/page.tsx",
  "src/middleware.ts",
  "src/lib/session.ts",
  "src/lib/api.ts",
  "vitest.config.ts",
  "vitest.setup.ts",
  "Dockerfile",
].forEach((relativePath) => {
  assert(exists(relativePath), `missing ${relativePath}`);
});

[
  ".env",
  ".env.example",
  "docker-compose.yml",
  "api/Dockerfile",
  "api/go.mod",
  "api/cmd/server/main.go",
  "api/internal/config/config.go",
].forEach((relativePath) => {
  assert(exists(relativePath, repoRoot), `missing ${relativePath}`);
});

const composeFile = read(path.resolve(repoRoot, "docker-compose.yml"));
["web:", "api:", "postgres:", "redis:", "temporal:", "elasticsearch:", "minio:"].forEach((service) => {
  assert(composeFile.includes(service), `compose missing service ${service}`);
});
assert(composeFile.includes("env_file: [.env]"), "compose should use .env as runtime env source");

const webDocker = read(path.resolve(webRoot, "Dockerfile"));
assert(/CMD\s+\["npm",\s*"run",\s*"dev"\]/.test(webDocker), "web Dockerfile missing dev command");

const apiDocker = read(path.resolve(repoRoot, "api", "Dockerfile"));
assert(/CMD\s+\["\/usr\/local\/bin\/api"\]/.test(apiDocker), "api Dockerfile missing compiled binary command");

console.log("ok");
