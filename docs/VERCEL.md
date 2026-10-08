# Vercel frontend, Render API and Aiven MySQL

The repository's vercel.json deploys only the React/Vite frontend. Express remains on Render and MySQL remains on Aiven. Root/client dependencies are installed; backend/mobile packages are not installed by this frontend build. The project root stays available for shared schemas and constants.

## Create the frontend first

1. Push the prepared commits to GitHub.
2. In Vercel choose Add New > Project and import this repository.
3. Leave Root Directory at the repository root. Do not select client: the root config and shared dependencies are needed.
4. Choose Vite and Node.js 24.x. The checked-in config supplies install command `npm ci && npm ci --prefix client`, build command `npm --prefix client run build`, output `client/dist` and SPA rewrites.
5. If the backend URL is already known, set VITE_API_URL to its exact HTTPS API URL including /api. Otherwise create the frontend now to obtain its Production domain, then configure the API after Render deploys. The UI can display, but login/data will not work until the API is connected.

Vercel can display separate preview/deployment and production domains. Use the stable production domain for backend CORS, not a changing preview URL.

## Connect the deployments

In Render, set FRONTEND_URL to the Vercel production origin, e.g. `https://your-project.vercel.app`, with no trailing slash or /api. Complete the Aiven credentials/CA and private JWT settings from [the backend guide](AIVEN_RENDER.md), then deploy Express. Verify its /api/health and /api/ready endpoints.

In Vercel's project Settings > Environment Variables, set:

```dotenv
VITE_API_URL=https://your-backend.onrender.com/api
```

Redeploy the frontend after changing this value; Vite embeds it at build time. Do not put DB credentials, JWT_SECRET, SMTP secrets or EXPO_ACCESS_TOKEN in Vercel frontend variables. This application calls Render directly, so no API proxy rewrite or Vercel backend function is configured.

Test Super Admin login, project/task reads and refreshing a nested /projects URL. The SPA rewrite serves index.html while keeping asset requests functional. A preview domain is not authorized by a production-only CORS origin; test from the configured production domain. The mobile API variable also points to the Render HTTPS URL with /api.

## Troubleshooting

- Build cannot resolve shared/zod: use repository-root Root Directory and the checked-in install/build commands.
- Page refresh returns 404: deploy the commit containing root vercel.json; it provides the SPA fallback.
- Browser login returns CORS denial: Render FRONTEND_URL must exactly match the stable Vercel production origin.
- Login receives HTML or calls the Vercel /api path: VITE_API_URL was missing or not rebuilt; set the Render API URL and redeploy.
- First API request times out on a sleeping free Render backend: check /api/ready and wait for startup. Reliable scheduled reminders need an always-running API or separately scheduled job.

Sources: [Vite SPA deployment](https://vercel.com/docs/frameworks/frontend/vite), [Vercel build configuration](https://vercel.com/docs/project-configuration/vercel-json), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Repository configuration is prepared; creating a Vercel project and publishing require the operator's account. No remote deployment is claimed by the local build check.
