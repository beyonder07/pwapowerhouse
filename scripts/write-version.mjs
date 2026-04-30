import { execSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(
  readFileSync(join(rootDir, "package.json"), "utf8")
)

function gitCommitSha() {
  try {
    return execSync("git rev-parse --short=12 HEAD", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim()
  } catch {
    return null
  }
}

const commit =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  gitCommitSha() ??
  "local"

const payload = {
  version: `${packageJson.version}-${commit}`,
  commit,
  builtAt: new Date().toISOString(),
}

const publicDir = join(rootDir, "public")
mkdirSync(publicDir, { recursive: true })
writeFileSync(
  join(publicDir, "version.json"),
  `${JSON.stringify(payload, null, 2)}\n`
)

console.log(`Wrote public/version.json ${payload.version}`)
