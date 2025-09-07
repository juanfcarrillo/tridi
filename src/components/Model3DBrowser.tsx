"use client";

import React, { useState, useEffect } from 'react';
import Model3DViewer from './Model3DViewer';
import { R2File } from '@/lib/r2';

interface ModelSession {
  name: string;
  files: R2File[];
  createdAt: Date;
}

interface Model3DBrowserProps {
  className?: string;
}

export default function Model3DBrowser({ className = "" }: Model3DBrowserProps) {
  const [sessions, setSessions] = useState<Record<string, R2File[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelUrls, setModelUrls] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch 3D models from R2
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/r2/list?filterModels=true&groupBySessions=true');
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSessions(data.sessions || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  // Get presigned URL for a model
  const getModelUrl = async (key: string): Promise<string> => {
    if (modelUrls[key]) {
      return modelUrls[key];
    }

    try {
      const response = await fetch(`/api/r2/url?key=${encodeURIComponent(key)}`);
      if (!response.ok) {
        throw new Error(`Failed to get model URL: ${response.statusText}`);
      }
      
      const data = await response.json();
      setModelUrls(prev => ({ ...prev, [key]: data.url }));
      return data.url;
    } catch (err) {
      console.error('Error getting model URL:', err);
      throw err;
    }
  };

  // Handle model selection
  const selectModel = async (key: string) => {
    try {
      const url = await getModelUrl(key);
      setSelectedModel(url);
    } catch (err) {
      setError(`Failed to load model: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get file type from extension
  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'glb': return 'GLB';
      case 'gltf': return 'GLTF';
      case 'obj': return 'OBJ';
      case 'ply': return 'PLY';
      case 'stl': return 'STL';
      default: return ext?.toUpperCase() || 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          <span className="text-white">Loading 3D models...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="bg-red-900/50 rounded-lg border border-red-500/30 p-4">
          <h3 className="text-red-300 font-semibold mb-2">Error</h3>
          <p className="text-red-200">{error}</p>
          <button 
            onClick={fetchModels}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sessionKeys = Object.keys(sessions);

  if (sessionKeys.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">No 3D Models Found</h3>
          <p>No 3D models have been generated yet. Create some models using the generator above!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">3D Model Gallery</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchModels}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Refresh
          </button>
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* 3D Model Viewer */}
      {selectedModel && (
        <div className="mb-8 bg-gray-900/60 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">3D Model Viewer</h3>
            <button
              onClick={() => setSelectedModel(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Model3DViewer 
            modelUrl={selectedModel} 
            className="w-full h-96 rounded-lg overflow-hidden"
            backgroundColor="#0f172a"
          />
        </div>
      )}

      {/* Model Sessions */}
      <div className="space-y-6">
        {sessionKeys.map(sessionName => {
          const sessionFiles = sessions[sessionName];
          const latestFile = sessionFiles.reduce((latest, file) => 
            file.lastModified > latest.lastModified ? file : latest
          );

          return (
            <div key={sessionName} className="bg-gray-900/60 rounded-lg p-6 border border-white/10">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white mb-2">{sessionName}</h3>
                <p className="text-gray-400 text-sm">
                  Generated: {latestFile.lastModified.toLocaleDateString()} • {sessionFiles.length} files
                </p>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sessionFiles.map(file => (
                    <div 
                      key={file.key}
                      className="bg-gray-800/50 rounded-lg p-4 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group"
                      onClick={() => selectModel(file.key)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-indigo-400 text-xs font-semibold">
                          {getFileType(file.key)}
                        </span>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium mb-2 truncate">
                        {file.key.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Untitled'}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionFiles.map(file => (
                    <div 
                      key={file.key}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group"
                      onClick={() => selectModel(file.key)}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <div>
                          <h4 className="text-white font-medium">
                            {file.key.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Untitled'}
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {getFileType(file.key)} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">
                          {file.lastModified.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
