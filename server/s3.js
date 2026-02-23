import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

const bucket = process.env.S3_BUCKET

export async function listFiles() {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
  })
  const response = await s3Client.send(command)
  return (response.Contents || []).map((item) => ({
    key: item.Key,
    size: item.Size,
    lastModified: item.LastModified,
  }))
}

export async function uploadFile(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  const response = await s3Client.send(command)
  return {
    etag: response.ETag?.replace(/"/g, ''),
  }
}

export async function uploadFileWithProgress(key, body, contentType, onProgress) {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024, // 5MB parts
    leavePartsOnError: false,
  })

  upload.on('httpUploadProgress', (progress) => {
    if (onProgress && progress.loaded && progress.total) {
      onProgress(progress.loaded, progress.total)
    }
  })

  const response = await upload.done()
  return {
    etag: response.ETag?.replace(/"/g, ''),
  }
}

export async function getFileStream(key, range) {
  const headCommand = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  const headResponse = await s3Client.send(headCommand)
  const fileSize = headResponse.ContentLength
  const contentType = headResponse.ContentType

  let start = 0
  let end = fileSize - 1

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    start = parseInt(parts[0], 10)
    end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
  }

  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=${start}-${end}`,
  })
  const response = await s3Client.send(getCommand)

  return {
    stream: response.Body,
    contentLength: end - start + 1,
    contentType,
    fileSize,
    start,
    end,
  }
}

export async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  return s3Client.send(command)
}

export async function renameFile(oldKey, newKey) {
  const copyCommand = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${encodeURIComponent(oldKey)}`,
    Key: newKey,
  })
  await s3Client.send(copyCommand)

  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: oldKey,
  })
  await s3Client.send(deleteCommand)
}
