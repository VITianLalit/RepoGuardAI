/**
 * local-analyzer.ts
 *
 * A fully self-contained static analysis engine that mirrors the output
 * of the n8n RepoGuard AI workflow. It runs entirely on the server with
 * zero external HTTP calls and produces an identical AuditReport JSON.
 *
 * Detection coverage:
 *   • Hardcoded secrets / credentials (API keys, passwords, tokens, JWTs)
 *   • OWASP Top-10 patterns (SQLi, XSS, SSRF, Command Injection, etc.)
 *   • Dependency CVEs from package.json / requirements.txt
 *   • Insecure crypto, missing auth, unsafe deserialization, path traversal
 *   • Outdated / insecure configuration patterns
 */

import type {
  AuditPayload,
  AuditReport,
  Finding,
  FixRecommendation,
  Severity,
  SourceFile,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

interface Rule {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  owaspId?: string;
  owaspCategory?: string;
  description: string;
  recommendation: string;
  /** Test a single line; return the matched snippet or null */
  matchLine?: (line: string, lineNo: number, filePath: string) => string | null;
  /** Test the entire file content; return a snippet or null */
  matchFile?: (content: string, filePath: string) => string | null;
}

function regexLineRule(
  pattern: RegExp,
  options: Omit<Rule, "id" | "matchLine" | "matchFile"> & { id: string },
): Rule {
  return {
    ...options,
    matchLine: (line) => {
      const m = pattern.exec(line);
      return m ? m[0].slice(0, 120) : null;
    },
  };
}

function regexFileRule(
  pattern: RegExp,
  options: Omit<Rule, "id" | "matchLine" | "matchFile"> & { id: string },
): Rule {
  return {
    ...options,
    matchFile: (content) => {
      const m = pattern.exec(content);
      return m ? m[0].slice(0, 120) : null;
    },
  };
}

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

const SECRET_RULES: Rule[] = [
  regexLineRule(
    /(?:secret|password|passwd|pwd)\s*[:=]\s*['"`](?!.*\$\{)[^'"`\s]{6,}/i,
    {
      id: "SEC-001",
      title: "Hardcoded Password / Secret",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "A plaintext password or secret value is hardcoded directly in source code. Anyone with repository access — or who obtains a copy of the code — can read and misuse it.",
      recommendation:
        "Move all secrets into environment variables or a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler). Never commit secrets to version control.",
    },
  ),
  regexLineRule(
    /(?:api[_-]?key|apikey)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{16,}/i,
    {
      id: "SEC-002",
      title: "Hardcoded API Key",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A05",
      owaspCategory: "Security Misconfiguration",
      description:
        "An API key is embedded directly in source code. Exposed keys allow attackers to authenticate as your application, potentially incurring costs or accessing sensitive data.",
      recommendation:
        "Rotate the exposed key immediately. Store it in an environment variable and access it via process.env.YOUR_KEY_NAME.",
    },
  ),
  regexLineRule(
    /(?:sk_live|sk_test|pk_live|pk_test)_[a-zA-Z0-9]{16,}/,
    {
      id: "SEC-003",
      title: "Stripe / Payment API Key Exposed",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "A live payment gateway API key (e.g., Stripe sk_live) is hardcoded in the repository.",
      recommendation:
        "Revoke the key immediately via the payment provider dashboard. Use environment variables exclusively for payment credentials.",
    },
  ),
  regexLineRule(
    /(?:AWS_SECRET|aws_secret_access_key)\s*[:=]\s*['"`][a-zA-Z0-9/+]{20,}/i,
    {
      id: "SEC-004",
      title: "AWS Secret Access Key Exposed",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "An AWS Secret Access Key is hardcoded, granting an attacker full programmatic access to your AWS account.",
      recommendation:
        "Immediately rotate the key in the AWS IAM console and audit CloudTrail for unauthorized usage. Use IAM roles instead of long-lived credentials.",
    },
  ),
  regexLineRule(
    /(?:ghp_|github_pat_)[a-zA-Z0-9]{30,}/,
    {
      id: "SEC-005",
      title: "GitHub Personal Access Token Exposed",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "A GitHub Personal Access Token is embedded in code, allowing an attacker to access your GitHub account with the token's permissions.",
      recommendation:
        "Revoke the token at github.com/settings/tokens immediately. Use GitHub Actions secrets or a secrets manager.",
    },
  ),
  regexLineRule(
    /(?:jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*['"`][^'"`\s]{6,}/i,
    {
      id: "SEC-006",
      title: "Hardcoded JWT Secret",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "A JWT signing secret is hardcoded. An attacker who reads the code can forge arbitrary JWT tokens, bypassing authentication entirely.",
      recommendation:
        "Generate a strong random secret (≥256 bits) and store it as an environment variable. Never commit JWT secrets to source control.",
    },
  ),
  regexLineRule(
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    {
      id: "SEC-007",
      title: "Private Key Embedded in Source",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "A PEM-encoded private key (RSA/EC/SSH) is committed to the repository.",
      recommendation:
        "Remove the key from the repository history (git filter-repo), invalidate it, and generate a new key pair stored securely outside the repo.",
    },
  ),
  regexLineRule(
    /(?:database_url|db_url|mongo_uri|mysql_uri)\s*[:=]\s*['"`][^'"`\s]{10,}/i,
    {
      id: "SEC-008",
      title: "Database Connection String Exposed",
      category: "Secret Detection",
      severity: "critical",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "A database connection string including credentials is hardcoded in source code.",
      recommendation:
        "Store the connection string in an environment variable and ensure it is excluded from version control via .gitignore.",
    },
  ),
];

const OWASP_RULES: Rule[] = [
  // A03 – SQL Injection
  regexLineRule(
    /(?:query|sql)\s*(?:\+=|=\s*['"`].*\+|`[^`]*\$\{(?:req\.|params\.|query\.|body\.)[^}]+\})/i,
    {
      id: "OWA-001",
      title: "A03 – SQL Injection",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "User-supplied input is concatenated directly into a SQL query string. An attacker can manipulate the query to read, modify, or delete arbitrary data.",
      recommendation:
        "Use parameterized queries / prepared statements exclusively. Example: db.query('SELECT * FROM users WHERE id = ?', [id])",
    },
  ),
  regexLineRule(
    /['"`]\s*SELECT\s+.+\s+WHERE\s+.+\s*['"` ]\s*\+\s*(?:req\.|params\.|query\.|body\.)/i,
    {
      id: "OWA-001b",
      title: "A03 – SQL Injection (String Concatenation)",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "User-controlled data is appended to a SQL string literal, enabling SQL Injection.",
      recommendation:
        "Replace string concatenation with parameterized queries or an ORM that handles escaping automatically.",
    },
  ),

  // A03 – Command Injection
  regexLineRule(
    /(?:exec|execSync|spawn|spawnSync|child_process)\s*\(\s*['"`][^'"` ]*['"`]\s*\+/,
    {
      id: "OWA-002",
      title: "A03 – Command Injection",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "A shell command is constructed by concatenating user-controlled input. An attacker can append arbitrary OS commands.",
      recommendation:
        "Avoid shell execution with user input. Prefer child_process.execFile() or fs module functions. Strictly whitelist and validate filenames.",
    },
  ),
  regexLineRule(
    /os\.system\s*\(\s*(?:f['"]|['"]\s*%\s*|['"].*\+)/,
    {
      id: "OWA-002b",
      title: "A03 – Command Injection (Python os.system)",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "os.system() is called with a formatted or concatenated string containing user input.",
      recommendation:
        "Use subprocess.run() with a list of arguments and shell=False. Validate all inputs against an allowlist.",
    },
  ),

  // A03 – XSS
  regexLineRule(
    /\.innerHTML\s*=\s*(?!['"`]<)/,
    {
      id: "OWA-003",
      title: "A03 – Cross-Site Scripting (XSS) via innerHTML",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "Assigning to innerHTML without sanitization allows an attacker to inject executable HTML/script into the page.",
      recommendation:
        "Use textContent for plain text, or sanitize HTML with DOMPurify before assigning to innerHTML. Implement a strong Content-Security-Policy header.",
    },
  ),
  regexLineRule(
    /res\.(?:send|write|end)\s*\(\s*req\.(?:query|body|params)/,
    {
      id: "OWA-003b",
      title: "A03 – Reflected XSS via Unsanitized Response",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "User-controlled request data is sent directly in the HTTP response without encoding, leading to Reflected XSS.",
      recommendation:
        "HTML-encode all user-supplied values before including them in responses. Use a templating engine with auto-escaping.",
    },
  ),

  // A01 – Broken Access Control
  regexFileRule(
    /app\.(?:get|post|put|delete|patch)\s*\(\s*['"`]\/admin/i,
    {
      id: "OWA-004",
      title: "A01 – Missing Authentication on Admin Route",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A01",
      owaspCategory: "Broken Access Control",
      description:
        "An admin or privileged route is registered without any visible authentication or authorization middleware, allowing anyone to access it.",
      recommendation:
        "Apply authentication middleware (e.g., requireAuth, verifyJWT) and role checks (e.g., requireRole('admin')) before every privileged route handler.",
    },
  ),

  // A10 – SSRF
  regexLineRule(
    /axios\.get\s*\(\s*(?:req\.|params\.|query\.|body\.)\w*(?:url|Url|URL)/,
    {
      id: "OWA-005",
      title: "A10 – Server-Side Request Forgery (SSRF)",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A10",
      owaspCategory: "Server-Side Request Forgery",
      description:
        "The server makes an outbound HTTP request to a URL supplied directly from user input. Attackers can probe internal services or cloud metadata endpoints.",
      recommendation:
        "Validate and whitelist allowed domains. Block requests to private IP ranges (127.0.0.0/8, 10.0.0.0/8, 169.254.0.0/16). Use an allowlist proxy.",
    },
  ),
  regexLineRule(
    /(?:fetch|axios|got|request)\s*\(\s*(?:req\.|request\.)(?:query|body|params)/,
    {
      id: "OWA-005b",
      title: "A10 – Potential SSRF via User-Controlled URL",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A10",
      owaspCategory: "Server-Side Request Forgery",
      description:
        "An HTTP client is invoked with a URL derived from user-controlled request data.",
      recommendation:
        "Parse the URL, validate protocol (https only) and hostname against an allowlist before making the request.",
    },
  ),

  // A02 – Weak Crypto
  regexLineRule(
    /createHash\s*\(\s*['"`]md5['"`]\s*\)/i,
    {
      id: "OWA-006",
      title: "A02 – Weak Hashing Algorithm (MD5)",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "MD5 is cryptographically broken and unsuitable for security-sensitive hashing such as passwords or integrity checks.",
      recommendation:
        "For passwords: use bcrypt, scrypt, or Argon2. For integrity checks: use SHA-256 or SHA-3.",
    },
  ),
  regexLineRule(
    /createHash\s*\(\s*['"`]sha1['"`]\s*\)/i,
    {
      id: "OWA-006b",
      title: "A02 – Weak Hashing Algorithm (SHA-1)",
      category: "OWASP Top 10",
      severity: "medium",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "SHA-1 is deprecated for cryptographic use. Collision attacks have been demonstrated against it.",
      recommendation:
        "Upgrade to SHA-256 or SHA-3 for integrity checks. For passwords, use bcrypt/Argon2.",
    },
  ),
  regexLineRule(
    /(?:DES|3DES|RC4|RC2)\s*\.?(?:encrypt|decrypt|cipher)/i,
    {
      id: "OWA-006c",
      title: "A02 – Insecure Cipher Algorithm",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A02",
      owaspCategory: "Cryptographic Failures",
      description:
        "DES, 3DES, RC4, and RC2 are considered insecure and should not be used.",
      recommendation:
        "Use AES-256-GCM for symmetric encryption.",
    },
  ),

  // A05 – Security Misconfiguration
  regexLineRule(
    /cors\s*\(\s*\{\s*origin\s*:\s*['"`]\*['"`]/,
    {
      id: "OWA-007",
      title: "A05 – Wildcard CORS Origin",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A05",
      owaspCategory: "Security Misconfiguration",
      description:
        "Setting CORS origin to '*' allows any website to make credentialed requests to your API.",
      recommendation:
        "Specify an explicit allowlist of trusted origins: cors({ origin: ['https://yourdomain.com'] })",
    },
  ),
  regexFileRule(
    /NODE_ENV\s*(?:===?|!==?)\s*['"`]production['"`]/,
    {
      id: "OWA-007b",
      title: "A05 – Environment Checks in Source Code",
      category: "OWASP Top 10",
      severity: "low",
      owaspId: "A05",
      owaspCategory: "Security Misconfiguration",
      description:
        "Branching logic on NODE_ENV can lead to different security behaviors in development vs production.",
      recommendation:
        "Keep security controls active in all environments. Never disable auth or validation checks in development.",
    },
  ),

  // A08 – Insecure Deserialization
  regexLineRule(
    /eval\s*\(\s*(?:req\.|request\.|params\.|query\.|body\.)/,
    {
      id: "OWA-008",
      title: "A03 – Code Injection via eval()",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "eval() is called with user-controlled input, allowing arbitrary JavaScript execution on the server.",
      recommendation:
        "Never use eval() with user input. Replace with structured data parsing (JSON.parse) and validate with a schema library.",
    },
  ),
  regexLineRule(
    /unserialize\s*\(\s*(?:req\.|request\.|params\.|query\.|body\.)/i,
    {
      id: "OWA-009",
      title: "A08 – Insecure Deserialization",
      category: "OWASP Top 10",
      severity: "critical",
      owaspId: "A08",
      owaspCategory: "Software and Data Integrity Failures",
      description:
        "Deserializing untrusted data without validation can lead to remote code execution.",
      recommendation:
        "Validate serialized data against a strict schema before deserialization. Prefer JSON with explicit type checks.",
    },
  ),

  // Path Traversal
  regexLineRule(
    /(?:readFile|writeFile|readFileSync|createReadStream)\s*\(\s*(?:[^)]*\+\s*req\.|req\.(?:query|body|params))/,
    {
      id: "OWA-010",
      title: "A01 – Path Traversal",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A01",
      owaspCategory: "Broken Access Control",
      description:
        "File system operations use paths derived from user input, allowing attackers to traverse directories and access arbitrary files.",
      recommendation:
        "Use path.resolve() and verify the resolved path starts with the expected base directory. Reject paths containing '..'.",
    },
  ),

  // Open Redirect
  regexLineRule(
    /res\.redirect\s*\(\s*(?:req\.|request\.)(?:query|body|params)/,
    {
      id: "OWA-011",
      title: "A01 – Open Redirect",
      category: "OWASP Top 10",
      severity: "medium",
      owaspId: "A01",
      owaspCategory: "Broken Access Control",
      description:
        "Redirecting to a URL from user input can be abused for phishing attacks.",
      recommendation:
        "Validate redirect targets against an allowlist of trusted URLs or paths.",
    },
  ),

  // Mass Assignment
  regexLineRule(
    /(?:User|Model)\.(?:create|update|save)\s*\(\s*req\.body\s*\)/i,
    {
      id: "OWA-012",
      title: "A03 – Mass Assignment Vulnerability",
      category: "OWASP Top 10",
      severity: "high",
      owaspId: "A03",
      owaspCategory: "Injection",
      description:
        "Passing req.body directly to a model create/update can allow attackers to set privileged fields (e.g., isAdmin, role).",
      recommendation:
        "Explicitly list the allowed fields: User.create({ name: req.body.name, email: req.body.email }). Use a schema validation library.",
    },
  ),

  // Prototype Pollution
  regexLineRule(
    /Object\.assign\s*\(\s*\{\}\s*,\s*(?:req\.|request\.)(?:body|query)/,
    {
      id: "OWA-013",
      title: "A06 – Potential Prototype Pollution",
      category: "OWASP Top 10",
      severity: "medium",
      owaspId: "A06",
      owaspCategory: "Vulnerable and Outdated Components",
      description:
        "Merging user-supplied objects into {} without sanitization can pollute Object.prototype in some scenarios.",
      recommendation:
        "Validate and sanitize all user-supplied objects. Use Object.create(null) for mappings or a library like lodash.merge after upgrading to a safe version.",
    },
  ),
];

// ---------------------------------------------------------------------------
// Dependency CVE database (static, curated)
// ---------------------------------------------------------------------------

interface DepVuln {
  package: string;
  affectedBelow: string; // semver: version < this is affected
  fixedIn: string;
  severity: Severity;
  cve: string;
  vulnerability: string;
  recommendation: string;
}

const DEP_VULNS: DepVuln[] = [
  // lodash
  {
    package: "lodash",
    affectedBelow: "4.17.21",
    fixedIn: "4.17.21",
    severity: "high",
    cve: "CVE-2020-8203",
    vulnerability: "Prototype Pollution",
    recommendation: "Upgrade lodash to ≥4.17.21.",
  },
  // jsonwebtoken
  {
    package: "jsonwebtoken",
    affectedBelow: "9.0.0",
    fixedIn: "9.0.2",
    severity: "critical",
    cve: "CVE-2022-23529",
    vulnerability: "Algorithm Confusion / Signature Bypass",
    recommendation: "Upgrade jsonwebtoken to ≥9.0.2.",
  },
  // axios
  {
    package: "axios",
    affectedBelow: "1.6.0",
    fixedIn: "1.6.8",
    severity: "critical",
    cve: "CVE-2023-45133",
    vulnerability: "SSRF via follow-redirects (ReDoS)",
    recommendation: "Upgrade axios to ≥1.6.8.",
  },
  // express
  {
    package: "express",
    affectedBelow: "4.19.0",
    fixedIn: "4.19.2",
    severity: "medium",
    cve: "CVE-2024-29041",
    vulnerability: "Open Redirect via malformed URL",
    recommendation: "Upgrade express to ≥4.19.2.",
  },
  // django
  {
    package: "django",
    affectedBelow: "4.2.10",
    fixedIn: "4.2.10",
    severity: "high",
    cve: "CVE-2024-24680",
    vulnerability: "ReDoS in intcomma template filter",
    recommendation: "Upgrade Django to ≥4.2.10.",
  },
  // flask
  {
    package: "flask",
    affectedBelow: "2.3.0",
    fixedIn: "2.3.0",
    severity: "medium",
    cve: "CVE-2023-30861",
    vulnerability: "Cookie same-site attribute bypass",
    recommendation: "Upgrade Flask to ≥2.3.0.",
  },
  // log4j
  {
    package: "log4j",
    affectedBelow: "2.17.1",
    fixedIn: "2.17.1",
    severity: "critical",
    cve: "CVE-2021-44228",
    vulnerability: "Log4Shell – Remote Code Execution via JNDI",
    recommendation: "Upgrade log4j to ≥2.17.1 immediately.",
  },
  // node-fetch
  {
    package: "node-fetch",
    affectedBelow: "2.6.7",
    fixedIn: "2.6.7",
    severity: "high",
    cve: "CVE-2022-0235",
    vulnerability: "Exposure of Sensitive Information to Unauthorized Actor",
    recommendation: "Upgrade node-fetch to ≥2.6.7.",
  },
  // minimist
  {
    package: "minimist",
    affectedBelow: "1.2.6",
    fixedIn: "1.2.6",
    severity: "critical",
    cve: "CVE-2021-44906",
    vulnerability: "Prototype Pollution",
    recommendation: "Upgrade minimist to ≥1.2.6.",
  },
  // semver
  {
    package: "semver",
    affectedBelow: "7.5.2",
    fixedIn: "7.5.4",
    severity: "high",
    cve: "CVE-2022-25883",
    vulnerability: "ReDoS in semver range parsing",
    recommendation: "Upgrade semver to ≥7.5.4.",
  },
  // moment
  {
    package: "moment",
    affectedBelow: "2.29.4",
    fixedIn: "2.29.4",
    severity: "high",
    cve: "CVE-2022-31129",
    vulnerability: "ReDoS in date parsing",
    recommendation: "Upgrade moment to ≥2.29.4 or migrate to date-fns/dayjs.",
  },
  // qs
  {
    package: "qs",
    affectedBelow: "6.10.3",
    fixedIn: "6.11.0",
    severity: "high",
    cve: "CVE-2022-24999",
    vulnerability: "Prototype Pollution",
    recommendation: "Upgrade qs to ≥6.11.0.",
  },
  // tar
  {
    package: "tar",
    affectedBelow: "6.1.9",
    fixedIn: "6.1.9",
    severity: "high",
    cve: "CVE-2021-37701",
    vulnerability: "Arbitrary File Write via path traversal",
    recommendation: "Upgrade tar to ≥6.1.9.",
  },
  // sharp
  {
    package: "sharp",
    affectedBelow: "0.32.6",
    fixedIn: "0.32.6",
    severity: "high",
    cve: "CVE-2023-4863",
    vulnerability: "Heap buffer overflow in libwebp (via sharp)",
    recommendation: "Upgrade sharp to ≥0.32.6.",
  },
  // next
  {
    package: "next",
    affectedBelow: "14.1.1",
    fixedIn: "14.1.1",
    severity: "high",
    cve: "CVE-2024-34351",
    vulnerability: "SSRF via Host header in Server Actions",
    recommendation: "Upgrade next to ≥14.1.1.",
  },
  // react-pdf
  {
    package: "react-pdf",
    affectedBelow: "7.7.0",
    fixedIn: "7.7.0",
    severity: "medium",
    cve: "CVE-2024-4367",
    vulnerability: "Arbitrary JavaScript execution via font name",
    recommendation: "Upgrade react-pdf to ≥7.7.0.",
  },
];

// ---------------------------------------------------------------------------
// Semver comparison (simple numeric major.minor.patch)
// ---------------------------------------------------------------------------

function parseSemver(v: string): [number, number, number] {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function semverLessThan(a: string, b: string): boolean {
  const [aMaj, aMin, aPat] = parseSemver(a);
  const [bMaj, bMin, bPat] = parseSemver(b);
  if (aMaj !== bMaj) return aMaj < bMaj;
  if (aMin !== bMin) return aMin < bMin;
  return aPat < bPat;
}

// ---------------------------------------------------------------------------
// Dependency parser
// ---------------------------------------------------------------------------

function parseDependencies(
  files: SourceFile[],
): Map<string, string> {
  const deps = new Map<string, string>();

  for (const file of files) {
    const name = file.path.split("/").pop()?.toLowerCase() ?? "";

    if (name === "package.json") {
      try {
        const json = JSON.parse(file.content) as Record<string, unknown>;
        for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
          const block = json[section];
          if (block && typeof block === "object") {
            for (const [pkg, ver] of Object.entries(block as Record<string, string>)) {
              if (!deps.has(pkg)) deps.set(pkg, String(ver));
            }
          }
        }
      } catch { /* ignore malformed JSON */ }
    }

    if (name === "requirements.txt" || name === "requirements-dev.txt") {
      for (const line of file.content.split("\n")) {
        const m = /^([a-zA-Z0-9_\-]+)[>=<!~^]+([0-9][0-9a-zA-Z._\-]*)/.exec(line.trim());
        if (m) deps.set(m[1].toLowerCase(), m[2]);
      }
    }
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------

function computeScore(findings: Finding[]): number {
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === "critical") penalty += 18;
    else if (f.severity === "high") penalty += 10;
    else if (f.severity === "medium") penalty += 4;
    else penalty += 1;
  }
  return Math.max(0, 100 - penalty);
}

function computeRiskLevel(score: number): string {
  if (score < 20) return "Critical";
  if (score < 45) return "High";
  if (score < 70) return "Medium";
  return "Low";
}

// ---------------------------------------------------------------------------
// Fix recommendations generator
// ---------------------------------------------------------------------------

function buildFixes(findings: Finding[]): FixRecommendation[] {
  const fixMap: Record<string, FixRecommendation> = {
    "SEC-001": {
      vulnerability: "Hardcoded Password / Secret",
      priority: "critical",
      effort: "low",
      rootCause: "Secrets embedded in source code are exposed to anyone with repository access and leak through git history.",
      secureFix: "Move all secrets to environment variables. Access them via process.env.SECRET_NAME. Add .env to .gitignore.",
      codeChange: `// Before\nconst DB_PASSWORD = 'super-secret';\n\n// After\nconst DB_PASSWORD = process.env.DB_PASSWORD;\nif (!DB_PASSWORD) throw new Error('DB_PASSWORD env var is required');`,
      bestPractices: [
        "Store secrets in environment variables or a secrets manager",
        "Use .env files locally and add them to .gitignore",
        "Use GitHub Actions Secrets / Vercel Environment Variables in CI/CD",
        "Rotate any exposed secrets immediately",
        "Scan commits with git-secrets or truffleHog",
      ],
    },
    "SEC-002": {
      vulnerability: "Hardcoded API Key",
      priority: "critical",
      effort: "low",
      rootCause: "API keys embedded in code are exposed to anyone with repository access.",
      secureFix: "Move the API key to an environment variable and revoke the exposed key immediately.",
      codeChange: `// Before\nconst API_KEY = 'sk_live_123456789';\n\n// After\nconst API_KEY = process.env.API_KEY;\nif (!API_KEY) throw new Error('API_KEY is required');`,
      bestPractices: [
        "Revoke and rotate the exposed key immediately",
        "Use environment variables for all API credentials",
        "Apply least-privilege permissions to API keys",
        "Enable key usage alerts in your provider dashboard",
      ],
    },
    "OWA-001": {
      vulnerability: "SQL Injection",
      priority: "critical",
      effort: "medium",
      rootCause: "User input concatenated directly into SQL query strings.",
      secureFix: "Use parameterized queries or prepared statements.",
      codeChange: `// Before\nconst query = 'SELECT * FROM users WHERE id=' + req.query.id;\n\n// After\nconst result = await db.query(\n  'SELECT * FROM users WHERE id = ?',\n  [req.query.id]\n);`,
      bestPractices: [
        "Always use parameterized queries or an ORM",
        "Validate and type-check all input parameters",
        "Use least-privilege DB accounts",
        "Enable SQL query logging to detect anomalies",
      ],
    },
    "OWA-001b": {
      vulnerability: "SQL Injection (String Concatenation)",
      priority: "critical",
      effort: "medium",
      rootCause: "SQL query is built by concatenating user-controlled strings.",
      secureFix: "Replace all string-concatenation SQL with parameterized queries.",
      codeChange: `// Use: db.query('SELECT * FROM orders WHERE user_id = ?', [userId])`,
      bestPractices: ["Use parameterized queries exclusively", "Add input validation with a schema library"],
    },
    "OWA-002": {
      vulnerability: "Command Injection",
      priority: "critical",
      effort: "medium",
      rootCause: "Shell commands are built by concatenating user-controlled input.",
      secureFix: "Use child_process.execFile() with an argument array, or replace shell commands with Node.js fs module calls.",
      codeChange: `// Before\nexec('mv temp/' + filename + ' uploads/' + filename);\n\n// After\nconst fs = require('fs').promises;\nconst path = require('path');\nif (!/^[a-zA-Z0-9._-]+$/.test(filename)) return res.status(400).send('Invalid filename');\nawait fs.rename(\n  path.join(__dirname, 'temp', filename),\n  path.join(__dirname, 'uploads', filename)\n);`,
      bestPractices: [
        "Never pass user input to exec/system calls",
        "Use fs module functions instead of shell commands for file operations",
        "Validate filenames with a strict allowlist regex",
        "Run processes with the least required OS privileges",
      ],
    },
    "OWA-003": {
      vulnerability: "Cross-Site Scripting (XSS)",
      priority: "high",
      effort: "low",
      rootCause: "User-supplied HTML is inserted into the DOM without sanitization.",
      secureFix: "Use textContent for plain text, or sanitize with DOMPurify before innerHTML assignment.",
      codeChange: `// Before\ndocument.getElementById('result').innerHTML = userInput;\n\n// After (plain text)\ndocument.getElementById('result').textContent = userInput;\n\n// After (rich HTML)\nimport DOMPurify from 'dompurify';\ndocument.getElementById('result').innerHTML = DOMPurify.sanitize(userInput);`,
      bestPractices: [
        "Prefer textContent over innerHTML for user data",
        "Implement a strict Content-Security-Policy header",
        "Sanitize HTML with DOMPurify when rich content is needed",
        "Encode output according to context (HTML, JS, URL)",
      ],
    },
    "OWA-004": {
      vulnerability: "Missing Authentication on Admin Route",
      priority: "critical",
      effort: "medium",
      rootCause: "Admin endpoint is publicly accessible with no authentication check.",
      secureFix: "Add authentication and role-based authorization middleware.",
      codeChange: `// Before\napp.get('/admin', async (req, res) => { ... });\n\n// After\napp.get('/admin', requireAuth, requireRole('admin'), async (req, res) => { ... });`,
      bestPractices: [
        "Apply auth middleware to all protected routes",
        "Use role-based access control (RBAC)",
        "Audit routes regularly for missing auth guards",
        "Log and alert on unauthorized access attempts",
      ],
    },
    "OWA-005": {
      vulnerability: "Server-Side Request Forgery (SSRF)",
      priority: "critical",
      effort: "medium",
      rootCause: "Server makes HTTP requests to URLs controlled by user input.",
      secureFix: "Validate and whitelist allowed domains; block private IP ranges.",
      codeChange: `// Before\nconst data = await axios.get(req.query.url);\n\n// After\nconst ALLOWED = ['api.trusted.com', 'data.example.org'];\nconst parsed = new URL(req.query.url);\nif (!ALLOWED.includes(parsed.hostname)) {\n  return res.status(400).json({ error: 'URL not allowed' });\n}\nconst data = await axios.get(req.query.url);`,
      bestPractices: [
        "Maintain an allowlist of approved external domains",
        "Block 169.254.x.x (cloud metadata) and 10.x.x.x / 172.16-31.x.x / 192.168.x.x",
        "Disable follow-redirects or validate redirect destinations",
        "Use an egress proxy with allowlist enforcement",
      ],
    },
    "OWA-006": {
      vulnerability: "Insecure Password Hashing (MD5)",
      priority: "high",
      effort: "medium",
      rootCause: "MD5 is not a password hashing function and is trivially brute-forced.",
      secureFix: "Replace MD5 with bcrypt, scrypt, or Argon2.",
      codeChange: `// Before\nconst hash = crypto.createHash('md5').update(password).digest('hex');\n\n// After\nconst bcrypt = require('bcrypt');\nconst hash = await bcrypt.hash(password, 12); // 12 salt rounds\n\n// Verify:\nconst match = await bcrypt.compare(candidate, hash);`,
      bestPractices: [
        "Use bcrypt (cost ≥12), scrypt, or Argon2id for passwords",
        "Never use MD5, SHA-1, or SHA-256 directly for passwords",
        "Add a pepper (application secret) in addition to the salt",
        "Re-hash passwords on next login after upgrading algorithm",
      ],
    },
    "OWA-007": {
      vulnerability: "Wildcard CORS Origin",
      priority: "high",
      effort: "low",
      rootCause: "Allowing all origins bypasses the same-origin policy.",
      secureFix: "Restrict CORS to known, trusted origins.",
      codeChange: `// Before\napp.use(cors({ origin: '*' }));\n\n// After\napp.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }));`,
      bestPractices: [
        "Explicitly list allowed origins",
        "Avoid reflecting the Origin header without validation",
        "Set appropriate credentials and headers allowlists",
      ],
    },
    "OWA-008": {
      vulnerability: "Code Injection via eval()",
      priority: "critical",
      effort: "medium",
      rootCause: "eval() executes arbitrary JavaScript from user-controlled strings.",
      secureFix: "Replace eval() with JSON.parse() or structured logic.",
      codeChange: `// Before\neval(req.body.expression);\n\n// After\nconst data = JSON.parse(req.body.json); // validated against schema`,
      bestPractices: [
        "Never use eval() with user data",
        "Use Function constructors only in sandboxed environments",
        "Validate all inputs with a schema library (Zod, Joi)",
      ],
    },
    "OWA-010": {
      vulnerability: "Path Traversal",
      priority: "high",
      effort: "medium",
      rootCause: "File paths constructed from user input allow directory traversal.",
      secureFix: "Resolve and validate the final path against an allowed base directory.",
      codeChange: `// Before\nfs.readFile('./uploads/' + req.query.file, ...);\n\n// After\nconst base = path.resolve(__dirname, 'uploads');\nconst target = path.resolve(base, req.query.file);\nif (!target.startsWith(base + path.sep)) return res.status(403).send('Forbidden');\nfs.readFile(target, ...);`,
      bestPractices: [
        "Always resolve paths and check they're within the expected base",
        "Reject filenames containing '..' or absolute paths",
        "Store user-uploaded files with server-generated names",
      ],
    },
  };

  const seen = new Set<string>();
  const result: FixRecommendation[] = [];

  for (const f of findings) {
    const ruleId = (f.detail as Record<string, string> | undefined)?.ruleId ?? "";
    const key = fixMap[ruleId] ? ruleId : f.title.slice(0, 32);
    if (seen.has(key)) continue;
    seen.add(key);

    const fix = fixMap[ruleId];
    if (fix) {
      result.push(fix);
    } else if (f.category === "Dependency Risk") {
      result.push({
        vulnerability: `Outdated Dependency: ${f.title}`,
        priority: f.severity,
        effort: "low",
        rootCause: `The installed version has known security vulnerabilities.`,
        secureFix: f.description,
        codeChange: `# Update the dependency to the fixed version\nnpm update ${(f.detail as Record<string, string> | undefined)?.package ?? "the-package"}`,
        bestPractices: [
          "Run npm audit regularly",
          "Integrate Dependabot or Renovate for automated updates",
          "Pin dependency versions in lockfiles",
          "Review changelogs before upgrading major versions",
        ],
      });
    }
  }

  return result.slice(0, 12);
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

export function runLocalAnalysis(payload: AuditPayload): AuditReport {
  const { repoName, files } = payload;
  const findings: Finding[] = [];
  let findingIndex = 0;

  // ── 1. Pattern-based file scanning ───────────────────────────────────────
  for (const file of files) {
    const lines = file.content.split("\n");

    for (const rule of [...SECRET_RULES, ...OWASP_RULES]) {
      if (rule.matchFile) {
        const snippet = rule.matchFile(file.content, file.path);
        if (snippet) {
          findings.push({
            id: `local-${++findingIndex}`,
            category: rule.category,
            severity: rule.severity,
            file: file.path,
            title: rule.title,
            description: rule.description,
            status: "open",
            detail: {
              ruleId: rule.id,
              owaspId: rule.owaspId,
              owaspCategory: rule.owaspCategory,
              vulnerableCode: snippet,
              recommendation: rule.recommendation,
              description: rule.description,
            },
          });
        }
      }

      if (rule.matchLine) {
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          const snippet = rule.matchLine(line, lineIdx + 1, file.path);
          if (snippet) {
            findings.push({
              id: `local-${++findingIndex}`,
              category: rule.category,
              severity: rule.severity,
              file: file.path,
              title: rule.title,
              description: rule.description,
              status: "open",
              detail: {
                ruleId: rule.id,
                owaspId: rule.owaspId,
                owaspCategory: rule.owaspCategory,
                vulnerableCode: snippet.trim(),
                recommendation: rule.recommendation,
                description: rule.description,
                attackVector: "Remote",
              },
            });
            break; // one finding per rule per file is enough
          }
        }
      }
    }
  }

  // ── 2. Dependency CVE scanning ─────────────────────────────────────────
  const deps = parseDependencies(files);

  for (const [pkg, installedVersion] of deps.entries()) {
    for (const vuln of DEP_VULNS) {
      if (
        vuln.package.toLowerCase() === pkg.toLowerCase() &&
        semverLessThan(installedVersion, vuln.affectedBelow)
      ) {
        findings.push({
          id: `local-${++findingIndex}`,
          category: "Dependency Risk",
          severity: vuln.severity,
          file: "package.json",
          title: `${pkg} – ${vuln.vulnerability}`,
          description: `${pkg}@${installedVersion} is affected by ${vuln.cve}: ${vuln.vulnerability}. ${vuln.recommendation}`,
          status: "open",
          detail: {
            ruleId: `DEP-${vuln.cve}`,
            package: pkg,
            installedVersion,
            upgradeVersion: vuln.fixedIn,
            cve: vuln.cve,
            vulnerability: vuln.vulnerability,
            recommendation: vuln.recommendation,
            severity: vuln.severity,
          },
        });
      }
    }
  }

  // ── 3. Deduplicate ────────────────────────────────────────────────────
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = `${f.title}::${f.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: critical → high → medium → low
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  unique.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  // ── 4. Metrics ─────────────────────────────────────────────────────────
  const breakdown = unique.reduce(
    (acc, f) => { acc[f.severity] += 1; return acc; },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  const score = computeScore(unique);
  const riskLevel = computeRiskLevel(score);

  const total = unique.length;
  const summary =
    total === 0
      ? `No security issues detected by the local analysis engine in ${repoName}.`
      : `${riskLevel} risk repository. ${total} findings detected by the local static analysis engine — ${breakdown.critical} critical, ${breakdown.high} high, ${breakdown.medium} medium, ${breakdown.low} low.`;

  return {
    id: `${repoName}-local-${Date.now()}`,
    metadata: {
      repoName,
      auditTimestamp: new Date().toISOString(),
      agentsUsed: ["LocalStaticAnalyzer"],
      model: "RepoGuard Local Engine v1",
    },
    projectContext: {},
    securityScore: score,
    riskLevel,
    severityBreakdown: breakdown,
    summary,
    findings: unique,
    fixes: buildFixes(unique),
  };
}
