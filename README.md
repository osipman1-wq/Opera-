# AllHub

AllHub is a standalone AI publisher for generating articles, eBooks, and stories.

## Run locally

1. Install dependencies with `npm install`.
2. Add `GEMINI_API_KEY` to your environment or Replit Secrets.
3. Start the server with `npm run dev`.

The app and API are served from the same origin. The generation endpoints are:

- `POST /api/generate-article`
- `POST /api/generate-ebook`
- `POST /api/generate-story`