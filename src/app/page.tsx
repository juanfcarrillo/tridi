"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Model3DViewer from "@/components/Model3DViewer";
import {
    HunyuanRequest,
    HunyuanResponse,
    MeshParams,
    TextureParams,
    DecimationParams,
    OutputFile,
} from "@/types/hunyuan";

// Dynamically import ModelViewer to avoid SSR issues with Three.js
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
    ssr: false
});

const defaultMeshParams: MeshParams = {
    steps: 25,
    guidance_scale: 3.5,
    seed: 42,
    max_facenum: 20000,
    octree_resolution: 224,
    num_chunks: 3000,
    enable_flash_vdm: true,
    force_offload: true,
};

const defaultTextureParams: TextureParams = {
    view_size: 512,
    steps: 15,
    guidance_scale: 3.5,
    texture_size: 1024,
    upscale_albedo: false,
    upscale_mr: false,
    camera_azimuths: "0, 180, 90, 270, 45, 315",
    camera_elevations: "0, 0, 0, 0, 30, 30",
    view_weights: "1.0, 1.0, 1.0, 1.0, 0.8, 0.8",
    ortho_scale: 1.10,
};

const defaultDecimationParams: DecimationParams = {
    enable_decimation: false,
    target_face_count: 15000,
};

export default function Hunyuan3DApp() {
    const [activeTab, setActiveTab] = useState("generator");
    const [workflow, setWorkflow] = useState<"mesh" | "texture" | "enhanced">("enhanced");
    const [inputImage, setInputImage] = useState<string | null>(null);
    const [outputName, setOutputName] = useState("");
    const [uploadToR2, setUploadToR2] = useState(true);
    const [keepLocalFiles, setKeepLocalFiles] = useState(false);
    const [removeBackground, setRemoveBackground] = useState(true);
    const [bgThreshold, setBgThreshold] = useState(0.5);
    const [bgUseJit, setBgUseJit] = useState(false);
    const [meshParams, setMeshParams] = useState(defaultMeshParams);
    const [textureParams, setTextureParams] = useState(defaultTextureParams);
    const [decimationParams, setDecimationParams] = useState(defaultDecimationParams);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<HunyuanResponse | null>({
        "mesh_stats": {
            "final_faces": 20000,
            "original_faces": 424712,
            "processed_faces": 20000
        },
        "output_files": [
            {
                "download_url": "https://pub-tridigrup.r2.dev/models/enhanced/test_mesh_1757205689.glb",
                "file_type": "base_mesh",
                "filename": "test_mesh_base_00001_.glb",
                "full_path": "/app/output/3D/test_mesh_base_00001_.glb",
                "uploaded_to_r2": true
            },
            {
                "download_url": "https://pub-tridigrup.r2.dev/models/enhanced/test_mesh_1757205690.glb",
                "file_type": "textured_mesh",
                "filename": "test_mesh_textured_final_00001_.glb",
                "full_path": "/app/output/3D/test_mesh_textured_final_00001_.glb",
                "uploaded_to_r2": true
            }
        ],
        "processing_time": 193.24,
        "r2_configured": true,
        "status": "success",
        "texture_info": {
            "generated_views": 6,
            "texture_size": 1024
        },
        "workflow_type": "enhanced"
    });
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<OutputFile | null>(null);

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setInputImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle API call with async polling
    const handleRun = async () => {
        if (!inputImage) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setProgress("Starting task...");

        try {
            const payload: HunyuanRequest = {
                workflow,
                input_image: inputImage.split(",")[1], // Remove data:image/... prefix
                output_name: outputName,
                upload_to_r2: uploadToR2,
                keep_local_files: keepLocalFiles,
                remove_background: removeBackground,
                bg_threshold: bgThreshold,
                bg_use_jit: bgUseJit,
            };

            if (workflow === "mesh" || workflow === "enhanced") payload.mesh_params = meshParams;
            if (workflow === "texture" || workflow === "enhanced") payload.texture_params = textureParams;
            if (workflow === "enhanced") payload.decimation_params = decimationParams;

            // Start the task
            const startRes = await fetch("/api/hunyuan/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!startRes.ok) {
                throw new Error(`Failed to start task: ${startRes.statusText}`);
            }

            const { taskId } = await startRes.json();
            setProgress(`Task started with ID: ${taskId}. Checking status...`);

            // Poll for results
            let attempts = 0;
            const maxAttempts = 120; // 10 minutes with 5-second intervals

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                attempts++;

                setProgress(`Checking status... (attempt ${attempts}/${maxAttempts})`);

                const statusRes = await fetch(`/api/hunyuan/status?taskId=${taskId}`);
                if (!statusRes.ok) {
                    throw new Error(`Failed to check status: ${statusRes.statusText}`);
                }

                const statusData = await statusRes.json();

                if (statusData.status === "COMPLETED") {
                    setResult(statusData.output);
                    setProgress("Task completed successfully!");
                    setActiveTab("results"); // Switch to results tab
                    break;
                } else if (statusData.status === "FAILED") {
                    throw new Error(statusData.error || "Task failed");
                } else if (statusData.status === "IN_PROGRESS") {
                    setProgress(`Task in progress... (${attempts * 5}s elapsed)`);
                } else if (statusData.status === "IN_QUEUE") {
                    setProgress(`Task in queue... (${attempts * 5}s elapsed)`);
                }
            }

            if (attempts >= maxAttempts) {
                throw new Error("Task timed out after 10 minutes");
            }

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
            setProgress("");
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-800 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-5xl bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-white/10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Hunyuan 3D Generator</h1>
                    <p className="text-gray-300">Generate and visualize 3D meshes and textures using the Hunyuan 3D workflow.</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab("generator")}
                        className={`px-6 py-4 font-semibold transition-colors ${activeTab === "generator"
                            ? "text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        🚀 Generator
                    </button>
                    <button
                        onClick={() => setActiveTab("results")}
                        className={`px-6 py-4 font-semibold transition-colors ${activeTab === "results"
                            ? "text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        🎯 Results
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {activeTab === "generator" && (
                        <div className="space-y-6">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-white font-semibold mb-3">Input Image</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="block w-full text-gray-200 bg-gray-800/50 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                                    />
                                </div>
                                {inputImage && (
                                    <div className="mt-4">
                                        <img src={inputImage} alt="Preview" className="rounded-lg shadow-lg w-48 h-48 object-cover border border-white/30" />
                                    </div>
                                )}
                            </div>

                            {/* Workflow Selection */}
                            <div>
                                <label className="block text-white font-semibold mb-3">Workflow</label>
                                <select
                                    value={workflow}
                                    onChange={e => setWorkflow(e.target.value as "mesh" | "texture" | "enhanced")}
                                    className="w-full p-3 rounded-lg bg-gray-800/70 text-white border border-white/20 focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="mesh">Mesh Generation Only</option>
                                    <option value="texture">Texture Generation Only</option>
                                    <option value="enhanced">Enhanced (Mesh + Texture + Decimation)</option>
                                </select>
                            </div>

                            {/* Output Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-white font-semibold mb-2">Output Name</label>
                                    <input
                                        type="text"
                                        value={outputName}
                                        onChange={e => setOutputName(e.target.value)}
                                        className="w-full p-3 rounded-lg bg-gray-800/70 text-white border border-white/20 focus:border-indigo-500 focus:outline-none"
                                        placeholder="my_mesh"
                                    />
                                </div>
                            </div>

                            {/* Upload & Background Options */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="uploadToR2"
                                        checked={uploadToR2}
                                        onChange={e => setUploadToR2(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="uploadToR2" className="text-white font-medium">Upload to R2</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="keepLocalFiles"
                                        checked={keepLocalFiles}
                                        onChange={e => setKeepLocalFiles(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="keepLocalFiles" className="text-white font-medium">Keep Local Files</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="removeBackground"
                                        checked={removeBackground}
                                        onChange={e => setRemoveBackground(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="removeBackground" className="text-white font-medium">Remove Background</label>
                                </div>
                                <div>
                                    <label className="block text-white font-medium mb-1">BG Threshold</label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={bgThreshold}
                                        onChange={e => setBgThreshold(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-gray-300 text-sm">{bgThreshold.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="bgUseJit"
                                        checked={bgUseJit}
                                        onChange={e => setBgUseJit(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="bgUseJit" className="text-white font-medium">Use JIT</label>
                                </div>
                            </div>

                            {/* Mesh Parameters */}
                            {(workflow === "mesh" || workflow === "enhanced") && (
                                <details className="bg-gray-900/60 rounded-lg p-4 border border-white/10" open>
                                    <summary className="text-white font-semibold cursor-pointer mb-4">Mesh Parameters</summary>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(meshParams).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                                <label className="text-gray-200 mb-2 font-medium">{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</label>
                                                {typeof value === "boolean" ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={value}
                                                        onChange={e => setMeshParams({ ...meshParams, [key]: e.target.checked })}
                                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                                    />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={value}
                                                        onChange={e => setMeshParams({ ...meshParams, [key]: Number(e.target.value) })}
                                                        className="p-2 rounded bg-gray-800/70 text-white border border-white/20 focus:border-indigo-500 focus:outline-none"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {/* Texture Parameters */}
                            {(workflow === "texture" || workflow === "enhanced") && (
                                <details className="bg-gray-900/60 rounded-lg p-4 border border-white/10" open>
                                    <summary className="text-white font-semibold cursor-pointer mb-4">Texture Parameters</summary>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(textureParams).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                                <label className="text-gray-200 mb-2 font-medium">{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</label>
                                                {typeof value === "boolean" ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={value}
                                                        onChange={e => setTextureParams({ ...textureParams, [key]: e.target.checked })}
                                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={value}
                                                        onChange={e => setTextureParams({ ...textureParams, [key]: typeof value === "number" ? Number(e.target.value) || 0 : e.target.value })}
                                                        className="p-2 rounded bg-gray-800/70 text-white border border-white/20 focus:border-indigo-500 focus:outline-none"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {/* Decimation Parameters */}
                            {workflow === "enhanced" && (
                                <details className="bg-gray-900/60 rounded-lg p-4 border border-white/10" open>
                                    <summary className="text-white font-semibold cursor-pointer mb-4">Decimation Parameters</summary>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(decimationParams).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                                <label className="text-gray-200 mb-2 font-medium">{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</label>
                                                {typeof value === "boolean" ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={value}
                                                        onChange={e => setDecimationParams({ ...decimationParams, [key]: e.target.checked })}
                                                        className="w-4 h-4 text-indigo-600 bg-gray-800 border-white/20 rounded focus:ring-indigo-500"
                                                    />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={value}
                                                        onChange={e => setDecimationParams({ ...decimationParams, [key]: Number(e.target.value) })}
                                                        className="p-2 rounded bg-gray-800/70 text-white border border-white/20 focus:border-indigo-500 focus:outline-none"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {/* Progress */}
                            {loading && progress && (
                                <div className="p-4 bg-indigo-900/50 rounded-lg border border-indigo-500/30">
                                    <div className="flex items-center space-x-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-400"></div>
                                        <span className="text-indigo-200">{progress}</span>
                                    </div>
                                </div>
                            )}

                            {/* Run Button */}
                            <button
                                onClick={handleRun}
                                disabled={loading || !inputImage}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-600"
                            >
                                {loading ? "Processing..." : "🚀 Generate 3D Model"}
                            </button>

                            {/* Errors */}
                            {error && (
                                <div className="p-4 bg-red-900/50 rounded-lg border border-red-500/30">
                                    <h3 className="text-red-300 font-semibold mb-2">Error</h3>
                                    <p className="text-red-200">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "results" && (
                        <div>
                            {result ? (
                                <div className="space-y-6">
                                    <div className="bg-gray-900/80 rounded-xl p-6 border border-white/10">
                                        <h2 className="text-2xl font-bold text-white mb-4">🎉 Generation Complete!</h2>

                                        {/* Statistics */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                                <span className="text-gray-300 font-semibold">Status:</span>
                                                <span className="ml-2 text-green-400">{result.status}</span>
                                            </div>
                                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                                <span className="text-gray-300 font-semibold">Workflow:</span>
                                                <span className="ml-2 text-blue-400">{result.workflow_type}</span>
                                            </div>
                                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                                <span className="text-gray-300 font-semibold">Processing Time:</span>
                                                <span className="ml-2 text-yellow-400">{result.processing_time}s</span>
                                            </div>
                                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                                <span className="text-gray-300 font-semibold">R2 Storage:</span>
                                                <span className="ml-2 text-purple-400">{result.r2_configured ? "✓ Enabled" : "✗ Disabled"}</span>
                                            </div>
                                        </div>

                                        {/* 3D Models Grid */}
                                        <div>
                                            <h3 className="text-white font-semibold mb-4">Generated 3D Models:</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {result.output_files.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-gray-800/50 rounded-lg border border-white/10 overflow-hidden hover:border-indigo-500/50 transition-colors group"
                                                    >
                                                        {/* Preview/Thumbnail area */}
                                                        <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                                            <div className="text-center">
                                                                <div className="w-16 h-16 mx-auto mb-3 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                                                                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                                    </svg>
                                                                </div>
                                                                <p className="text-gray-300 font-medium">{file.file_type.replace('_', ' ').toUpperCase()}</p>
                                                                <p className="text-gray-400 text-sm">{file.filename}</p>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="p-4">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => setSelectedModel(file)}
                                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    <span>View 3D</span>
                                                                </button>
                                                                <a
                                                                    href={file.download_url}
                                                                    download
                                                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Mesh Statistics */}
                                        {result.mesh_stats && (
                                            <div className="mt-6">
                                                <h3 className="text-white font-semibold mb-3">Mesh Statistics:</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-gray-800/50 p-3 rounded-lg">
                                                        <span className="text-gray-300">Original Faces:</span>
                                                        <span className="ml-2 text-blue-400 font-mono">{result.mesh_stats.original_faces?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="bg-gray-800/50 p-3 rounded-lg">
                                                        <span className="text-gray-300">Processed Faces:</span>
                                                        <span className="ml-2 text-green-400 font-mono">{result.mesh_stats.processed_faces?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="bg-gray-800/50 p-3 rounded-lg">
                                                        <span className="text-gray-300">Final Faces:</span>
                                                        <span className="ml-2 text-purple-400 font-mono">{result.mesh_stats.final_faces?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Texture Info */}
                                        {result.texture_info && (
                                            <div className="mt-6">
                                                <h3 className="text-white font-semibold mb-3">Texture Information:</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-gray-800/50 p-3 rounded-lg">
                                                        <span className="text-gray-300">Generated Views:</span>
                                                        <span className="ml-2 text-cyan-400 font-mono">{result.texture_info.generated_views}</span>
                                                    </div>
                                                    <div className="bg-gray-800/50 p-3 rounded-lg">
                                                        <span className="text-gray-300">Texture Size:</span>
                                                        <span className="ml-2 text-orange-400 font-mono">{result.texture_info.texture_size}px</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-xl flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">No Results Yet</h3>
                                    <p className="text-gray-400 mb-4">Generate a 3D model to see results here.</p>
                                    <button
                                        onClick={() => setActiveTab("generator")}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
                                    >
                                        Go to Generator
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3D Model Viewer Modal */}
            {selectedModel && (() => {
                // Extraer el path de la URL pública
                let apiModelUrl = selectedModel.download_url;
                try {
                  const urlObj = new URL(selectedModel.download_url);
                  apiModelUrl = `/api/r2/file?path=${encodeURIComponent(urlObj.pathname)}`;
                } catch (e) {}
                return (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] relative border border-white/20">
                      <h2 className="text-2xl font-bold text-white mb-4">{`${selectedModel.file_type.replace('_', ' ').toUpperCase()} - ${selectedModel.filename}`}</h2>
                      <button
                        onClick={() => setSelectedModel(null)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <Model3DViewer modelUrl={apiModelUrl} className="w-full h-96 mt-4" />
                      <div className="mt-4 flex justify-center">
                        <a
                          href={apiModelUrl}
                          download
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download Model</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
            })()}

            {/* Subtle 3D-inspired background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <svg className="absolute top-0 left-0 w-full h-full opacity-10" viewBox="0 0 800 600" fill="none">
                    <defs>
                        <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="objectBoundingBox">
                            <stop stopColor="#6366F1" />
                            <stop offset="1" stopColor="#1E1B4B" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <ellipse cx="400" cy="300" rx="320" ry="180" fill="url(#paint0_radial)" />
                    <path d="M200 100L400 50L600 100L500 300L300 300Z" stroke="#6366F1" strokeWidth="1" fill="none" opacity="0.3" />
                    <path d="M100 200L300 150L500 200L400 400L200 400Z" stroke="#8B5CF6" strokeWidth="1" fill="none" opacity="0.2" />
                </svg>
            </div>
        </main>
    );
}
