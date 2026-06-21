import type { AuditReport } from "@/lib/types";

/**
 * Fallback report shown when the n8n audit workflow times out or fails.
 * Also used as the "Load sample report" demo in the dashboard.
 */
export const sampleReport: AuditReport = {
  id: "sample-critical-audit",
  metadata: {
    repoName: "vulnerable-node-app",
    auditTimestamp: new Date().toISOString(),
    agentsUsed: [
      "ContextAgent",
      "SecretDetectionAgent",
      "DependencyRiskAgent",
      "OWASPAgent",
      "AttackImpactAgent",
      "FixGeneratorAgent",
    ],
    model: "Gemini 2.5 Flash",
  },
  projectContext: {},
  securityScore: 0,
  riskLevel: "Critical",
  severityBreakdown: {
    critical: 4,
    high: 9,
    medium: 1,
    low: 2,
  },
  summary:
    "Critical risk repository. 16 findings detected. 4 critical, 9 high, 1 medium, 2 low.",
  findings: [
    {
      id: "f-dep-jwt",
      category: "Dependency Risk",
      severity: "critical",
      file: "Dependency Manifest",
      title: "jsonwebtoken Algorithm Confusion / Signature Verification Bypass",
      description:
        "Upgrade to latest secure version. This vulnerability allows an attacker to bypass signature verification if no algorithm is specified, leading to arbitrary code execution or authentication bypass.",
      status: "open",
      detail: {
        package: "jsonwebtoken",
        installedVersion: "7.4.0",
        vulnerability: "Algorithm Confusion / Signature Verification Bypass",
        cve: "CVE-2018-1000001",
        severity: "critical",
        recommendation:
          "Upgrade to latest secure version. A major version upgrade may be required.",
        upgradeVersion: "9.0.2",
      },
    },
    {
      id: "f-sqli",
      category: "OWASP Top 10",
      severity: "critical",
      file: "src/routes/user.js",
      title: "A03 Injection — SQL Injection",
      description:
        "The `id` parameter from `req.query` is directly concatenated into an SQL query without sanitization or parameterization. This allows an attacker to inject malicious SQL.",
      status: "open",
      detail: {
        owaspId: "A03",
        owaspCategory: "Injection",
        vulnerableCode: "const query='SELECT * FROM users WHERE id='+id;",
        recommendation:
          "Use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [id])",
        businessImpact: "Unauthorized data access, modification, or deletion.",
        attackVector: "Crafted query string appending SQL clauses.",
      },
    },
    {
      id: "f-md5",
      category: "OWASP Top 10",
      severity: "critical",
      file: "src/utils/password.js",
      title: "A02 Cryptographic Failures — Broken Password Hashing (MD5)",
      description:
        "The application uses MD5 for hashing passwords. MD5 is cryptographically broken, making stored passwords vulnerable to rainbow table attacks.",
      status: "open",
      detail: {
        owaspId: "A02",
        owaspCategory: "Cryptographic Failures",
        vulnerableCode: "return crypto.createHash('md5').update(password).digest('hex');",
        recommendation:
          "Use bcrypt, scrypt, or Argon2 with a unique salt per password.",
        businessImpact: "If hashes leak, all accounts can be cracked rapidly.",
        attackVector: "Offline cracking with commodity hardware and rainbow tables.",
      },
    },
    {
      id: "f-cmdi",
      category: "OWASP Top 10",
      severity: "critical",
      file: "src/routes/upload.js",
      title: "A03 Injection — Command Injection via Filename",
      description:
        "The `filename` parameter from `req.body` is directly concatenated into a shell command (`mv`). An attacker can inject arbitrary shell commands.",
      status: "open",
      detail: {
        owaspId: "A03",
        owaspCategory: "Injection",
        vulnerableCode: "exec('mv temp/'+filename+' uploads/'+filename);",
        recommendation:
          "Use Node.js `fs` module for file operations. Never pass user input to exec/shell commands.",
        businessImpact: "Remote code execution — full server takeover possible.",
        attackVector: "Inject shell metacharacters in the filename field.",
      },
    },
    {
      id: "f-dep-express",
      category: "Dependency Risk",
      severity: "high",
      file: "Dependency Manifest",
      title: "express Outdated Version / Transitive Dependency Vulnerability (qs)",
      description:
        "Upgrade to the latest secure 4.x version to mitigate known vulnerabilities in express and its dependencies like qs.",
      status: "open",
      detail: {
        package: "express",
        installedVersion: "4.16.0",
        cve: "CVE-2022-24999",
        upgradeVersion: "4.19.2",
        recommendation: "Run npm update express",
      },
    },
    {
      id: "f-dep-lodash",
      category: "Dependency Risk",
      severity: "high",
      file: "Dependency Manifest",
      title: "lodash Prototype Pollution",
      description:
        "Upgrade to the latest secure 4.x version to fix prototype pollution vulnerabilities.",
      status: "open",
      detail: {
        package: "lodash",
        installedVersion: "4.17.15",
        cve: "CVE-2021-23339",
        upgradeVersion: "4.17.21",
        recommendation: "Run npm update lodash",
      },
    },
    {
      id: "f-dep-axios",
      category: "Dependency Risk",
      severity: "high",
      file: "Dependency Manifest",
      title: "axios Server-Side Request Forgery (SSRF) / Cross-Site Scripting",
      description:
        "Upgrade to the latest secure version to mitigate SSRF, XSS, and other denial-of-service vulnerabilities.",
      status: "open",
      detail: {
        package: "axios",
        installedVersion: "0.18.0",
        cve: "CVE-2020-28168",
        upgradeVersion: "1.6.8",
        recommendation: "Run npm update axios",
      },
    },
    {
      id: "f-jwt-secret",
      category: "OWASP Top 10",
      severity: "high",
      file: "src/config/auth.js",
      title: "A05 Security Misconfiguration — Hardcoded JWT Secret",
      description:
        "The JWT secret is hardcoded and weak ('super-secret-jwt-key'). This makes JWT tokens easily forgeable.",
      status: "open",
      detail: {
        owaspId: "A05",
        owaspCategory: "Security Misconfiguration",
        vulnerableCode: "const JWT_SECRET='super-secret-jwt-key';",
        recommendation:
          "Move secret to an environment variable and rotate it immediately.",
        businessImpact: "All existing JWTs can be forged by anyone who sees this file.",
      },
    },
    {
      id: "f-api-key",
      category: "OWASP Top 10",
      severity: "high",
      file: "src/config/auth.js",
      title: "A05 Security Misconfiguration — Hardcoded Live API Key",
      description:
        "A live API key ('sk_live_123456789') is hardcoded in source code, risking unauthorized usage and data breaches.",
      status: "open",
      detail: {
        owaspId: "A05",
        owaspCategory: "Security Misconfiguration",
        vulnerableCode: "const API_KEY='sk_live_123456789';",
        recommendation: "Store API keys in environment variables; revoke this key now.",
      },
    },
    {
      id: "f-bac",
      category: "OWASP Top 10",
      severity: "high",
      file: "src/routes/admin.js",
      title: "A01 Broken Access Control — Unprotected Admin Route",
      description:
        "The `/admin` route fetches all user data with no authentication or authorization check.",
      status: "open",
      detail: {
        owaspId: "A01",
        owaspCategory: "Broken Access Control",
        vulnerableCode:
          "app.get('/admin', async(req,res)=>{ const users=await db.query('SELECT * FROM users'); res.send(users); });",
        recommendation:
          "Add authentication middleware and role-based authorization before the handler.",
      },
    },
    {
      id: "f-ssrf",
      category: "OWASP Top 10",
      severity: "high",
      file: "src/routes/proxy.js",
      title: "A10 Server-Side Request Forgery (SSRF)",
      description:
        "The `url` parameter from `req.query` is passed directly to axios.get() with no validation, allowing internal network probing.",
      status: "open",
      detail: {
        owaspId: "A10",
        owaspCategory: "Server-Side Request Forgery (SSRF)",
        vulnerableCode: "const data=await axios.get(url);",
        recommendation:
          "Validate URL protocol, whitelist allowed domains, and block private IP ranges.",
        attackVector: "Pass http://localhost/admin or cloud metadata URLs.",
      },
    },
    {
      id: "f-xss",
      category: "OWASP Top 10",
      severity: "high",
      file: "src/frontend/search.js",
      title: "A03 Injection — Reflected Cross-Site Scripting (XSS)",
      description:
        "The `search` parameter is inserted into the DOM using `innerHTML`, enabling attacker-controlled script execution.",
      status: "open",
      detail: {
        owaspId: "A03",
        owaspCategory: "Injection",
        vulnerableCode: "document.getElementById('result').innerHTML=req.query.search;",
        recommendation:
          "Use textContent instead of innerHTML; sanitize rich input with DOMPurify.",
        attackVector: "Craft a URL with a <script> tag in the search query parameter.",
      },
    },
    {
      id: "f-owasp-jwt-outdated",
      category: "OWASP Top 10",
      severity: "high",
      file: "package.json",
      title: "A06 Vulnerable and Outdated Components — jsonwebtoken 7.4.0",
      description:
        "Significantly outdated; older versions contain algorithm confusion and DoS vulnerabilities.",
      status: "open",
      detail: {
        owaspId: "A06",
        owaspCategory: "Vulnerable and Outdated Components",
        vulnerableCode: '"jsonwebtoken":"7.4.0"',
        recommendation: "Update to jsonwebtoken ^9.0.2",
      },
    },
    {
      id: "f-owasp-axios-outdated",
      category: "OWASP Top 10",
      severity: "medium",
      file: "package.json",
      title: "A06 Vulnerable and Outdated Components — axios 0.18.0",
      description:
        "Significantly outdated; known SSRF, prototype pollution, and header injection vulnerabilities exist.",
      status: "open",
      detail: {
        owaspId: "A06",
        owaspCategory: "Vulnerable and Outdated Components",
        vulnerableCode: '"axios":"0.18.0"',
        recommendation: "Update to axios ^1.6.8",
      },
    },
    {
      id: "f-owasp-express-outdated",
      category: "OWASP Top 10",
      severity: "low",
      file: "package.json",
      title: "A06 Vulnerable and Outdated Components — express 4.16.0",
      description:
        "Outdated express version missing security patches from later 4.x releases.",
      status: "open",
      detail: {
        owaspId: "A06",
        owaspCategory: "Vulnerable and Outdated Components",
        vulnerableCode: '"express":"4.16.0"',
        recommendation: "Update to express ^4.19.2",
      },
    },
    {
      id: "f-owasp-lodash-outdated",
      category: "OWASP Top 10",
      severity: "low",
      file: "package.json",
      title: "A06 Vulnerable and Outdated Components — lodash 4.17.15",
      description:
        "Outdated; prototype pollution vulnerability present in versions below 4.17.21.",
      status: "open",
      detail: {
        owaspId: "A06",
        owaspCategory: "Vulnerable and Outdated Components",
        vulnerableCode: '"lodash":"4.17.15"',
        recommendation: "Update to lodash ^4.17.21",
      },
    },
  ],
  fixes: [
    {
      vulnerability: "Hardcoded JWT Secret",
      rootCause:
        "JWT secret is stored directly in source code, making it easily discoverable.",
      secureFix:
        "Move the JWT secret to an environment variable and rotate the exposed secret immediately.",
      codeChange: "const JWT_SECRET = process.env.JWT_SECRET;",
      priority: "critical",
      effort: "low",
      bestPractices: [
        "Store all secrets in environment variables or a dedicated secret manager.",
        "Never commit secrets to source control.",
        "Implement secret rotation policies.",
      ],
    },
    {
      vulnerability: "Hardcoded API Key",
      rootCause:
        "A live API key is embedded in source code, risking unauthorized access.",
      secureFix:
        "Move the API key to environment variables and revoke the exposed key immediately.",
      codeChange: "const API_KEY = process.env.STRIPE_API_KEY;",
      priority: "critical",
      effort: "low",
      bestPractices: [
        "Store API keys in a secret manager.",
        "Restrict API key permissions to the minimum necessary.",
      ],
    },
    {
      vulnerability: "SQL Injection",
      rootCause:
        "User input concatenated directly into SQL queries instead of being bound as data.",
      secureFix:
        "Use parameterized queries or prepared statements for all DB calls.",
      codeChange:
        "const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);",
      priority: "critical",
      effort: "medium",
      bestPractices: [
        "Always use parameterized queries for user-controlled values.",
        "Consider using an ORM that parameterizes by default.",
      ],
    },
    {
      vulnerability: "Missing Admin Authorization",
      rootCause:
        "The /admin endpoint lacks authentication and authorization middleware.",
      secureFix:
        "Add authentication + role-based authorization middleware before the admin handler.",
      codeChange:
        "app.get('/admin', authenticateUser, authorizeAdmin, async(req,res) => { ... });",
      priority: "critical",
      effort: "medium",
      bestPractices: [
        "Apply the Principle of Least Privilege.",
        "Use role-based access control (RBAC) for all sensitive routes.",
      ],
    },
    {
      vulnerability: "Weak Password Hashing (MD5)",
      rootCause:
        "MD5 is a fast general-purpose hash, not a password KDF, making it trivially crackable.",
      secureFix: "Replace MD5 with bcrypt, scrypt, or Argon2id.",
      codeChange:
        "const bcrypt = require('bcrypt');\nconst hash = await bcrypt.hash(password, 12);",
      priority: "critical",
      effort: "medium",
      bestPractices: [
        "Use a unique, cryptographically secure salt per password.",
        "Use Argon2id for new projects; bcrypt for existing codebases.",
      ],
    },
    {
      vulnerability: "Command Injection",
      rootCause:
        "User-controlled filename concatenated into a shell command executed via exec().",
      secureFix:
        "Use Node.js fs module for file operations; never exec() user input.",
      codeChange:
        "const fs = require('fs/promises');\nawait fs.rename('temp/' + safeFilename, 'uploads/' + safeFilename);",
      priority: "critical",
      effort: "medium",
      bestPractices: [
        "Whitelist filenames using a strict regex: /^[a-zA-Z0-9_.-]+$/",
        "Use execFile() with fixed commands if shell is truly needed.",
      ],
    },
    {
      vulnerability: "Server-Side Request Forgery (SSRF)",
      rootCause:
        "User-supplied URL passed directly to axios without domain or IP validation.",
      secureFix:
        "Whitelist allowed domains, block private IP ranges, disallow redirects.",
      codeChange:
        "const allowedDomains = ['api.external.com'];\nif (!allowedDomains.includes(new URL(url).hostname)) throw new Error('Blocked');",
      priority: "high",
      effort: "high",
      bestPractices: [
        "Block 169.254.169.254 (cloud metadata) and all RFC1918 ranges.",
        "Use a dedicated egress proxy with firewall rules.",
      ],
    },
    {
      vulnerability: "Reflected XSS",
      rootCause:
        "User input inserted into innerHTML without escaping, enabling script injection.",
      secureFix: "Use textContent instead of innerHTML for plain text output.",
      codeChange:
        "document.getElementById('result').textContent = new URLSearchParams(window.location.search).get('search') || '';",
      priority: "high",
      effort: "medium",
      bestPractices: [
        "Implement a Content Security Policy (CSP).",
        "Use DOMPurify for rich text sanitization.",
      ],
    },
    {
      vulnerability: "Outdated Dependencies",
      rootCause:
        "Multiple outdated packages with known CVEs (express, lodash, jsonwebtoken, axios).",
      secureFix: "Update all outdated dependencies to their latest stable versions.",
      codeChange:
        '// In package.json:\n"express": "^4.19.2",\n"lodash": "^4.17.21",\n"jsonwebtoken": "^9.0.2",\n"axios": "^1.6.8"\n// Then run: npm install',
      priority: "high",
      effort: "low",
      bestPractices: [
        "Use npm audit or Dependabot in your CI/CD pipeline.",
        "Pin major versions; allow minor/patch updates automatically.",
      ],
    },
  ],
};
