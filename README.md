# Hunyuan 3D Generator App

A modern, minimal Next.js application for generating 3D meshes and textures using the Hunyuan 3D workflow via RunPod serverless infrastructure.

## Features

- **Modern UI**: Clean, glassmorphic design with 3D-inspired elements
- **Complete Parameter Control**: Full access to all Hunyuan 3D parameters
- **Async Processing**: Proper handling of RunPod's asynchronous API
- **Real-time Progress**: Live status updates during generation
- **Multiple Workflows**: Support for mesh-only, texture-only, and enhanced workflows
- **File Management**: Direct download links for generated 3D models

## Setup

### 1. Environment Configuration

Copy `.env.local` and update with your RunPod credentials:

```bash
# Your RunPod endpoint ID (found in RunPod dashboard)
RUNPOD_ENDPOINT_ID=your-endpoint-id-here

# Your RunPod API key (generated in RunPod account settings)
RUNPOD_API_KEY=your-runpod-api-key-here
```

### 2. RunPod Endpoint Setup

1. Deploy the Hunyuan 3D worker to RunPod Serverless
2. Copy your endpoint ID from the RunPod dashboard
3. Generate an API key in your RunPod account settings
4. Update the environment variables above

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Usage

### Workflow Types

1. **Mesh**: Generate 3D mesh only (fastest)
2. **Texture**: Add textures to existing meshes
3. **Enhanced**: Complete pipeline with mesh + texture + decimation (recommended)

### Parameters

#### Mesh Parameters
- **Steps**: Number of diffusion steps (default: 25)
- **Guidance Scale**: Classifier-free guidance scale (default: 3.5)
- **Seed**: Random seed for reproducible results (default: 42)
- **Max Face Count**: Maximum number of faces in generated mesh (default: 20,000)
- **Octree Resolution**: Resolution of the octree structure (default: 224)
- **Num Chunks**: Number of processing chunks (default: 3,000)
- **Enable Flash VDM**: Use flash attention for faster processing
- **Force Offload**: Offload models to save GPU memory

#### Texture Parameters
- **View Size**: Resolution of rendered views (default: 512)
- **Steps**: Number of texture generation steps (default: 15)
- **Guidance Scale**: Texture guidance scale (default: 3.5)
- **Texture Size**: Final texture resolution (default: 1024)
- **Camera Azimuths**: Camera azimuth angles for multi-view rendering
- **Camera Elevations**: Camera elevation angles
- **View Weights**: Relative weights for each camera view
- **Ortho Scale**: Orthographic projection scale (default: 1.10)

#### Decimation Parameters
- **Enable Decimation**: Reduce mesh complexity after generation
- **Target Face Count**: Target number of faces after decimation (default: 15,000)

### Background Removal
- **Remove Background**: Automatically remove image background
- **BG Threshold**: Background removal sensitivity (0.0-1.0)
- **Use JIT**: Enable PyTorch JIT for faster inference

## API Endpoints

### POST /api/hunyuan/start
Starts an asynchronous Hunyuan 3D generation task.

**Request Body:**
```json
{
  "workflow": "enhanced",
  "input_image": "base64_encoded_image_data",
  "output_name": "my_mesh",
  "mesh_params": { ... },
  "texture_params": { ... },
  "decimation_params": { ... }
}
```

**Response:**
```json
{
  "taskId": "task-uuid-here"
}
```

### GET /api/hunyuan/status?taskId=<task_id>
Checks the status of a running task.

**Response:**
```json
{
  "status": "COMPLETED",
  "taskId": "task-uuid-here",
  "output": {
    "status": "success",
    "output_files": [...],
    "mesh_stats": {...},
    "processing_time": 120.5
  }
}
```

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **UI**: Tailwind CSS with glassmorphism design
- **API**: RunPod Serverless for Hunyuan 3D processing
- **Type Safety**: TypeScript with strict mode
- **File Processing**: Native File API for image uploads

## Deployment

Deploy to Vercel:

```bash
npm run build
```

Make sure to set your environment variables in your deployment platform.

## Troubleshooting

### Common Issues

1. **"Environment variables required" error**: Ensure `RUNPOD_ENDPOINT_ID` and `RUNPOD_API_KEY` are set
2. **Task timeout**: Increase polling timeout or check RunPod endpoint health
3. **Invalid image format**: Ensure image is properly base64 encoded
4. **API rate limits**: Implement exponential backoff for status polling

### RunPod Limits

- Async jobs: Results available for 30 minutes after completion
- Payload limit: 10 MB for `/run` endpoint
- Rate limits: 1000 requests per 10 seconds for `/run`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
