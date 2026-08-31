import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';

export type CloudinaryResourceType = 'image' | 'video';

@Injectable()
export class CloudinaryService {
  private configured = false;

  upload(
    buffer: Buffer,
    options: { folder: string; resourceType: CloudinaryResourceType },
  ): Promise<UploadApiResponse> {
    this.ensureConfigured();
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: options.folder, resource_type: options.resourceType },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        },
      );
      upload.end(buffer);
    });
  }

  destroy(publicId: string, resourceType: CloudinaryResourceType) {
    this.ensureConfigured();
    return cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }

  private ensureConfigured() {
    if (this.configured) return;
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      throw new ServiceUnavailableException(
        'Upload de mídia indisponível: configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET',
      );
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    this.configured = true;
  }
}
