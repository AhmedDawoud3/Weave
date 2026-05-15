# Weave Azure Deployment Architecture

> **Status**: Proposed  
> **Last Updated**: 2026-05-15  
> **Audience**: Engineers setting up Azure resources and CI/CD pipelines

---

## 1. Overview

Weave consists of two deployable components hosted on Azure:

| Component | Stack | Azure Service | Custom Domain |
|-----------|-------|---------------|---------------|
| Frontend | React + TypeScript + Vite SPA | Azure Static Web Apps | `weave-ai.dev` |
| Engine | Python FastAPI + uvicorn | Azure App Service | `engine.weave-ai.dev` |

The Engine is already deployed to Azure App Service in the Italy North region. This document covers the full production deployment architecture, including the new Frontend hosting strategy, custom domain configuration, DNS setup, CI/CD pipeline design, and CORS policy.

---

## 2. Architecture Diagram

```
                          name.com DNS
                               |
               +---------------+---------------+
               |                               |
        weave-ai.dev                   engine.weave-ai.dev
               |                               |
               v                               v
    +----------------------+        +--------------------------+
    | Azure Static Web Apps|        | Azure App Service        |
    | - Global CDN         |        | - weave-python-engine    |
    | - Free Tier          |        | - Italy North region     |
    | - Automatic SSL      |        | - Automatic SSL          |
    | - SPA Routing        |        | - Python 3.13            |
    +----------------------+        +--------------------------+
               |                               |
               |  HTTPS API calls              |
               +------> /validate_pipeline ----+
               +------> /infer/layer ----------+
               +------> /datasets/* -----------+
                       CORS: allow weave-ai.dev


  GitHub Actions CI/CD
  ====================

  Push to main
       |
       +-- paths: Frontend/** ---> Build + Deploy to SWA
       |
       +-- paths: engine/** -----> Build + Deploy to App Service
                                       |
                                       +-- OIDC federated credentials
                                           (no stored secrets)
```

---

## 3. Azure Static Web Apps for Frontend

### 3.1 Decision Rationale

Azure Static Web Apps is the correct hosting choice for the Weave Frontend for the following reasons:

| Factor | Azure SWA | Alternative: Azure App Service | Alternative: Netlify |
|--------|-----------|--------------------------------|----------------------|
| Cost | Free tier sufficient for SPA | B1 minimum ~$55/mo | Free tier available |
| Global CDN | Built-in, no config | Requires Front Door extra cost | Built-in |
| Automatic SSL | Free, managed | Free, managed | Free, managed |
| Custom domains | Supported on free tier | Supported | Supported |
| SPA routing | Built-in fallback rules | Requires manual web.config | Built-in `_redirects` |
| GitHub Actions | Native integration, auto-generates workflow | Manual workflow setup | Native integration |
| Auth integration | Built-in Easy Auth | Manual setup | None built-in |

**Key reasons SWA wins over Netlify**: The existing [`netlify.toml`](netlify.toml) has a bug — it references lowercase `frontend` but the actual directory is `Frontend`. This caused deployment failures. Moving to Azure consolidates both services on one cloud platform, eliminates cross-provider complexity, and leverages the same OIDC federated identity pattern already proven with the Engine deployment.

### 3.2 SWA Configuration

- **Resource name**: `weave-frontend-swa`
- **Region**: West Europe 2 closest to Italy North Engine
- **SKU**: Free tier
- **App location**: `/Frontend`
- **Output location**: `dist`
- **Build command**: `npm ci && npm run build`

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
| CNAME | `weave-ai.dev` or `@` | `<swa-default-hostname>.azurestaticapps.net` | Frontend — Azure SWA provides the target hostname after resource creation |
| CNAME | `engine` | `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net` | Engine — subdomain for API backend |
| TXT | `_dnsauth.weave-ai.dev` | `<validation-token-from-azure>` | Domain ownership validation for SWA |
| TXT | `_dnsauth.engine.weave-ai.dev` | `<validation-token-from-azure>` | Domain ownership validation for App Service |

### 5.2 Step-by-step DNS Setup

1. **Create the Azure SWA resource first** — Azure will provide the default hostname and validation token
2. **Log into name.com** → Manage `weave-ai.dev` → DNS Records
3. **Add CNAME for Frontend**:
   - Type: CNAME
   - Host: `@` or leave blank for apex domain — see apex domain note below
   - Value: the SWA default hostname shown in Azure Portal
4. **Add TXT validation for Frontend**:
   - Type: TXT
   - Host: `_dnsauth`
   - Value: the validation token from Azure SWA custom domain setup
5. **Add CNAME for Engine**:
   - Type: CNAME
   - Host: `engine`
   - Value: `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net`
6. **Add TXT validation for Engine**:
   - Type: TXT
   - Host: `_dnsauth.engine`
   - Value: the validation token from App Service custom domain setup

> **Apex Domain Note**: For `weave-ai.dev` as an apex domain without a subdomain, Azure SWA supports apex domain mapping. If name.com does not support CNAME flattening at the apex, you may need to use an A record or ALIAS record instead. Azure SWA will provide the specific instructions during custom domain setup.

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
       |                                +-- Deploy: Azure/static-web-apps-deploy@v1
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

**File**: `.github/workflows/main_weave-frontend.yml`

```yaml
name: Build and deploy Frontend to Azure Static Web Apps

on:
  push:
    branches:
      - main
    paths:
      - 'Frontend/**'
  workflow_dispatch:

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Set production API URL
        run: echo "VITE_API_URL=https://engine.weave-ai.dev" >> $GITHUB_ENV

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          app_location: 'Frontend'
          api_location: ''          # No API function — backend is separate
          output_location: 'dist'
          skip_deploy_on_missing_secrets: true
```

**Key details**:

- **`VITE_API_URL`** is set as a GitHub Actions environment variable before the Oryx build runs. Vite embeds env vars at build time, so this must be present before `npm run build` executes.
- **`AZURE_STATIC_WEB_APPS_API_TOKEN`** is a deployment token generated by Azure when the SWA resource is created. It must be added as a GitHub secret.
- **OIDC federated credentials** must also be created for this workflow — see [Section 8](#8-azure-resource-setup-steps).

### 6.3 Engine Deployment Workflow — Existing

**File**: `.github/workflows/main_weave-python-engine.yml`

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

### 8.1 Create Azure Static Web App

1. Go to **Azure Portal** → **Create a resource** → **Static Web App**
2. Fill in:
   - **Name**: `weave-frontend-swa`
   - **Resource group**: Use the same group as the Engine or create `rg-weave`
   - **Region**: West Europe 2
   - **SKU**: Free
   - **Source**: GitHub
   - **Organization**: Your GitHub org
   - **Repository**: Weave
   - **Branch**: main
   - **App location**: `Frontend`
   - **Api location**: leave empty
   - **Output location**: `dist`
3. Click **Review + Create** → **Create**
4. After creation, Azure auto-generates a deployment token and a starter workflow. **Save the deployment token** — it must be added as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub Secrets.

### 8.2 Configure Custom Domain on SWA

1. Navigate to **Static Web App** → `weave-frontend-swa` → **Custom domains**
2. Click **Add** → Enter `weave-ai.dev`
3. Azure provides a TXT validation record and the CNAME target
4. Add the DNS records at name.com — see [Section 5](#5-dns-configuration-at-namecom)
5. Wait for DNS propagation — click **Validate** in Azure
6. Once validated, the domain is active with automatic SSL

### 8.3 Configure Custom Domain on App Service

1. Navigate to **App Service** → `weave-python-engine` → **Custom domains**
2. Click **Add custom domain** → Enter `engine.weave-ai.dev`
3. Azure provides validation records
4. Add DNS records at name.com — see [Section 5](#5-dns-configuration-at-namecom)
5. Validate and confirm — SSL is automatic

### 8.4 Create OIDC Federated Credentials for SWA Deployment

The Engine deployment already uses OIDC. A new federated credential must be created for the Frontend workflow:

1. Go to **Azure Portal** → **Microsoft Entra ID** → **App registrations**
2. Find the existing app registration used for the Engine OIDC — the one with Client ID `0CE1FFF3F97F4036B411E2D9FA15C49E`
3. Click **Federated credentials** → **Add credential**
4. Fill in:
   - **Scenario**: GitHub Actions deploying Azure resources
   - **Organization**: Your GitHub org
   - **Repository**: Weave
   - **Entity type**: Branch
   - **Entity**: main
   - **Name**: `weave-frontend-swa-deploy`
5. Click **Add**

> **Note**: The same Entra ID app registration and the same three OIDC secrets can be reused for the Frontend deployment. Only a new federated credential entry is needed.

### 8.5 Add GitHub Secrets

Add the SWA deployment token to the GitHub repository:

1. Go to **GitHub** → **Weave repo** → **Settings** → **Secrets and variables** → **Actions**
2. Add: `AZURE_STATIC_WEB_APPS_API_TOKEN` = the token from step 8.1
3. The existing OIDC secrets are already configured and shared

---

## 9. SSL/TLS

Both Azure services provide automatic managed SSL certificates for custom domains:

| Service | SSL Provider | Auto-renewal | Cost |
|---------|-------------|-------------|------|
| Azure Static Web Apps | Azure managed | Yes | Free |
| Azure App Service | App Service managed | Yes | Free |

No manual certificate procurement or renewal is required. Azure provisions the certificate after DNS validation completes.

---

## 10. File Changes Required

### 10.1 New Files

| File | Purpose |
|------|---------|
| `.github/workflows/main_weave-frontend.yml` | Frontend CD pipeline — build and deploy to Azure SWA |
| `Frontend/.env.production` | Production environment variable: `VITE_API_URL=https://engine.weave-ai.dev` |

### 10.2 Modified Files

| File | Change | Detail |
|------|--------|--------|
| [`engine/main.py`](engine/main.py) | Add CORS middleware | Import `CORSMiddleware`, configure `allow_origins` with `https://weave-ai.dev` and localhost variants |
| [`Frontend/src/config/index.ts`](Frontend/src/config/index.ts:1) | Update fallback URL | Change `http://localhost:5000` → `http://localhost:8000` to match actual Engine dev port |

### 10.3 Removed Files

| File | Reason |
|------|--------|
| [`netlify.toml`](netlify.toml) | Legacy — references lowercase `frontend` which is incorrect; SWA replaces Netlify |
| [`render.yaml`](render.yaml) | Legacy — references nonexistent `backend` directory; Azure App Service replaces Render |

---

## 11. Deployment Sequence

The following order must be followed to avoid broken deployments:

```
Step 1: Create Azure SWA resource
        Verify: SWA default hostname is accessible

Step 2: Add CORS middleware to engine/main.py
        Verify: Local CORS test passes

Step 3: Push engine/main.py change to main
        Verify: Engine deployment completes, CORS headers present on live API

Step 4: Add DNS records at name.com
        Verify: dig weave-ai.dev and dig engine.weave-ai.dev resolve

Step 5: Configure custom domains in Azure Portal
        Verify: Both domains validate and SSL certificates provision

Step 6: Create OIDC federated credential for SWA
        Verify: Federated credential appears in Entra ID app registration

Step 7: Add AZURE_STATIC_WEB_APPS_API_TOKEN to GitHub Secrets
        Verify: Secret exists in repo settings

Step 8: Create .github/workflows/main_weave-frontend.yml
        Verify: Workflow syntax is valid

Step 9: Create Frontend/.env.production
        Verify: Contains VITE_API_URL=https://engine.weave-ai.dev

Step 10: Update Frontend/src/config/index.ts fallback URL
         Verify: Fallback is http://localhost:8000

Step 11: Remove netlify.toml and render.yaml
         Verify: Files deleted, no references remain

Step 12: Push all Frontend changes to main
         Verify: SWA deployment workflow triggers and completes

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