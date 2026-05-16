# Weave Azure Deployment Architecture

> **Status**: Production
> **Last Updated**: 2026-05-16
> **Audience**: Engineers setting up Azure resources and CI/CD pipelines

---

## 1. Overview

Weave consists of two deployable components hosted on Azure:

| Component | Stack | Azure Service | Custom Domain |
|-----------|-------|---------------|---------------|
| Frontend | React + TypeScript + Vite SPA, served by Node.js/Express | Azure App Service | `weave-ai.dev` |
| Engine | Python FastAPI + uvicorn | Azure App Service | `engine.weave-ai.dev` |

Both components are deployed to Azure App Service in the Italy North region. The Frontend uses a Node.js Express server to serve the built React SPA and handle client-side routing. The Engine runs Python FastAPI with uvicorn.

---

## 2. Architecture Diagram

```
                          name.com DNS
                               |
               +---------------+
               |
        weave-ai.dev
               |
               v
    +--------------------------+
    | Azure App Service        |
    | - Weave-Frontend         |
    | - Node.js 22 LTS         |
    | - Express.js server      |
    | - Serves React SPA       |
    | - Italy North region     |
    | - Managed SSL            |
    +--------------------------+
               |
               |  HTTPS API calls via engine.weave-ai.dev
               +-----> /validate_pipeline -----+
               +-----> /infer/layer -----------+
               +-----> /datasets/* ------------+
                       CORS: allow weave-ai.dev
                               |
                               v
                    +--------------------------+
                    | Azure App Service        |
                    | - weave-python-engine    |
                    | - Python 3.13 + FastAPI  |
                    | - Italy North region     |
                    | - Managed SSL            |
                    +--------------------------+


  GitHub Actions CI/CD
  ====================

  Push to main
       |
       +-- paths: Frontend/** ---> Build + Deploy to App Service (Node.js)
       |                               |
       |                               +-- OIDC federated credentials
       |                                   (separate from engine)
       |
       +-- paths: engine/** -----> Build + Deploy to App Service (Python)
                                       |
                                       +-- OIDC federated credentials
                                           (no stored secrets)
```

---

## 3. Azure App Service for Frontend

### 3.1 Decision Rationale

Azure App Service was chosen over Azure Static Web Apps (SWA) for the following reasons:

| Factor | Azure App Service | Azure Static Web Apps (previous) |
|--------|-------------------|----------------------------------|
| Server-side control | Full Node.js runtime with Express | Static files only (no server code) |
| Auth integration | Can implement custom session/auth middleware | Limited to built-in Easy Auth |
| Future API gateway | Can add server-side API routes if needed | Not possible |
| Cost | B1 Basic ~$13/mo | Free tier available |
| Custom domain | Supported | Supported |
| Automatic SSL | Managed certificates (free) | Managed certificates (free) |
| SPA routing | Express `app.get('*')` handles fallback | Built-in fallback rules |
| CI/CD | Manual workflow with `azure/webapps-deploy@v3` | Native GitHub integration |

**Key reasons for choosing App Service over SWA**:

1. **Server-side control**: Running a Node.js Express server gives us full control over HTTP handling, middleware, and future server-side logic. This is essential for planned features like session management, authentication callbacks, and server-side redirects.

2. **Consolidated platform**: Both the Frontend and Engine now run on Azure App Service, reducing operational complexity. The same Azure Portal workflow, monitoring tools, and deployment patterns apply to both.

3. **OIDC authentication**: The Frontend uses its own set of OIDC federated credentials (separate from the Engine), following the same proven pattern already established for the Engine deployment.

4. **Flexibility for future growth**: If we later need server-side rendering (SSR), API routes, or middleware for analytics/logging, Express makes this trivial. SWA's static-only model would require a separate API backend.

### 3.2 App Service Configuration

- **Resource name**: `Weave-Frontend`
- **Region**: Italy North (same as Engine)
- **Runtime stack**: Node.js 22 LTS (Linux)
- **Pricing tier**: B1 (Basic)
- **Startup command**: `node server.js` (uses the Express server)
- **App settings**:
  - `PORT` = `8080`
  - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
  - `WEBSITE_NODE_DEFAULT_VERSION` = `22.x`

### 3.3 Express.js Server Architecture

The Frontend uses an Express.js server defined in [`Frontend/server.js`](Frontend/server.js):

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA routing: any non-file request should serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Weave frontend server running on port ${PORT}`);
});
```

**How it works**:

1. During CI/CD, Vite builds the React app into `Frontend/dist/`
2. The Express server serves the static files from `dist/`
3. For any unrecognized route (e.g., `/dashboard`, `/studio`), Express returns `index.html` so React Router can handle client-side navigation
4. Azure App Service starts the server via `npm start` → `node server.js`

---

## 4. Azure App Service for Engine — Custom Domain

The Engine is already deployed at:
```
https://weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net/
```

### 4.1 Custom Domain Setup for `engine.weave-ai.dev`

Steps to configure in Azure Portal:

1. Navigate to **App Service** → `weave-python-engine` → **Custom domains**
2. Click **Add custom domain**
3. Enter `engine.weave-ai.dev`
4. Azure will display the required DNS validation record — typically a CNAME pointing to `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net`
5. Add the DNS record at name.com — see [Section 5](#5-dns-configuration-at-namecom)
6. Click **Validate** in Azure Portal — DNS propagation may take up to 48 hours
7. Once validated, Azure automatically provisions the SSL certificate for `engine.weave-ai.dev`

> **Note**: App Service managed certificates provide free automatic SSL for custom domains. No manual certificate upload is needed.

---

## 5. DNS Configuration at name.com

The domain `weave-ai.dev` is registered at name.com. The following DNS records must be created:

### 5.1 Required DNS Records

| Record Type | Host | Value | Purpose |
|-------------|------|-------|---------|
| CNAME or A | `weave-ai.dev` or `@` | `Weave-Frontend.italynorth-01.azurewebsites.net` | Frontend — Azure App Service default hostname |
| TXT | `_dnsauth.weave-ai.dev` | `<validation-token-from-azure>` | Domain ownership validation for App Service |
| CNAME | `engine` | `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net` | Engine — subdomain for API backend |
| TXT | `_dnsauth.engine.weave-ai.dev` | `<validation-token-from-azure>` | Domain ownership validation for App Service |

### 5.2 Step-by-step DNS Setup

1. **Create the Azure App Service resource first** — Azure will provide the default hostname and validation token
2. **Log into name.com** → Manage `weave-ai.dev` → DNS Records
3. **Add DNS for Frontend**:
   - For root domain (`weave-ai.dev`): Use an **A record** pointing to the App Service inbound IP address, or use **CNAME** if name.com supports CNAME flattening at the apex
   - Type: A record → IP: (get from App Service → Custom domains → IP address)
   - Or CNAME → Host: `@` → Value: `Weave-Frontend.italynorth-01.azurewebsites.net`
4. **Add TXT validation for Frontend**:
   - Type: TXT
   - Host: `_dnsauth`
   - Value: the validation token from App Service custom domain setup
5. **Add CNAME for Engine**:
   - Type: CNAME
   - Host: `engine`
   - Value: `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net`
6. **Add TXT validation for Engine**:
   - Type: TXT
   - Host: `_dnsauth.engine`
   - Value: the validation token from App Service custom domain setup

> **Apex Domain Note**: Azure App Service supports both CNAME and A record mapping for root domains. If your DNS provider supports CNAME flattening (also called ALIAS or ANAME records), use that. Otherwise, use an A record pointing to the App Service's inbound IP address. Azure Portal provides the specific instructions during custom domain setup.

---

## 6. CI/CD Pipeline Architecture

### 6.1 Pipeline Overview

```
  GitHub Repository: Weave
  =========================

  Push to main branch
       |
       +-- Filter by paths
       |
       +--- paths: Frontend/** -----> main_weave-frontend.yml
       |                                |
       |                                +-- Build: npm ci && npm run build
       |                                +-- Deploy: azure/webapps-deploy@v3
       |                                +-- Auth: OIDC federated credentials
       |                                +-- Env: VITE_API_URL=https://engine.weave-ai.dev
       |
       +--- paths: engine/** --------> main_weave-python-engine.yml
       |                                |
       |                                +-- Build: uv export + mkdocs build
       |                                +-- Deploy: azure/webapps-deploy@v3
       |                                +-- Auth: OIDC federated credentials
       |
       +--- CI checks ---------------> ci.yml
                                        |
                                        +-- ruff, ty, pytest, docs-build
```

### 6.2 Frontend Deployment Workflow

**File**: [`.github/workflows/main_weave-frontend.yml`](../.github/workflows/main_weave-frontend.yml)

```yaml
name: Build and deploy Node.js app to Azure Web App - Weave-Frontend

on:
  push:
    branches:
      - main
    paths:
      - 'Frontend/**'
  workflow_dispatch:

jobs:
  build:
    name: Build and Upload Artifact
    runs-on: ubuntu-latest
    environment:
      name: production
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Set production API URL
        working-directory: Frontend
        run: echo "VITE_API_URL=https://engine.weave-ai.dev" >> $GITHUB_ENV

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: Frontend/package-lock.json

      - name: Install dependencies
        working-directory: Frontend
        run: npm ci

      - name: Build the SPA
        working-directory: Frontend
        run: npm run build

      - name: Upload artifact for deployment
        uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: ./Frontend

  deploy:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Download artifact from build job
        uses: actions/download-artifact@v4
        with:
          name: node-app

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZUREAPPSERVICE_CLIENTID_DC85BF21FBC44F7E9124E5579313D5DB }}
          tenant-id: ${{ secrets.AZUREAPPSERVICE_TENANTID_2E3A69A375064DA0865F8971AD890B79 }}
          subscription-id: ${{ secrets.AZUREAPPSERVICE_SUBSCRIPTIONID_454C1786A1924197B41EF76FD3FE5240 }}

      - name: 'Deploy to Azure Web App'
        id: deploy-to-webapp
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'Weave-Frontend'
          slot-name: 'Production'
          package: .

      - name: Logout from Azure
        uses: azure/logout@v2
```

**Key details**:

- **`VITE_API_URL`** is set as a GitHub Actions environment variable before the build runs. Vite embeds env vars at build time, so this must be present before `npm run build` executes.
- **OIDC federated credentials** are used instead of stored secrets — see [Section 8.3](#83-create-oidc-federated-credentials-for-frontend).
- The Frontend uses **its own set of OIDC secrets** (`DC85BF21...`), separate from the Engine's secrets (`0CE1FFF3...`).
- The workflow follows the same build + deploy two-job pattern as the engine workflow.

### 6.3 Engine Deployment Workflow — Existing

**File**: [`.github/workflows/main_weave-python-engine.yml`](../.github/workflows/main_weave-python-engine.yml)

This workflow already exists and is functional. The only required change is updating CORS origins in [`engine/main.py`](engine/main.py) — see [Section 7](#7-cors-configuration).

The workflow uses OIDC federated credentials with these existing GitHub secrets:
- `AZUREAPPSERVICE_CLIENTID_0CE1FFF3F97F4036B411E2D9FA15C49E`
- `AZUREAPPSERVICE_TENANTID_5E44147736554042BBCE9C0411350732`
- `AZUREAPPSERVICE_SUBSCRIPTIONID_C271FE427DBB4778B9F3FC74F4FDDD77`

### 6.4 CI Workflow — Existing

**File**: `.github/workflows/ci.yml`

Currently only covers Engine checks. Frontend CI checks should be added in a future iteration.

---

## 7. CORS Configuration

### 7.1 Current State

The Engine in [`engine/main.py`](engine/main.py) has **no CORS middleware configured**. This means cross-origin requests from the Frontend SPA will be blocked by the browser.

### 7.2 Required Change

Add `CORSMiddleware` to [`engine/main.py`](engine/main.py) with the production origin:

```python
from fastapi.middleware.cors import CORSMiddleware

# After app = FastAPI(...)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",      # Local development
        "http://localhost:8000",      # Local development alt
        "https://weave-ai.dev",       # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Design decisions**:
- Origins are hardcoded rather than read from an environment variable. This follows the simplicity-first principle — the list is small and unlikely to change frequently. If dynamic configuration is needed later, an `ALLOWED_ORIGINS` env var can be introduced.
- `allow_credentials=True` is set because the Frontend may need authenticated requests in the future.
- `allow_methods=["*"]` and `allow_headers=["*"]` are acceptable since the Engine API is fully public.

---

## 8. Azure Resource Setup Steps

These steps must be performed manually in the Azure Portal before the CI/CD pipelines can deploy.

### 8.1 Create Azure App Service for Frontend

1. Go to **Azure Portal** → **Create a resource** → **Web App**
2. Fill in:
   - **Name**: `Weave-Frontend`
   - **Resource group**: Use the same group as the Engine (recommended: `rg-weave` or similar)
   - **Runtime stack**: Node.js 22 LTS
   - **Operating System**: Linux
   - **Region**: Italy North (same as Engine)
   - **Pricing**: B1 (Basic)
3. Click **Review + Create** → **Create**
4. After creation, go to **Configuration** → **General settings**:
   - Set `Startup Command` to `node server.js`
5. Add **Application settings**:
   - `PORT` = `8080`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
   - `WEBSITE_NODE_DEFAULT_VERSION` = `20.x`

### 8.2 Configure Custom Domain on Frontend App Service

1. Navigate to **App Service** → `Weave-Frontend` → **Custom domains**
2. Click **Add custom domain** → Enter `weave-ai.dev`
3. Azure provides a TXT validation record and a CNAME/A record target
4. Add the DNS records at name.com — see [Section 5](#5-dns-configuration-at-namecom)
5. Wait for DNS propagation — click **Validate** in Azure
6. Once validated, the domain is active with automatic SSL

### 8.3 Create OIDC Federated Credentials for Frontend

The Frontend uses its own set of OIDC federated credentials, separate from the Engine:

1. Go to **Azure Portal** → **Microsoft Entra ID** → **App registrations**
2. Find the app registration with Client ID `DC85BF21FBC44F7E9124E5579313D5DB`
3. Click **Federated credentials** → **Add credential**
4. Fill in:
   - **Scenario**: GitHub Actions deploying Azure resources
   - **Organization**: Your GitHub org
   - **Repository**: Weave
   - **Entity type**: Environment
   - **GitHub environment name**: production
   - **Name**: `weave-frontend-appservice-deploy`
5. Click **Add**

> **Note**: The Frontend uses a **different** Entra ID app registration than the Engine. The OIDC secrets (`AZUREAPPSERVICE_CLIENTID_DC85BF21...`, `AZUREAPPSERVICE_TENANTID_2E3A69A3...`, `AZUREAPPSERVICE_SUBSCRIPTIONID_454C1786...`) are already configured in GitHub Secrets.

---

## 9. SSL/TLS

Both Azure App Services provide automatic managed SSL certificates for custom domains:

| Service | SSL Provider | Auto-renewal | Cost |
|---------|-------------|-------------|------|
| Azure App Service (Frontend) | App Service managed | Yes | Free |
| Azure App Service (Engine) | App Service managed | Yes | Free |

No manual certificate procurement or renewal is required. Azure provisions the certificate after DNS validation completes.

---

## 10. File Changes Required

### 10.1 New Files

| File | Purpose |
|------|---------|
| [`Frontend/server.js`](Frontend/server.js) | Express.js server to serve the built SPA and handle client-side routing |
| [`docs/azure-setup-walkthrough.md`](docs/azure-setup-walkthrough.md) | Step-by-step Azure setup instructions |

### 10.2 Modified Files

| File | Change | Detail |
|------|--------|--------|
| [`Frontend/package.json`](Frontend/package.json) | Add `express` dependency and `start` script | `"express": "^4.21.0"` in dependencies, `"start": "node server.js"` in scripts |
| [`.github/workflows/main_weave-frontend.yml`](../.github/workflows/main_weave-frontend.yml) | Rewrite for App Service deployment | Replace SWA deploy with `azure/webapps-deploy@v3`, use Frontend OIDC secrets |
| [`engine/main.py`](engine/main.py) | Add CORS middleware | Import `CORSMiddleware`, configure `allow_origins` with `https://weave-ai.dev` and localhost variants |
| [`Frontend/src/config/index.ts`](Frontend/src/config/index.ts:1) | Update fallback URL | Change `http://localhost:5000` → `http://localhost:8000` to match actual Engine dev port |

### 10.3 Removed Files

| File | Reason |
|------|--------|
| [`netlify.toml`](netlify.toml) | Legacy — references lowercase `frontend` which is incorrect; replaced by Azure App Service |
| [`render.yaml`](render.yaml) | Legacy — references nonexistent `backend` directory; replaced by Azure App Service |

---

## 11. Deployment Sequence

The following order must be followed to avoid broken deployments:

```
Step 1: Create Azure App Service for Frontend
        Verify: App Service default hostname is accessible

Step 2: Add CORS middleware to engine/main.py
        Verify: Local CORS test passes

Step 3: Push engine/main.py change to main
        Verify: Engine deployment completes, CORS headers present on live API

Step 4: Add DNS records at name.com
        Verify: dig weave-ai.dev and dig engine.weave-ai.dev resolve

Step 5: Configure custom domains in Azure Portal
        Verify: Both domains validate and SSL certificates provision

Step 6: Create OIDC federated credential for Frontend
        Verify: Federated credential appears in Frontend Entra ID app registration

Step 7: Create Frontend/server.js and update Frontend/package.json
        Verify: Express server runs locally with `npm start`

Step 8: Rewrite .github/workflows/main_weave-frontend.yml
        Verify: Workflow syntax is valid

Step 9: Create Frontend/.env.production
        Verify: Contains VITE_API_URL=https://engine.weave-ai.dev

Step 10: Update Frontend/src/config/index.ts fallback URL
         Verify: Fallback is http://localhost:8000

Step 11: Remove netlify.toml and render.yaml
         Verify: Files deleted, no references remain

Step 12: Push all Frontend changes to main
         Verify: App Service deployment workflow triggers and completes

Step 13: Verify production
         Verify: https://weave-ai.dev loads, API calls to https://engine.weave-ai.dev succeed
```

---

## 12. Verification Checklist

After all steps are complete, verify the production deployment:

- [ ] `https://weave-ai.dev` returns the React SPA
- [ ] `https://engine.weave-ai.dev/api/docs` returns the FastAPI Swagger UI
- [ ] Frontend can call Engine endpoints without CORS errors
- [ ] SSL certificates are valid for both domains
- [ ] GitHub Actions Frontend workflow succeeds on push to main
- [ ] GitHub Actions Engine workflow still succeeds on push to main
- [ ] `netlify.toml` and `render.yaml` are removed from the repository
