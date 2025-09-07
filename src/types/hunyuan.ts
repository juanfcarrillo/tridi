// Type definitions for the Hunyuan 3D API

export interface MeshParams {
  steps: number;
  guidance_scale: number;
  seed: number;
  max_facenum: number;
  octree_resolution: number;
  num_chunks: number;
  enable_flash_vdm: boolean;
  force_offload: boolean;
}

export interface TextureParams {
  view_size: number;
  steps: number;
  guidance_scale: number;
  texture_size: number;
  upscale_albedo: boolean;
  upscale_mr: boolean;
  camera_azimuths: string;
  camera_elevations: string;
  view_weights: string;
  ortho_scale: number;
}

export interface DecimationParams {
  enable_decimation: boolean;
  target_face_count: number;
}

export interface HunyuanRequest {
  workflow: "mesh" | "texture" | "enhanced";
  input_image: string;
  output_name?: string;
  vae_model?: string;
  diffusion_model?: string;
  upload_to_r2?: boolean;
  keep_local_files?: boolean;
  remove_background?: boolean;
  bg_threshold?: number;
  bg_use_jit?: boolean;
  mesh_params?: MeshParams;
  texture_params?: TextureParams;
  decimation_params?: DecimationParams;
}

export interface OutputFile {
  filename: string;
  download_url: string;
  file_type: string;
  full_path: string;
  uploaded_to_r2: boolean;
}

export interface MeshStats {
  original_faces?: number;
  processed_faces?: number;
  final_faces?: number;
}

export interface TextureInfo {
  generated_views: number;
  texture_size: number;
}

export interface HunyuanResponse {
  status: string;
  workflow_type: string;
  output_files: OutputFile[];
  mesh_stats?: MeshStats;
  texture_info?: TextureInfo;
  processing_time: number;
  r2_configured: boolean;
}

export interface RunPodStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  taskId: string;
  delayTime?: number;
  executionTime?: number;
  output?: HunyuanResponse;
  error?: string;
}
