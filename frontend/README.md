# Getravio Frontend - Phase 0

Simple React + TypeScript + Tailwind CSS frontend for body simulation visualization.

## Features

- Login (manual access control)
- Image upload with region/scenario selection
- Side-by-side comparison (3 images: Original + 2 Simulations)
- Job history tracking
- Job status monitoring (queued, processing, completed, failed)

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool

## Structure

- `src/components/Login.tsx` - Authentication
- `src/components/Upload.tsx` - Simulation settings & controls
- `src/components/ImageComparison.tsx` - 3-image comparison view
- `src/components/JobHistory.tsx` - Job list & history

## Controllers

- **Region selector**: Gluteal region (Phase 0)
- **Scenario selector**: Projection levels 1-3
- **View selector**: Rear/Side view
- **File upload**: Image selection

## Integration

Frontend expects backend API endpoints:
- `POST /api/auth/login` - Authentication
- `POST /api/jobs` - Submit job
- `GET /api/jobs/:id` - Get job status
- `GET /api/jobs` - List jobs
