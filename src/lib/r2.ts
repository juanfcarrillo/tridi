import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export interface R2File {
  key: string;
  lastModified: Date;
  size: number;
  etag: string;
  url?: string;
}

export interface R2ListResult {
  files: R2File[];
  hasMore: boolean;
  nextToken?: string;
}

/**
 * List files in R2 bucket with optional prefix filtering
 */
export async function listR2Files(
  prefix?: string,
  maxResults: number = 100,
  continuationToken?: string
): Promise<R2ListResult> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: prefix,
      MaxKeys: maxResults,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(command);

    const files: R2File[] = (response.Contents || []).map(obj => ({
      key: obj.Key!,
      lastModified: obj.LastModified!,
      size: obj.Size!,
      etag: obj.ETag!,
    }));

    return {
      files,
      hasMore: response.IsTruncated || false,
      nextToken: response.NextContinuationToken,
    };
  } catch (error) {
    console.error('Error listing R2 files:', error);
    throw new Error(`Failed to list R2 files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a presigned URL for downloading a file from R2
 */
export async function getR2FileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Filter 3D model files from R2 results
 */
export function filter3DModels(files: R2File[]): R2File[] {
  const modelExtensions = ['.glb', '.gltf', '.obj', '.ply', '.stl'];
  return files.filter(file => 
    modelExtensions.some(ext => file.key.toLowerCase().endsWith(ext))
  );
}

/**
 * Group files by generation session/output name
 */
export function groupFilesBySession(files: R2File[]): Record<string, R2File[]> {
  const grouped: Record<string, R2File[]> = {};
  
  files.forEach(file => {
    // Extract session name from file path
    // Assuming files are named like: output_name_base.glb, output_name_textured.glb, etc.
    const parts = file.key.split('/');
    const filename = parts[parts.length - 1];
    const sessionMatch = filename.match(/^(.+?)_(?:base|textured|final|enhanced)/);
    const sessionName = sessionMatch ? sessionMatch[1] : filename.replace(/\.[^.]+$/, '');
    
    if (!grouped[sessionName]) {
      grouped[sessionName] = [];
    }
    grouped[sessionName].push(file);
  });
  
  return grouped;
}
