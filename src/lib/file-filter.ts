import type { SourceFile } from "@/lib/types";

const SKIP_SEGMENTS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
  "target",
  ".turbo",
  ".cache",
]);

const EXACT_SECURITY_FILES = new Set([
  "package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "requirements.txt",
  "requirements-dev.txt",
  "requirements-prod.txt",
  "poetry.lock",
  "pipfile",
  "pipfile.lock",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "gemfile",
  "go.mod",
  "cargo.toml",
  "cargo.lock",
  ".env.example",
  ".env.sample",
  ".env.template",
  "dockerfile",
  "docker-compose.yml",
  "next.config.ts",
  "next.config.js",
  "vite.config.ts",
  "vite.config.js",
  "middleware.ts",
  "middleware.js",
  "route.ts",
  "route.js",
  "routes.ts",
  "routes.js",
  "settings.py",
]);

const SECURITY_HINTS = [
  "auth",
  "login",
  "password",
  "session",
  "token",
  "jwt",
  "oauth",
  "route",
  "routes",
  "controller",
  "middleware",
  "config",
  "secret",
  "security",
  "upload",
  "proxy",
  "admin",
  "db",
  "database",
  "permission",
  "policy",
  "rbac",
  "acl",
  "guard",
  "csrf",
  "cors",
  "sanitize",
  "validation",
  "validator",
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".xml",
  ".py",
  ".rb",
  ".php",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".sql",
  ".env",
  ".example",
  ".md",
]);

const MAX_FILE_CONTENT_LENGTH = 25000;

export function isLikelyText(content: string) {
  if (!content.trim()) return false;
  if (content.includes("\u0000")) return false;

  const sample = content.slice(0, 4096);
  let suspicious = 0;

  for (let index = 0; index < sample.length; index += 1) {
    const code = sample.charCodeAt(index);
    const isAllowedControl = code === 9 || code === 10 || code === 13;
    if (code < 32 && !isAllowedControl) suspicious += 1;
  }

  return suspicious / Math.max(1, sample.length) < 0.02;
}

export function isSecurityRelevantPath(path: string) {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  const parts = normalized.split("/");

  if (parts.some((part) => SKIP_SEGMENTS.has(part))) return false;
  if (normalized.length > 220) return false;

  const fileName = parts.at(-1) ?? "";
  if (EXACT_SECURITY_FILES.has(fileName)) return true;

  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf("."))
    : "";
  if (!TEXT_EXTENSIONS.has(extension)) return false;

  return SECURITY_HINTS.some((hint) => normalized.includes(hint));
}

export function filterSourceFiles(files: SourceFile[], maxFiles = 80) {
  const seen = new Set<string>();
  return files
    .filter((file) => {
      if (!isLikelyText(file.content)) return false;
      if (!isSecurityRelevantPath(file.path)) return false;
      if (seen.has(file.path)) return false;
      seen.add(file.path);
      return true;
    })
    .map((file) => ({
      path: file.path,
      content:
        file.content.length > MAX_FILE_CONTENT_LENGTH
          ? `${file.content.slice(
              0,
              MAX_FILE_CONTENT_LENGTH,
            )}\n/* truncated for audit payload */`
          : file.content,
    }))
    .slice(0, maxFiles);
}
