# Setup

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

## Installation

```bash
cd Frontend
npm install
```

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Available variables:

| Variable                 | Default                  | Description                                            |
|--------------------------|--------------------------|--------------------------------------------------------|
| `VITE_API_URL`           | `http://localhost:5000`   | Backend Engine API URL                                 |
| `VITE_GOOGLE_CLIENT_ID`  | `unconfigured-client-id` | OAuth Client ID from Google Cloud Console              |
| `VITE_FACEBOOK_APP_ID`   | `""`                     | OAuth App ID from Facebook Developers Portal           |

## Development

Start the Vite dev server with hot module replacement:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Build

Create a production build:

```bash
npm run build
```

Output is written to `Frontend/dist/`.

## Preview Production Build

```bash
npm run preview
```

## Run Tests

Execute the test suite once:

```bash
npm run test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

## Lint

```bash
npm run lint
```

## Type Checking

TypeScript checking is part of the build step (`tsc -b`). To check types without building:

```bash
npx tsc -b --noEmit
```
