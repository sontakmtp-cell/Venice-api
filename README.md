# Venice Image-to-Video MVP

A small Next.js application for creating private image-to-video jobs with the Venice API.

## Features

- Upload a JPG, PNG, or WebP reference image.
- Enter a motion prompt and a negative prompt.
- Choose duration, resolution, and aspect ratio options.
- Queue the `grok-imagine-image-to-video-private` model.
- Store the `queue_id` and `download_url` locally.
- Poll the job status every 5 seconds.
- Download the generated video when the job completes.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- Next.js API routes to keep `VENICE_API_KEY` on the server

## Key Files

- `src/app/page.tsx`: single-page user interface
- `src/app/api/video/queue/route.ts`: queues a Venice video job
- `src/app/api/video/status/route.ts`: polls Venice job status
- `src/app/api/video/download/route.ts`: proxies `.mp4` downloads from `download_url`
- `src/app/api/video/recover/route.ts`: recovers a video by `queue_id`
- `src/lib/venice.ts`: shared constants, types, and helpers

## Local Setup

1. Create `.env.local`.
2. Add your Venice API key:

```env
VENICE_API_KEY=your_venice_api_key_here
```

3. Install dependencies if needed:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Upload one JPG, PNG, or WebP image.
2. Write a concise motion prompt focused on movement.
3. For an initial test, choose `5s`, `720p`, and `9:16`.
4. Click `Create Video`.
5. Wait for automatic polling, or click `Check Status`.
6. When the status is `completed`, click `Download Video`.

## Notes

- Venice returns `download_url` once when the job is queued, so the app stores it immediately in state and `localStorage`.
- Polling runs every 5 seconds.
- The download route only accepts HTTPS URLs from `venice.ai` domains to reduce arbitrary proxy risk.
- This MVP does not include a database, authentication, or multi-user job history.

## Reference

- [Video Queue API](https://docs.venice.ai/api-reference/endpoint/video/queue)
- [Video Generation Guide](https://docs.venice.ai/overview/guides/video-generation)
