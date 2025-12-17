# DRACO Setup for 3D Dental Chart

## Overview
This project uses DRACO compression for GLTF files to reduce file sizes and improve loading performance. The DRACO decoder files are required for loading compressed GLTF models.

## Files Included
The following DRACO decoder files are copied to `/public/draco/`:

- `draco_decoder.js` - JavaScript decoder
- `draco_decoder.wasm` - WebAssembly decoder
- `draco_encoder.js` - JavaScript encoder
- `draco_wasm_wrapper.js` - WebAssembly wrapper

## Setup Process
1. DRACO files are automatically copied from `node_modules/three/examples/jsm/libs/draco/` to `public/draco/`
2. The `InteractiveDentalChart3D` component uses a custom loader that includes DRACO support
3. If DRACO setup fails, the component falls back to standard GLTF loading

## Usage
The component automatically handles DRACO loading. No additional configuration is required.

## Troubleshooting
If you encounter "THREE.GLTFLoader: No DRACOLoader instance provided" errors:

1. Ensure the `/public/draco/` directory exists and contains the required files
2. Check that the files were copied correctly from node_modules
3. Verify the decoder path is set to `/draco/` in the component

## File Locations
- Source files: `node_modules/three/examples/jsm/libs/draco/`
- Public files: `public/draco/`
- Component: `components/interactive-dental-chart-3D.tsx`
