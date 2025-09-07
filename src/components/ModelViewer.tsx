"use client";

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  // Auto-rotate the model
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <Center>
      <primitive 
        ref={meshRef}
        object={scene.clone()} 
        scale={1}
      />
    </Center>
  );
}

interface ModelViewerProps {
  modelUrl: string;
  title: string;
  onClose: () => void;
}

export default function ModelViewer({ modelUrl, title, onClose }: ModelViewerProps) {
  // Extract the path from the R2 URL and construct our API URL
  const getModelPath = (url: string) => {
    try {
      // Extract path from URLs like "https://pub-tridigrup.r2.dev/models/enhanced/test_enhanced_mesh_1757204550.glb"
      const urlObj = new URL(url);
      const path = urlObj.pathname; // This gives us "/models/enhanced/test_enhanced_mesh_1757204550.glb"
      return `/api/r2/file?path=${encodeURIComponent(path)}`;
    } catch (error) {
      console.error("Error parsing model URL:", error);
      return url; // Fallback to original URL
    }
  };

  const apiModelUrl = getModelPath(modelUrl);
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] relative border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 3D Viewer */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl h-96 border border-white/10 relative overflow-hidden">
          <Canvas
            camera={{ position: [5, 5, 5], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} />
            
            <Suspense fallback={null}>
              <Model url={apiModelUrl} />
              <Environment preset="studio" />
            </Suspense>
            
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true}
              autoRotate={false}
            />
          </Canvas>
          
          {/* Loading overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
              <p className="text-white">Loading 3D Model...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
            </div>
          </div>
        </div>

        {/* Controls Info */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-400">
          <div className="text-center">
            <div className="font-semibold text-white">Rotate</div>
            <div>Left Click + Drag</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-white">Zoom</div>
            <div>Mouse Wheel</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-white">Pan</div>
            <div>Right Click + Drag</div>
          </div>
        </div>

        {/* Download Button */}
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
}
