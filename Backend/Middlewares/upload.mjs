import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const DIGITAL_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/epub+zip',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'text/plain',
  'text/csv',
]);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.avi', '.mkv', '.webm', '.mpeg', '.mpg', '.3gp', '.ogv', '.wmv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z']);
const DOCUMENT_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.epub',
]);
const DIGITAL_EXTENSIONS = new Set([
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
]);

const fileFilter = (_, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const digitalFileFilter = (_, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const extension = path.extname(file.originalname || '').toLowerCase();
  const allowedByMime =
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('image/') ||
    DIGITAL_MIME_TYPES.has(mime);
  const allowedByExtension = DIGITAL_EXTENSIONS.has(extension);

  if (allowedByMime || allowedByExtension) cb(null, true);
  else cb(new Error('Only supported digital files are allowed'), false);
};

const createStorage = (folder) => new CloudinaryStorage({
  cloudinary,
  params: {
    folder,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  },
});

const createUploader = (folder) => multer({
  storage: createStorage(folder),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const tempStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, os.tmpdir()),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname || '')}`),
});

const MEGABYTE = 1024 * 1024;
const readPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const DIGITAL_UPLOAD_MAX_MB = readPositiveInteger(process.env.DIGITAL_UPLOAD_MAX_MB, 100);
const DIGITAL_UPLOAD_MAX_BYTES = DIGITAL_UPLOAD_MAX_MB * MEGABYTE;
const CLOUDINARY_CHUNK_SIZE_BYTES = Math.max(
  5,
  readPositiveInteger(process.env.CLOUDINARY_UPLOAD_CHUNK_MB, 20)
) * MEGABYTE;
const LARGE_UPLOAD_THRESHOLD_BYTES = 90 * MEGABYTE;

const resolveResourceType = (file) => {
  const mime = (file.mimetype || '').toLowerCase();
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    VIDEO_EXTENSIONS.has(extension) ||
    AUDIO_EXTENSIONS.has(extension)
  ) return 'video';
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) return 'image';
  return 'raw';
};

const resolveFileKind = (file) => {
  const mime = (file.mimetype || '').toLowerCase();
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || ARCHIVE_EXTENSIONS.has(extension)) return 'archive';
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    mime.includes('text') ||
    mime.includes('csv') ||
    mime.includes('epub') ||
    DOCUMENT_EXTENSIONS.has(extension)
  ) return 'document';
  return 'other';
};

const buildDownloadName = (filename) => filename?.replace(/\s+/g, '-').trim() || 'digital-file';

export const uploadDigitalFiles = multer({
  storage: tempStorage,
  limits: {
    fileSize: DIGITAL_UPLOAD_MAX_BYTES,
    files: 8,
  },
  fileFilter: digitalFileFilter,
}).array('files', 8);

const uploadLargeFile = (file, options) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_large(
    file.path,
    {
      ...options,
      chunk_size: CLOUDINARY_CHUNK_SIZE_BYTES,
    },
    (error, result) => {
      if (error) {
        reject(Object.assign(new Error(error.message || 'Cloudinary large upload failed'), error));
        return;
      }
      resolve(result);
    }
  );
});

const removeCloudinaryUploads = async (uploads = []) => {
  await Promise.allSettled(uploads.map((upload) => cloudinary.uploader.destroy(upload.publicId, {
    resource_type: upload.resourceType,
    invalidate: true,
  })));
};

export const uploadDigitalFilesToCloudinary = async (files = []) => {
  const uploads = [];

  try {
    for (const file of files) {
      const options = {
        folder: 'belle-kreyashon/digital',
        resource_type: resolveResourceType(file),
        use_filename: true,
        unique_filename: true,
      };
      const uploaded = file.size >= LARGE_UPLOAD_THRESHOLD_BYTES
        ? await uploadLargeFile(file, options)
        : await cloudinary.uploader.upload(file.path, options);

      uploads.push({
        label: path.parse(file.originalname || '').name || 'Digital File',
        secureUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        originalFilename: file.originalname || uploaded.original_filename || '',
        downloadName: buildDownloadName(file.originalname || uploaded.original_filename),
        mimeType: file.mimetype || '',
        resourceType: uploaded.resource_type || resolveResourceType(file),
        fileKind: resolveFileKind(file),
        bytes: uploaded.bytes || file.size || 0,
      });
    }

    return uploads;
  } catch (error) {
    await removeCloudinaryUploads(uploads);
    throw error;
  } finally {
    await Promise.allSettled(files.map((file) => fs.unlink(file.path)));
  }
};

// Max 3 images per product, max 5MB each
export const uploadImages = createUploader('belle-kreyashon').array('images', 3);

// Single compressed training image
export const uploadTrainingImage = createUploader('belle-kreyashon/training').single('image');

export { cloudinary };
