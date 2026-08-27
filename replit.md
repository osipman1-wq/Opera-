# AllHub - Standalone AI Publisher

## Project Overview
AllHub is a standalone Node.js and Express app for generating publication-ready articles, structured eBooks, and multi-part stories.

## Tech Stack
- **Frontend**: Plain HTML, CSS, and browser JavaScript
- **Backend**: Node.js + Express
- **AI**: Google Gemini through the server-side `@google/genai` package

## Project Structure
- `index.html` - Single-page publisher UI
- `style.css` - UI styles
- `server.js` - Express entry point and static file server
- `controllers/` - Article, eBook, and story request handlers
- `routes/` - API route definitions
- `services/ai.js` - Gemini prompts and response parsing
- `utils/fetchSource.js` - Optional readable-text extraction from reference URLs

## Development
- Run: `npm run dev` (starts on port 5000)
- Production: `npm start`
- Package manager: npm

## Environment Variables
- `GEMINI_API_KEY` - Server-side Gemini key required for generation
- `PORT` - Server port (defaults to 5000)

## API
- `POST /api/generate-article`
- `POST /api/generate-ebook`
- `POST /api/generate-story`

## Deployment
- Target: autoscale
- Run: `node server.js`
