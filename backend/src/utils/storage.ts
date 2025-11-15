import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFile(
  file: Express.Multer.File,
  path: string
): Promise<{ url: string; width: number; height: number }> {
  try {
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    const resourceType = fileType === 'image' ? 'image' : 'video';
    
    const fileName = `${path}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: path,
          public_id: fileName,
          overwrite: false,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              width: result.width || 1920,
              height: result.height || 1080
            });
          } else {
            reject(new Error('Upload failed: No result returned'));
          }
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      
      bufferStream.pipe(uploadStream);
    });
  } catch (error) {
    throw error;
  }
}

export async function getImageDimensions(file: Express.Multer.File): Promise<{ width: number; height: number }> {
  return { width: 1920, height: 1080 };
}

