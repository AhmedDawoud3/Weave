# Production Deployment Guide: Weave

This guide covers how to clean up the accidental Python container and deploy the true Weave architecture (Frontend, .NET Backend, and Nginx reverse proxy) onto a single Azure Linux Virtual Machine.

---

## 1. Cleanup Guide: Purging the Accidental Python Container

To prevent the accidental Python engine container from conflicting with your VM's native setup or wasting memory/CPU, run these commands on the Azure VM.

### Option A: If it was run via Docker Compose
If you spun up the engine container using the previous docker-compose files in a directory, navigate to that directory and run:
```bash
docker compose down --volumes --rmi all
```
*This stops the containers, removes them, deletes the volumes, and cleans up the built/downloaded images.*

### Option B: Raw Docker Cleanup Commands
If the container was run stand-alone or you want to ensure it is completely deleted manually:

1. **Find and stop the container:**
   ```bash
   # List all containers (active and inactive) to locate it
   docker ps -a
   
   # Stop the container (substitute container name/ID)
   docker stop weave-engine-1
   ```

2. **Remove the container:**
   ```bash
   docker rm weave-engine-1
   ```

3. **Delete the associated Docker image:**
   ```bash
   # Find the image ID/name (usually 'weave-engine' or 'engine')
   docker images
   
   # Remove the image
   docker rmi weave-engine:latest
   ```

4. **Purge dangling volumes and system caches:**
   ```bash
   # Remove unused volumes to save disk space
   docker volume prune -f
   
   # Run a general system prune to ensure all unused caches are gone
   docker system prune -a --volumes -f
   ```

---

## 2. File Directory Structure

Place the generated deployment files in your project directory on the Azure VM as follows:

```
/home/azureuser/weave/ (or your chosen project folder)
├── docker-compose.prod.yml
├── backend/
│   └── Dockerfile             # Existing backend multi-stage Dockerfile
├── frontend/
│   └── Dockerfile.prod        # Production-ready multi-stage Dockerfile
└── nginx/
    └── nginx.conf             # Production Nginx proxy configuration
```

- [docker-compose.prod.yml](file:///mnt/20EA0923EA08F736/Project/Weave/docker-compose.prod.yml) is placed in the root directory.
- [frontend/Dockerfile.prod](file:///mnt/20EA0923EA08F736/Project/Weave/frontend/Dockerfile.prod) is inside the `frontend` folder.
- [nginx/nginx.conf](file:///mnt/20EA0923EA08F736/Project/Weave/nginx/nginx.conf) is inside a newly created `nginx` folder.

---

## 3. Step-by-Step Deployment Instructions

Follow these steps to deploy Weave on the Azure Virtual Machine:

### Step 1: Install SSL Certificates (Certbot)
Before running Nginx on HTTPS (port 443), obtain a free SSL certificate from Let's Encrypt. On your Ubuntu/Debian Azure VM:
```bash
sudo apt update
sudo apt install certbot -y

# Obtain the certificate (verify ports 80/443 are open in Azure NSG first)
sudo certbot certonly --standalone -d weave-ai.dev -d www.weave-ai.dev
```
*This places certificates in `/etc/letsencrypt/live/weave-ai.dev/`, which is mounted into the Nginx container.*

### Step 2: Build and Run Services in Detached Mode
Run the following command in the project root to build the production images and launch them in the background (detached):
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- `-f docker-compose.prod.yml`: Explicitly targets our production compose file.
- `-d`: Runs containers in detached mode (background).
- `--build`: Forces rebuilding of the frontend and backend images to guarantee latest production outputs.

### Step 3: Verify Running Containers
Check that all three containers (`weave-nginx`, `weave-frontend`, and `weave-backend`) are active and running:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 4. How This Setup Eliminates CORS Issues

**CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that blocks web pages from making requests to a different domain, protocol, or port than the one that served the page (e.g. a page at `https://weave-ai.dev` hitting `https://api.weave-ai.dev` or `http://localhost:5000`). When this happens, the browser initiates a preflight request (`OPTIONS`) and blocks the transaction unless the backend explicitly responds with headers allowing that origin.

### Why CORS is Eliminated Here:
1. **Single Public Origin:** Since Nginx exposes ports 80 & 443 and serves as the single public entry point on `https://weave-ai.dev`, the browser sends **all requests** to this single domain.
2. **Same-Origin API Calls:** 
   - The React/Next.js/Vite frontend page is loaded from `https://weave-ai.dev/` (handled by Nginx routing `/` to `weave-frontend`).
   - The frontend's API calls are sent directly to the relative path `/api/...` (meaning they go to `https://weave-ai.dev/api/...`).
   - Nginx handles `/api/` by proxying it internally to `http://backend:5000`.
3. **No Cross-Origin Handshake:** Since the protocol (`https`), host (`weave-ai.dev`), and port (`443`) match perfectly, **both requests are same-origin**. The browser completely bypasses the CORS preflight check, eliminating CORS configuration complexity and improving API latency.
4. **Internal Network Resolution**: The backend container interacts with the natively hosted Python engine server-to-server (listening on port `8000` of the host gateway) via the environment variable `Engine__BaseUrl=http://172.17.0.1:8000`. Server-to-server HTTP requests are not governed by browser sandboxes and therefore never trigger CORS.

---

## 5. Native Python Engine Hosting & Azure VM NSG Integration

To fully support intensive training workloads, the Weave Python Engine runs natively on the Azure Virtual Machine host rather than inside a Docker container.

### Step A: Configure Azure Network Security Group (NSG)
To allow external traffic or integration with other VM services, open port `8000` (the default port for Weave Engine) in your Azure NSG:
1. Navigate to the **Azure Portal**.
2. Select your VM's **Network Security Group (NSG)**.
3. Add an **Inbound Security Rule**:
   - **Source**: `Any` (or restrict to your specific client IP / backend subnet for security)
   - **Source port ranges**: `*`
   - **Destination**: `Any`
   - **Destination port ranges**: `8000`
   - **Protocol**: `TCP`
   - **Action**: `Allow`
   - **Priority**: `300` (or another available priority)
   - **Name**: `Allow_Weave_Engine_8000`

### Step B: Set Up Systemd Service for Weave Engine
Running the engine with systemd ensures it automatically starts on boot, runs in the background, logs errors, and restarts on crashes.

1. **Create the service file:**
   ```bash
   sudo nano /etc/systemd/system/weave-engine.service
   ```

2. **Add the following configuration (replace `/home/azureuser/weave` with your repository path):**
   ```ini
   [Unit]
   Description=Weave Python Engine Service
   After=network.target

   [Service]
   Type=simple
   User=azureuser
   WorkingDirectory=/home/azureuser/weave/engine
   ExecStart=/home/azureuser/weave/engine/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
   Restart=always
   Environment=PYTHONUNBUFFERED=1

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service:**
   ```bash
   # Reload systemd configuration
   sudo systemctl daemon-reload

   # Enable service on boot
   sudo systemctl enable weave-engine

   # Start the service
   sudo systemctl start weave-engine
   ```

4. **Verify execution and view logs:**
   ```bash
   # Check service status
   sudo systemctl status weave-engine

   # Stream uvicorn logs
   journalctl -u weave-engine -f
   ```

### Step C: Docker-to-Host Communication
Since the backend is running inside a Docker bridge network, it cannot use `localhost:8000` to contact the host. In `docker-compose.prod.yml`, the environment variable `Engine__BaseUrl` is configured to `http://172.17.0.1:8000`.
- `172.17.0.1` represents the default Docker bridge gateway IP.
- This routes HTTP requests from the containerized C# backend to the natively listening Uvicorn engine process on the host.

---

## 6. Environment and Security Configuration

To secure communication between the .NET backend and the Python Engine, the engine requires requests to contain a valid `X-API-Key` header (except for public endpoints like `/health` and `/api/docs`).

### A. Local Development Configuration
For local development, you can control these settings using a `.env` file in the `engine/` directory.

1. **Creating the .env file:**
   Copy the example file:
   ```bash
   cp engine/.env.example engine/.env
   ```
2. **Configuration options:**
   - `WEAVE_ENGINE_API_KEY`: The secret key required to validate incoming requests.
   - `WEAVE_ENGINE_DISABLE_AUTH`: Set to `true` to disable auth checks in development, allowing you to test the endpoints directly without supplying header keys. Set to `false` to enforce checks.

### B. Systemd Service Configuration (Azure VM host)
When running the Python Engine natively on your Azure VM, you can secure it as follows:

1. **Using .env file (Recommended):**
   Place your `.env` file inside `/home/azureuser/weave/engine/`. Because the systemd service starts with `WorkingDirectory=/home/azureuser/weave/engine`, the python-dotenv package will automatically load these variables at startup.
2. **Alternative: Environment directive in systemd:**
   You can also specify the environment variables directly in the `/etc/systemd/system/weave-engine.service` file:
   ```ini
   [Service]
   ...
   Environment=PYTHONUNBUFFERED=1
   Environment=WEAVE_ENGINE_API_KEY=your-secure-production-api-key
   Environment=WEAVE_ENGINE_DISABLE_AUTH=false
   ```
   *Remember to reload and restart the service if you modify the service file:*
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart weave-engine
   ```

### C. Docker-compose Backend configuration
In production, the backend container passes the API key to its internal client through the `Engine__ApiKey` setting. This is configured in `docker-compose.prod.yml`:
```yaml
environment:
  - Engine__ApiKey=${WEAVE_ENGINE_API_KEY}
```
Ensure that `WEAVE_ENGINE_API_KEY` is exported on the host system or specified in a `.env` file in the root workspace directory before spinning up the containers:
```bash
# Create a .env file in the root workspace folder:
echo "WEAVE_ENGINE_API_KEY=your-secure-production-api-key" > .env
```

### D. GitHub Actions and Azure Web App Deployment
If you are deploying the Python Engine or backend via a GitHub workflow:

1. **GitHub Secret**:
   Create a new GitHub Repository Secret named `WEAVE_ENGINE_API_KEY` under **Settings > Secrets and variables > Actions**.
2. **Azure App Service Configuration**:
   When hosting on Azure App Service (Azure Web App), environment variables are managed via **Configuration** under the Azure portal. 
   - Add a new application setting named `WEAVE_ENGINE_API_KEY` and set its value to your secret key.
   - Add `WEAVE_ENGINE_DISABLE_AUTH` and set it to `false`.
3. **Injecting Secrets in Workflows**:
   You can configure/update Azure App Service app settings directly within your GitHub Deployment workflow step (e.g. `main_weave-python-engine.yml`) using the `azure/appservice-settings` action:
   ```yaml
   - name: Set Web App Settings
     uses: azure/appservice-settings@v1
     with:
       app-name: 'weave-python-engine'
       app-settings-json: |
         [
           {
             "name": "WEAVE_ENGINE_API_KEY",
             "value": "${{ secrets.WEAVE_ENGINE_API_KEY }}",
             "slotSetting": false
           },
           {
             "name": "WEAVE_ENGINE_DISABLE_AUTH",
             "value": "false",
             "slotSetting": false
           }
         ]
   ```


