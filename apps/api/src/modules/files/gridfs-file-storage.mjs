import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { GridFSBucket } from 'mongodb';

import { AppError } from '../../common/errors/app-error.mjs';

export const vehicleDocumentBucketName = 'vehicle_documents';

export class GridFsFileStorage {
  constructor({ db, bucketName = vehicleDocumentBucketName }) {
    this.bucketName = bucketName;
    this.bucket = new GridFSBucket(db, { bucketName });
  }

  async deleteIfExists(fileId) {
    try {
      await this.bucket.delete(fileId);
    } catch (error) {
      if (!String(error?.message ?? '').toLowerCase().includes('file not found')) {
        throw error;
      }
    }
  }

  async upload({ file, stream, contentType, contentLength, maxSizeBytes, metadata = {} }) {
    if (!stream?.pipe) {
      throw new AppError(400, 'FILE_UPLOAD_STREAM_REQUIRED', 'File upload body is required.');
    }

    if (contentLength && contentLength > maxSizeBytes) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'File is too large for vehicle verification storage.', {
        maxSizeBytes
      });
    }

    await this.deleteIfExists(file.id);

    let uploadedSizeBytes = 0;
    const counter = new Transform({
      transform(chunk, _encoding, callback) {
        uploadedSizeBytes += chunk.length;

        if (uploadedSizeBytes > maxSizeBytes) {
          callback(
            new AppError(413, 'FILE_TOO_LARGE', 'File is too large for vehicle verification storage.', {
              maxSizeBytes
            })
          );
          return;
        }

        callback(null, chunk);
      }
    });

    const uploadStream = this.bucket.openUploadStreamWithId(file.id, file.originalFileName ?? file.id, {
      contentType,
      metadata: {
        ...metadata,
        fileRecordId: file.id,
        originalFileName: file.originalFileName,
        mimeType: contentType,
        uploadedAt: new Date().toISOString()
      }
    });

    try {
      await pipeline(stream, counter, uploadStream);
    } catch (error) {
      await this.deleteIfExists(file.id).catch(() => undefined);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'GRIDFS_UPLOAD_FAILED', 'KULI could not store this verification file. Please try again.', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }

    if (uploadedSizeBytes <= 0) {
      await this.deleteIfExists(file.id).catch(() => undefined);
      throw new AppError(422, 'FILE_UPLOAD_EMPTY', 'Uploaded file is empty.');
    }

    return {
      bucketName: this.bucketName,
      gridFsFileId: file.id,
      uploadedSizeBytes
    };
  }

  async openDownloadStream(file) {
    const gridFsFileId = file.gridFsFileId ?? file.id;
    const matches = await this.bucket.find({ _id: gridFsFileId }).limit(1).toArray();
    const gridFile = matches[0];

    if (!gridFile) {
      throw new AppError(404, 'GRIDFS_FILE_NOT_FOUND', 'Stored verification file was not found.');
    }

    return {
      gridFile,
      stream: this.bucket.openDownloadStream(gridFsFileId)
    };
  }
}
