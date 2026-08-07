# Privacy

- The site publishes one policy for the whole domain, at
  `projects/site-root/privacy/index.html`, served from
  [/privacy/](https://bardbits.ca/privacy/). There is deliberately not one per
  project: browser storage is origin-scoped, and there is a single operator, so
  a per-project boundary would not be a real one.
- **Any change to what is collected, stored, or sent to a third party MUST
  update `/privacy` in the same pull request.** That includes adding analytics,
  a form, a cookie, an embedded widget, a new storage key, an outbound
  affiliate or tracking link, or a new log field. No tooling can detect that
  practice has drifted from the policy, so it depends on this being noticed.
- The policy makes specific, checkable claims — no cookies are set, no
  third-party scripts load, visitor IP addresses are not logged, logs expire
  after 30 days. Verify against the running site before changing anything that
  touches them. A policy that misstates practice is worse than no policy.
- Introducing user accounts is a rewrite rather than an edit: it makes data
  subject rights genuinely exercisable, adds retention and legal-basis
  questions, and would need review by someone qualified.

# AWS Guidance

- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
