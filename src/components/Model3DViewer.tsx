"use client";

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Html, Center } from '@react-three/drei';

interface Model3DProps {
  url: string;
  scale?: number;
}

function Model3D({ url, scale = 1 }: Model3DProps) {
  const { scene } = useGLTF(url);
  
  return (
    <Center>
      <primitive object={scene} scale={scale} />
    </Center>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center space-x-2 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span>Loading 3D model...</span>
      </div>
    </Html>
  );
}

interface Model3DViewerProps {
  modelUrl: string;
  className?: string;
  scale?: number;
  showControls?: boolean;
  backgroundColor?: string;
}

export default function Model3DViewer({ 
  modelUrl, 
  className = "w-full h-96", 
  scale = 1,
  showControls = true,
  backgroundColor = "#1a1a2e"
}: Model3DViewerProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: backgroundColor }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Environment for reflections */}
        <Environment preset="studio" />
        
        {/* 3D Model */}
        <Suspense fallback={<LoadingFallback />}>
          <Model3D url={modelUrl} scale={scale} />
        </Suspense>
        
        {/* Controls */}
        {showControls && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            autoRotateSpeed={2}
          />
        )}
      </Canvas>
    </div>
  );
}

// Preload function for better performance
export function preloadModel(url: string) {
  useGLTF.preload(url);
}
