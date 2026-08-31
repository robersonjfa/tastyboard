-- Adds a media type for videos embedded by URL (YouTube), as opposed to
-- files uploaded to Cloudinary (which use IMAGE/VIDEO).
ALTER TYPE "media_type" ADD VALUE 'YOUTUBE';
