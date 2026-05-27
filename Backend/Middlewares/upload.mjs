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
  const allowedByExtension = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.zip', '.rar', '.7z', '.epub',
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.mp3', '.wav', '.m4a',
    '.jpg', '.jpeg', '.png', '.webp',
  ].includes(extension);

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

const resolveResourceType = (file) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return 'raw';
};

const resolveFileKind = (file) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return 'archive';
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    mime.includes('text') ||
    mime.includes('csv') ||
    mime.includes('epub')
  ) return 'document';
  return 'other';
};

const buildDownloadName = (filename) => filename?.replace(/\s+/g, '-').trim() || 'digital-file';

export const uploadDigitalFiles = multer({
  storage: tempStorage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 8,
  },
  fileFilter: digitalFileFilter,
}).array('files', 8);

export const uploadDigitalFilesToCloudinary = async (files = []) => {
  const uploads = [];

  for (const file of files) {
    try {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: 'belle-kreyashon/digital',
        resource_type: resolveResourceType(file),
        use_filename: true,
        unique_filename: true,
      });

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
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  }

  return uploads;
};

// Max 3 images per product, max 5MB each
export const uploadImages = createUploader('belle-kreyashon').array('images', 3);

// Single compressed training image
export const uploadTrainingImage = createUploader('belle-kreyashon/training').single('image');

export { cloudinary };
