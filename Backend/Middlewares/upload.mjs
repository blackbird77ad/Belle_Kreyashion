import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileFilter = (_, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
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

// Max 3 images per product, max 5MB each
export const uploadImages = createUploader('belle-kreyashon').array('images', 3);

// Single compressed training image
export const uploadTrainingImage = createUploader('belle-kreyashon/training').single('image');

export { cloudinary };
