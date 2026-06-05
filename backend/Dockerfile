# ---- Build Stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy solution and project files for layer caching
COPY Weave.sln .
COPY src/Weave.Domain/Weave.Domain.csproj src/Weave.Domain/
COPY src/Weave.Application/Weave.Application.csproj src/Weave.Application/
COPY src/Weave.Infrastructure/Weave.Infrastructure.csproj src/Weave.Infrastructure/
COPY src/Weave.API/Weave.API.csproj src/Weave.API/

RUN dotnet restore

# Copy everything and build
COPY . .
RUN dotnet publish src/Weave.API/Weave.API.csproj -c Release -o /app/publish --no-restore

# ---- Runtime Stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Expose ports
EXPOSE 5000
EXPOSE 5001

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Weave.API.dll"]
