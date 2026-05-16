# Azure Setup Walkthrough: Weave Frontend App Service

> **Status**: Production  
> **Last Updated**: 2026-05-16  
> **Audience**: Engineers setting up Azure resources for the Weave Frontend deployment

This walkthrough covers the complete setup of the Weave Frontend on Azure App Service, including resource creation, custom domain configuration, DNS setup, and OIDC federated credentials.

---

## Part 1: Create Azure App Service for Frontend

### 1.1 Navigate to App Service Creation

1. Go to the [Azure Portal](https://portal.azure.com)
2. Search for **"App Services"** in the top search bar
3. Click **"Create"** → **"Web App"**

### 1.2 Configure Basics Tab

| Field | Value | Notes |
|-------|-------|-------|
| **Subscription** | (Your Azure subscription) | Use the same subscription as the Engine |
| **Resource Group** | (Same as Engine — e.g., `rg-weave` or `weave-python-engine_group`) | Find this by navigating to the Engine's App Service and checking its Overview page |
| **Name** | `Weave-Frontend` | This will be part of the default URL: `https://Weave-Frontend.azurewebsites.net` |
| **Runtime stack** | **Node.js 22 LTS** | Select from the dropdown |
| **Operating System** | **Linux** | Node.js on Linux is recommended over Windows for cost and performance |
| **Region** | **Italy North** | Must match the Engine's region to minimize latency between frontend and API |
| **Linux Plan** | Create new or use existing | If creating new, name it `asp-weave-frontend` |
| **Pricing tier** | **B1 (Basic)** | ~$13/month. F1 (Free) is also available for testing but limited to 60 CPU minutes/day |

### 1.3 Review and Create

1. Click **"Review + Create"**
2. Verify all settings
3. Click **"Create"**
4. Wait for deployment to complete (usually 1-2 minutes)
5. Click **"Go to resource"**

### 1.4 Verify Default Hostname

After creation, you should see the App Service Overview page. Verify the default URL is accessible:

```
https://Weave-Frontend.italynorth-01.azurewebsites.net/
```

> At this point, the URL will show a default "Hey, Node developers!" page since we haven't deployed our app yet. This is expected.

---

## Part 2: Configure App Service Settings

### 2.1 General Settings

1. Navigate to **App Service** → `Weave-Frontend` → **Settings** → **Configuration**
2. Click the **"General settings"** tab
3. Configure:

| Setting | Value | Notes |
|---------|-------|-------|
| **Startup Command** | `node server.js` | This tells Azure to run our Express server |
| **Minimum TLS Version** | `1.2` | Industry standard |
| **Web sockets** | `Off` | Not needed for REST API |

### 2.2 Application Settings

In the **"Application settings"** tab, add these settings:

| Name | Value | Purpose |
|------|-------|---------|
| `PORT` | `8080` | Express server listens on this port (Azure passes this as env var) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Enables Oryx build engine to restore `npm install` on deploy |
| `WEBSITE_NODE_DEFAULT_VERSION` | `22.x` | Ensures Node.js 22 is used |

**To add a setting**:
1. Click **"New application setting"**
2. Enter the **Name** and **Value**
3. Click **"OK"**
4. Repeat for each setting
5. Click **"Save"** at the top (this may trigger a restart)

### 2.3 Enable Logging (Optional, for Troubleshooting)

1. Navigate to **App Service** → `Weave-Frontend` → **Monitoring** → **App Service logs**
2. Set **"Application Logging (Filesystem)"** to **On**
3. Set **Level** to **Verbose**
4. Click **Save**

---

## Part 3: Configure Custom Domain `weave-ai.dev`

### 3.1 Add Custom Domain in Azure

1. Navigate to **App Service** → `Weave-Frontend` → **Settings** → **Custom domains**
2. Click **"Add custom domain"**
3. In the dialog:
   - **Domain**: Enter `weave-ai.dev`
   - **TLS/SSL certificate**: Select "App Service Managed" (free)
4. Azure will display **DNS validation records** that you must add at name.com:
   - **TXT record**: Host `_dnsauth.weave-ai.dev`, Value: (a validation token)
   - **A record** or **CNAME**: For the root domain

### 3.2 Add DNS Records at name.com

1. Log in to [name.com](https://name.com)
2. Go to **"My Domains"** → Click **"Manage"** on `weave-ai.dev`
3. Click **"DNS Records"**

#### Add TXT Validation Record

1. Click **"Add Record"**
2. Type: **TXT**
3. Host: `_dnsauth.weave-ai.dev`
4. Value: (paste the validation token from Azure)
5. TTL: 300 (default)
6. Click **"Add Record"**

#### Add Host Record (CNAME or A)

For a root domain (`weave-ai.dev`), you have two options:

**Option A: A Record (Recommended for root domain)**
1. Type: **A**
2. Host: `@` (represents the root)
3. Value: (the App Service inbound IP address — shown in the Azure custom domain dialog)
4. TTL: 300
5. Click **"Add Record"**

**Option B: CNAME (if name.com supports CNAME flattening at apex)**
1. Type: **CNAME**
2. Host: `@`
3. Value: `Weave-Frontend.italynorth-01.azurewebsites.net`
4. TTL: 300
5. Click **"Add Record"**

> **Note**: Many DNS providers do not allow CNAME records at the apex (root domain). If name.com rejects the CNAME for `@`, use the A record instead. Azure provides the IP address during custom domain setup.

### 3.3 Validate Domain in Azure

1. Back in Azure Portal, click **"Validate"**
2. Azure will check if the DNS records have propagated
3. DNS propagation can take from a few minutes to 48 hours
4. Once validated, click **"Add"**
5. Azure will provision a free managed SSL certificate

### 3.4 SSL Binding

After validation, SSL should be configured automatically:

1. In **Custom domains**, verify `weave-ai.dev` shows **SSL state**: `Secure`
2. If not, click **"Add binding"**:
   - TLS/SSL type: **App Service Managed**
   - Click **"Add"**

---

## Part 4: Configure Custom Domain `engine.weave-ai.dev` on Engine App Service

### 4.1 Add Custom Domain

1. Navigate to **App Service** → `weave-python-engine` → **Settings** → **Custom domains**
2. Click **"Add custom domain"**
3. Enter `engine.weave-ai.dev`
4. Azure provides:
   - **TXT record** for validation: Host `_dnsauth.engine.weave-ai.dev`
   - **CNAME target**: `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net`

### 4.2 Add DNS Records at name.com

1. Go back to name.com DNS records for `weave-ai.dev`

**Add CNAME for Engine:**
1. Click **"Add Record"**
2. Type: **CNAME**
3. Host: `engine`
4. Value: `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net`
5. TTL: 300
6. Click **"Add Record"**

**Add TXT Validation for Engine:**
1. Click **"Add Record"**
2. Type: **TXT**
3. Host: `_dnsauth.engine`
4. Value: (the validation token from Azure)
5. TTL: 300
6. Click **"Add Record"**

### 4.3 Validate and SSL

1. Back in Azure, click **"Validate"**
2. Once validated, click **"Add"**
3. SSL certificate will be provisioned automatically

### 4.4 Final DNS Records Summary

After all records are added, your name.com DNS should look like:

| Type | Host | Value |
|------|------|-------|
| A | `@` | (Frontend App Service IP) |
| TXT | `_dnsauth` | (Frontend validation token) |
| CNAME | `engine` | `weave-python-engine-hegma8f3gvafg4c4.italynorth-01.azurewebsites.net` |
| TXT | `_dnsauth.engine` | (Engine validation token) |

---

## Part 5: Set Up OIDC Federated Credentials

The Frontend deployment uses OIDC (OpenID Connect) federated credentials to authenticate with Azure from GitHub Actions — no stored secrets required.

### 5.1 Find the Frontend App Registration

The Frontend uses its own Entra ID app registration, separate from the Engine:

1. Go to **Azure Portal** → **Microsoft Entra ID** → **Manage** → **App registrations**
2. Search for the app registration with Client ID: **DC85BF21FBC44F7E9124E5579313D5DB**
3. If it doesn't exist, you may need to create it:
   - Click **"New registration"**
   - Name: `weave-frontend-deployment`
   - Supported account types: **"Workforce tenant (Current directory - Default Directory only)"**
   - Click **"Register"**
   - Note the **Application (client) ID** (this should be the DC85... value)

### 5.2 Create Federated Credential

1. In the app registration, click **"Certificates & secrets"** → **"Federated credentials"**
2. Click **"Add credential"**
3. Select scenario: **"GitHub Actions deploying Azure resources"**
4. Fill in:

| Field | Value |
|-------|-------|
| **Organization** | (Your GitHub org name, e.g., `weave-ai`) |
| **Repository** | `Weave` |
| **Entity type** | `Environment` |
| **GitHub environment name** | `production` |
| **Name** | `weave-frontend-appservice-deploy` |
| **Audience** | `api://AzureADTokenExchange` |

5. Click **"Add"**

### 5.3 Add GitHub Secrets

Three secrets must exist in the GitHub repository. They should already be configured if the OIDC setup was completed:

1. Go to **GitHub** → **Weave repo** → **Settings** → **Secrets and variables** → **Actions**
2. Verify these secrets exist (they should already be present):

| Secret Name | Value (from App Registration) |
|-------------|------------------------------|
| `AZUREAPPSERVICE_CLIENTID_DC85BF21FBC44F7E9124E5579313D5DB` | Application (client) ID |
| `AZUREAPPSERVICE_TENANTID_2E3A69A375064DA0865F8971AD890B79` | Directory (tenant) ID |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_454C1786A1924197B41EF76FD3FE5240` | Azure Subscription ID |

3. If any are missing, add them manually from the Azure Portal:
   - **Client ID**: From the App Registration overview page
   - **Tenant ID**: From Microsoft Entra ID → Overview → Tenant ID
   - **Subscription ID**: From Subscriptions → Your subscription → Subscription ID

---

## Part 6: Verify Deployment

### 6.1 Push Changes to Trigger Workflow

1. Make a change to any file under `Frontend/`
2. Commit and push to the `main` branch
3. Go to **GitHub** → **Weave repo** → **Actions**
4. Verify the workflow **"Build and deploy Node.js app to Azure Web App - Weave-Frontend"** is triggered

### 6.2 Monitor Workflow Execution

The workflow has two jobs:
1. **build** — Runs `npm ci` and `npm run build`, uploads artifact
2. **deploy** — Downloads artifact, logs into Azure via OIDC, deploys to App Service

Both jobs should complete successfully. Common failures and solutions are covered in [Part 7](#part-7-troubleshooting).

### 6.3 Verify Production Endpoints

After successful deployment:

1. **Frontend**: Visit `https://weave-ai.dev`
   - Should load the React SPA
   - React Router should handle client-side navigation (e.g., `/login`, `/dashboard`, `/studio`)
   - If you see a blank page, check the browser console for errors

2. **Engine**: Visit `https://engine.weave-ai.dev/api/docs`
   - Should load the FastAPI Swagger UI
   - Try a test endpoint like `/api/health` (if available)

3. **Cross-origin API calls**:
   - Open browser DevTools → Console tab
   - Verify no CORS errors appear when the Frontend calls the Engine
   - If CORS errors appear, check the Engine's CORS configuration

### 6.4 Check App Service Logs

If the deployment succeeds but the app doesn't load:

1. **Azure Portal**: App Service → `Weave-Frontend` → **Monitoring** → **Log stream**
2. Look for errors from the Express server startup
3. Common issues:
   - `Cannot find module 'express'` → Oryx didn't run `npm install` (check `SCM_DO_BUILD_DURING_DEPLOYMENT`)
   - `EADDRINUSE` → Port conflict (check `PORT` env var)
   - `Cannot find './dist/index.html'` → Build didn't produce `dist/` folder

---

## Part 7: Troubleshooting

### 7.1 Oryx Build Failures

**Symptom**: Deployment succeeds but app shows default page or 500 error.
**Cause**: Oryx (Azure's build engine) failed to restore dependencies.

**Solutions**:
1. Verify `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true` in App Settings
2. Check deployment logs in GitHub Actions for Oryx errors
3. Ensure `package-lock.json` is committed to the repository
4. Verify `server.js` exists in the root of the deployment package

### 7.2 DNS Propagation Delays

**Symptom**: Domain shows Azure validation page or doesn't resolve.
**Cause**: DNS records haven't propagated.

**Solutions**:
1. Use `nslookup weave-ai.dev` or `dig weave-ai.dev` to check current resolution
2. DNS can take up to 48 hours, but typically propagates within 1-2 hours
3. Verify the exact record values match what Azure provided
4. Check for typos in the host names (e.g., `_dnsauth.weave-ai.dev` vs `_dnsauth`)

### 7.3 CNAME vs A Record for Root Domain

**Symptom**: Azure custom domain validation fails for `weave-ai.dev`.
**Cause**: Root domains cannot use CNAME per DNS standards.

**Solutions**:
1. Use an **A record** pointing to the App Service's inbound IP address instead of CNAME
2. The inbound IP is shown in Azure during custom domain setup
3. If your DNS provider supports CNAME flattening (ALIAS/ANAME records), use that instead

### 7.4 SPA Routing Not Working

**Symptom**: `https://weave-ai.dev` loads, but navigating to `https://weave-ai.dev/dashboard` shows a 404.
**Cause**: Azure App Service doesn't know about client-side routes.

**Solution**: The Express server in [`Frontend/server.js`](Frontend/server.js) handles this:

```javascript
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

This catch-all route serves `index.html` for any non-static-file request, letting React Router handle the routing.

**Verify**:
1. SSH into the App Service (or check via Kudu console)
2. Verify `server.js` exists and contains the catch-all route
3. Verify the Startup Command is set to `node server.js`

### 7.5 CORS Errors

**Symptom**: Frontend loads but API calls fail with CORS errors in the browser console.
**Cause**: The Engine doesn't include `https://weave-ai.dev` in its allowed origins.

**Solution**: Add CORS middleware to the Engine (see [Section 7 of deployment-architecture.md](deployment-architecture.md#7-cors-configuration)):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:8000",
        "https://weave-ai.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 7.6 OIDC Authentication Failures

**Symptom**: GitHub Actions `azure/login@v2` step fails with "authentication failed".
**Cause**: Federated credential is missing or misconfigured.

**Solutions**:
1. Verify the federated credential exists in the correct Entra ID app registration
2. Verify the credential uses the correct **Entity type** (`Environment`) and **GitHub environment name** (`production`)
3. Verify the GitHub environment `production` exists in the repository settings
4. Check that the three OIDC secrets match the Entra ID app registration values

### 7.7 App Service Returns 500 Internal Server Error

**Symptom**: Deployment succeeds, but the app returns a 500 error.
**Cause**: Server-side error in the Express application.

**Solutions**:
1. Check App Service Log Stream: **App Service** → `Weave-Frontend` → **Monitoring** → **Log stream**
2. Common Node.js errors:
   - Missing `node_modules` (Oryx didn't run)
   - Module not found (e.g., `express` not installed)
   - Syntax error in `server.js`
3. To debug locally, run the same steps as the CI pipeline:
   ```bash
   cd Frontend
   npm ci
   npm run build
   node server.js
   ```

---

## Appendix: Useful Azure CLI Commands

These commands can be run from the [Azure Cloud Shell](https://shell.azure.com) for quick setup and troubleshooting.

### Create App Service (alternative to Portal)
```bash
az webapp create \
  --resource-group rg-weave \
  --plan asp-weave-frontend \
  --name Weave-Frontend \
  --runtime "NODE:20-lts" \
  --sku B1 \
  --assign-identity
```

### Configure App Settings
```bash
az webapp config appsettings set \
  --resource-group rg-weave \
  --name Weave-Frontend \
  --settings \
    PORT=8080 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITE_NODE_DEFAULT_VERSION=20.x
```

### Set Startup Command
```bash
az webapp config set \
  --resource-group rg-weave \
  --name Weave-Frontend \
  --startup-file "node server.js"
```

### View Logs (streaming)
```bash
az webapp log tail \
  --resource-group rg-weave \
  --name Weave-Frontend
```

### Get Inbound IP for A Record
```bash
az webapp show \
  --resource-group rg-weave \
  --name Weave-Frontend \
  --query outboundIpAddresses \
  --output tsv
```

---
