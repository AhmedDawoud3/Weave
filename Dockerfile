# =========================================================
# Stage 1: Build the React (Vite) Frontend
# =========================================================
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

# Copy dependency definitions and install
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source code and compile
COPY frontend/ ./
# We set VITE_API_URL to empty to make API requests relative (same-origin)
ENV VITE_API_URL=""
RUN npm run build

# =========================================================
# Stage 2: Build the .NET Backend & Bundle Frontend
# =========================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS backend-build
WORKDIR /src

# Copy solution and project files for layer caching
COPY backend/Weave.sln ./backend/
COPY backend/src/Weave.Domain/Weave.Domain.csproj ./backend/src/Weave.Domain/
COPY backend/src/Weave.Application/Weave.Application.csproj ./backend/src/Weave.Application/
COPY backend/src/Weave.Infrastructure/Weave.Infrastructure.csproj ./backend/src/Weave.Infrastructure/
COPY backend/src/Weave.API/Weave.API.csproj ./backend/src/Weave.API/

RUN dotnet restore backend/Weave.sln

# Copy the rest of the backend source code
COPY backend/ ./backend/

# Copy the built frontend static files from Stage 1 into the .NET API's wwwroot directory
COPY --from=frontend-build /frontend/dist/ ./backend/src/Weave.API/wwwroot/

# Publish the backend (which now bundles the frontend in wwwroot)
RUN dotnet publish backend/src/Weave.API/Weave.API.csproj -c Release -o /app/publish --no-restore

# =========================================================
# Stage 3: Production Runtime
# =========================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS runtime
WORKDIR /app
COPY --from=backend-build /app/publish .

# Expose ports 8080 and 80 for maximum compatibility
EXPOSE 8080
EXPOSE 80
ENV ASPNETCORE_URLS=http://+:8080;http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Weave.API.dll"]


