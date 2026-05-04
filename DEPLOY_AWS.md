# NEU Cashier Dashboard — AWS Deployment

Two paths. Pick one and stop reading the other.

| Path                          | Best for                                  |
|-------------------------------|-------------------------------------------|
| **A. AWS Amplify Hosting**    | Fastest — push, get a CI/CD pipeline + CDN, sane defaults. |
| **B. S3 + CloudFront**        | Full control — caching, security headers, custom function rewrites. |

Both serve the same artefact: the `dist/` output of `npm run build`. Both
require the backend (`neupaymentbe`) to be already deployed at a HTTPS
origin (e.g. `https://api.neu.edu.ph`) so the FE can call it.

---

## 0. Prerequisites

| Tool                      | Why                                              |
|---------------------------|--------------------------------------------------|
| AWS account + IAM admin   | Provisioning resources                           |
| AWS CLI v2                | All paths use it                                 |
| Node 20.x                 | `npm run build`                                  |
| ACM certificate (us-east-1 for CloudFront, your region for Amplify) | TLS for `dash.neu.edu.ph` |

Set:

```bash
export AWS_REGION=ap-southeast-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

---

## A. AWS Amplify Hosting

This is the easier path. Amplify reads [`amplify.yml`](./amplify.yml), builds
the SPA, serves it from a CloudFront distribution Amplify manages, and gives
you previews + branch deploys for free.

### A1. Connect the repository

1. AWS Console → **Amplify → Hosting → New app → Host web app**.
2. Connect your Git provider and pick the `neupayfe` directory (Amplify
   detects monorepos automatically).
3. Branch: `main` (or whatever you ship from).
4. Amplify auto-detects `amplify.yml` — accept it.

### A2. Set environment variables

In the new Amplify app → **Hosting → Environment variables**:

| Key                  | Value                                              |
|----------------------|----------------------------------------------------|
| `VITE_NEU_API_BASE`  | `https://api.neu.edu.ph` (your backend origin)     |
| `VITE_NEU_APP_NAME`  | `NEU Cashier Dashboard`                            |
| `VITE_NEU_ENV_LABEL` | `Production`                                       |

Then trigger the first build (Amplify does it automatically on connect).

### A3. Custom domain

**Hosting → Domain management → Add domain →** `dash.neu.edu.ph`.

Amplify provisions an ACM cert, rewrites `https://*.amplifyapp.com` to your
custom domain, and adds an HTTPS listener — no further work needed.

### A4. Allow the domain in the backend's CORS

On the backend deployment (Elastic Beanstalk or ECS), set:

```
NEU_CORS_ALLOWED_ORIGINS=https://dash.neu.edu.ph
```

(See `neupaymentbe/DEPLOY_AWS.md` for how to update env vars on the
backend.)

That's it. Pushes to `main` deploy automatically; PR branches get preview
URLs.

---

## B. S3 + CloudFront

More setup, more knobs. Use this when you want to centralise WAF, custom
caching, or run the FE on the same CloudFront distribution as the API.

### B1. Create the bucket (private)

```bash
export FE_BUCKET=neu-cashier-fe-prod
aws s3api create-bucket \
    --bucket "$FE_BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION"

aws s3api put-public-access-block \
    --bucket "$FE_BUCKET" \
    --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### B2. Provision the CloudFront distribution

Create in the console (it has a wizard for this exact case):

1. **Origin domain** → the S3 bucket (use **Origin Access Control**, not OAI).
2. **Default cache behaviour** → cache policy `Managed-CachingOptimized`,
   redirect HTTP to HTTPS.
3. **Viewer-request function** → upload [`deploy/spa-rewrite.js`](./deploy/spa-rewrite.js)
   as a CloudFront Function and attach it. This handles deep-link refreshes
   without needing `_redirects`.
4. **Response headers policy** → `neu-cashier-fe-headers` from
   [`deploy/cloudfront-spa-policy.json`](./deploy/cloudfront-spa-policy.json).
5. **Alternate domain name** → `dash.neu.edu.ph`, attach an
   ACM cert in **us-east-1**.
6. **Default root object** → `index.html`.
7. **Custom error responses** → 403 → `/index.html` (200), 404 → `/index.html` (200).

After creation, copy the distribution ARN and put a bucket policy on the
S3 bucket that allows the distribution to GetObject:

```bash
aws s3api put-bucket-policy --bucket "$FE_BUCKET" --policy "$(jq -r '
  .BucketPolicy
  | (.Statement[].Resource = "arn:aws:s3:::'"$FE_BUCKET"'/*")
  | (.Statement[].Condition."StringEquals"."AWS:SourceArn" = "'$DISTRIBUTION_ARN'")
' deploy/cloudfront-spa-policy.json)"
```

(or open `deploy/cloudfront-spa-policy.json`, replace the placeholders, and
paste the policy through the console.)

### B3. Build and deploy

```bash
AWS_REGION=ap-southeast-1 \
AWS_BUCKET=$FE_BUCKET \
AWS_DISTRIBUTION_ID=E1XXXXXXXXXXXX \
VITE_NEU_API_BASE=https://api.neu.edu.ph \
./deploy/deploy-s3.sh
```

The script:

1. Writes `.env.production` from the env vars you passed.
2. Runs `npm ci` + `npm run build`.
3. Syncs `dist/` to S3 with **immutable** caching for hashed assets and
   **no-cache** for `index.html`.
4. Triggers a CloudFront invalidation for `/index.html` so users get the
   new HTML on their next request.

### B4. Allow the domain in the backend's CORS

Same as Amplify — update the backend env vars:

```
NEU_CORS_ALLOWED_ORIGINS=https://dash.neu.edu.ph,https://api.neu.edu.ph
```

### B5. Optional: WAF

If the backend already sits behind WAF, attach the same web ACL to the
CloudFront distribution. Recommended managed rules:

- `AWSManagedRulesCommonRuleSet`
- `AWSManagedRulesKnownBadInputsRuleSet`
- A rate-based rule (5000 req / 5min / IP)

### B6. CI/CD (optional)

Drop this in `.github/workflows/deploy.yml` for a GitHub Actions deploy:

```yaml
name: deploy-fe
on:
  push:
    branches: [main]
    paths: ['neupayfe/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm', cache-dependency-path: 'neupayfe/package-lock.json' }
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-southeast-1
      - working-directory: neupayfe
        env:
          AWS_REGION: ap-southeast-1
          AWS_BUCKET: neu-cashier-fe-prod
          AWS_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_ID }}
          VITE_NEU_API_BASE: https://api.neu.edu.ph
        run: ./deploy/deploy-s3.sh
```

---

## Verifying a deploy

After either path:

```bash
# 1. The HTML should be the SPA shell.
curl -sI https://dash.neu.edu.ph | head -1
curl -s  https://dash.neu.edu.ph | grep '<title>'

# 2. Sign in with the bootstrap admin from the backend.
# 3. Open DevTools → Network → confirm the calls go to your VITE_NEU_API_BASE.
# 4. Try Cash In → Direct top-up. The first attempt prompts for password
#    step-up; the next few in the same 5-minute window don't.
```

If a user reload on a deep link 404s, your SPA fallback (CloudFront Function
or Amplify rewrite) isn't wired up.

If the FE renders but every API call fails with CORS, the backend's
`NEU_CORS_ALLOWED_ORIGINS` doesn't include the dashboard origin — fix and
redeploy the backend (no FE rebuild needed).

---

## Cost ballpark (ap-southeast-1, 24/7)

| Path                     | Monthly USD (approx)            |
|--------------------------|---------------------------------|
| Amplify Hosting          | ~$0.15 + $0.023/GB transfer     |
| S3 + CloudFront          | ~$0.50 storage + $0.085/GB      |

The SPA bundle is small (~200 KB gzipped). Ten thousand active users hitting
the dashboard daily costs cents either way; Aurora dominates the platform
bill, not the FE.
