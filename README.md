# Escort Site

A simple Node + Express app for serving and updating escort site content from JSON, with support for file uploads and a static front-end.

## Features

- Express server with CORS and dotenv support
- JSON-based content storage (`data/site-content.json`)
- File uploads to `/uploads` via Multer
- Static HTML front-end (`index.html`, `demo.html`, `demo-royal.html`)

## Tech Stack

- Node.js (CommonJS)
- Express
- Multer
- dotenv
- cors

## Project Structure

```text
.
├─ data/
│  └─ site-content.json      # Main content JSON
├─ public/                   # (Optional) static assets
├─ uploads/                  # Uploaded files (ignored in git by default)
├─ index.html                # Main static page
├─ demo.html                 # Demo layout
├─ demo-royal.html           # Alternate demo layout
├─ server.js                 # Express server
├─ package.json
├─ .env.example              # Example environment configuration
└─ README.md
