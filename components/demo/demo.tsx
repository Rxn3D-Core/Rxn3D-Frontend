"use client"

import SimpleSTLViewer from "@/components/demo/simple-stl-generator";
import { useState } from "react";
import { Calendar, Trash2, Download, FileText, Landmark } from "lucide-react";

export default function Demo() {
  // State for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    title: string;
    geometryType: "cube" | "sphere" | "pyramid";
    fileSize: string;
    dimensions: string;
    stlUrl: string;
    colorMode: "occlusal" | "material";
    materialColor: string;
    occlusalColor: string;
  }>>([]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.name.toLowerCase().endsWith('.stl')) {
          const url = URL.createObjectURL(file);
          const newFile = {
            title: file.name.replace('.stl', ''),
            geometryType: "cube" as "cube",
            fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            dimensions: "Unknown",
            stlUrl: url,
            colorMode: "material" as "material",
            materialColor: "#74c0fc",
            occlusalColor: "#1c7ed6",
          };
          setUploadedFiles(prev => [...prev, newFile]);
        }
      });
    }
  };

  // Helper for random ID (for demo)
  const getRandomId = () => Math.floor(Math.random() * 900000) + 100000;

  // Stock photo data (dental-related)
  const stockPhotos: Array<{
    title: string;
    description: string;
    imageUrl: string;
  }> = [
    {
      title: "Dental Care 1",
      description: "A dentist examining a patient's teeth.",
      imageUrl: "https://images.pexels.com/photos/305568/pexels-photo-305568.jpeg",
    },
    {
      title: "Dental Care 2",
      description: "Close-up of dental tools.",
      imageUrl: "https://images.pexels.com/photos/3779706/pexels-photo-3779706.jpeg",
    },
    {
      title: "Dental Care 3",
      description: "A patient receiving dental treatment.",
      imageUrl: "https://images.pexels.com/photos/4269696/pexels-photo-4269696.jpeg",
    },
    {
      title: "Dental Care 4",
      description: "A dentist explaining X-ray results.",
      imageUrl: "https://images.pexels.com/photos/5355825/pexels-photo-5355825.jpeg",
    },
    {
      title: "Dental Care 5",
      description: "A dental clinic setup.",
      imageUrl: "https://images.pexels.com/photos/287227/pexels-photo-287227.jpeg",
    },
    {
      title: "Dental Care 6",
      description: "A smiling patient after treatment.",
      imageUrl: "https://images.pexels.com/photos/3845761/pexels-photo-3845761.jpeg",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* File Upload Section */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload STL Files</h2>
          <input
            type="file"
            accept=".stl"
            multiple
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-500 mt-2">Select one or more STL files to upload</p>
        </div>

        {/* Uploaded STL Files Grid */}
        {uploadedFiles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Uploaded STL Models</h2>
            <div className="grid grid-cols-3 gap-6">
              {uploadedFiles.map((props, idx) => (
                <div
                  key={props.stlUrl}
                  className="bg-white rounded-2xl shadow p-4 relative flex flex-col items-center"
                >
                  <div className="absolute top-3 right-4 text-xs text-gray-700 font-semibold bg-white rounded px-2 py-1 shadow border border-gray-200">
                    ID: {678900 + idx}
                  </div>
                  <div className="w-full h-44 bg-white rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                    <SimpleSTLViewer
                      {...props}
                      viewerKey={props.stlUrl}
                      materialColor="#f9c74f"
                    />
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-800 transition"
                      style={{ zIndex: 10 }}
                      onClick={e => {
                        e.stopPropagation();
                        document.querySelector(`[data-viewer-key="${props.stlUrl}"]`)?.click();
                      }}
                    >
                      View File
                    </button>
                  </div>
                  <div className="w-full px-2">
                    <div className="truncate font-medium text-base mb-1">{props.title}.stl</div>
                    <div className="text-xs text-gray-500 mb-2">{props.fileSize}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>05/15/2025 @ 16:38</span>
                      <Landmark className="w-3 h-3 ml-2" />
                    </div>
                    <div className="flex gap-2">
                      <button className="p-1 hover:bg-gray-200 rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock Photos */}
        <div className="grid grid-cols-3 gap-8 mt-8">
          {stockPhotos.map((photo, idx) => (
            <div key={idx} className="bg-white shadow-md rounded-lg overflow-hidden">
              <img src={photo.imageUrl} alt={photo.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-lg font-semibold">{photo.title}</h3>
                <p className="text-gray-600">{photo.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
