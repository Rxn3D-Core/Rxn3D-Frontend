#!/usr/bin/env node

/**
 * GLB File Optimization Script
 * 
 * This script helps optimize large GLB files for better web performance.
 * It uses gltf-pipeline and other tools to reduce file size and improve loading speed.
 * 
 * Usage:
 * node scripts/optimize-glb-files.js [options]
 * 
 * Options:
 * --input-dir: Input directory containing GLB files (default: public/images/glb)
 * --output-dir: Output directory for optimized files (default: public/images/glb/optimized)
 * --quality: Texture quality (low, medium, high) (default: medium)
 * --draco: Enable DRACO compression (default: true)
 * --texture-size: Maximum texture size in pixels (default: 1024)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  inputDir: 'public/images/glb',
  outputDir: 'public/images/glb/optimized',
  quality: 'medium',
  draco: true,
  textureSize: 1024,
  backup: true
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input-dir':
        config.inputDir = args[++i];
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--quality':
        config.quality = args[++i];
        break;
      case '--draco':
        config.draco = args[++i] === 'true';
        break;
      case '--texture-size':
        config.textureSize = parseInt(args[++i]);
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
}

function showHelp() {
  console.log(`
GLB File Optimization Script

Usage: node scripts/optimize-glb-files.js [options]

Options:
  --input-dir <path>     Input directory containing GLB files
  --output-dir <path>    Output directory for optimized files
  --quality <level>      Texture quality: low, medium, high
  --draco <boolean>      Enable DRACO compression (true/false)
  --texture-size <size>  Maximum texture size in pixels
  --help                 Show this help message

Examples:
  node scripts/optimize-glb-files.js
  node scripts/optimize-glb-files.js --quality high --texture-size 2048
  node scripts/optimize-glb-files.js --input-dir models --output-dir models/optimized
`);
}

// Check if required tools are installed
function checkDependencies() {
  try {
    execSync('gltf-pipeline --version', { stdio: 'ignore' });
    console.log('✅ gltf-pipeline is installed');
  } catch (error) {
    console.error('❌ gltf-pipeline is not installed. Please install it first:');
    console.error('npm install -g gltf-pipeline');
    process.exit(1);
  }
}

// Create output directory if it doesn't exist
function ensureOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${config.outputDir}`);
  }
}

// Get quality settings based on quality level
function getQualitySettings() {
  switch (config.quality) {
    case 'low':
      return {
        textureSize: 512,
        dracoCompression: 7,
        optimizeMeshes: true
      };
    case 'high':
      return {
        textureSize: 2048,
        dracoCompression: 5,
        optimizeMeshes: false
      };
    default: // medium
      return {
        textureSize: 1024,
        dracoCompression: 6,
        optimizeMeshes: true
      };
  }
}

// Optimize a single GLB file
function optimizeGLBFile(inputPath, outputPath, qualitySettings) {
  const filename = path.basename(inputPath);
  console.log(`🔄 Optimizing ${filename}...`);
  
  try {
    // Build gltf-pipeline command
    let command = `gltf-pipeline -i "${inputPath}" -o "${outputPath}"`;
    
    if (config.draco) {
      command += ` -d --draco.compressionLevel=${qualitySettings.dracoCompression}`;
    }
    
    if (qualitySettings.optimizeMeshes) {
      command += ' --optimizeMeshes';
    }
    
    // Execute optimization
    execSync(command, { stdio: 'pipe' });
    
    // Get file sizes
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;
    const compressionRatio = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    console.log(`✅ ${filename} optimized successfully`);
    console.log(`   Input size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compression: ${compressionRatio}%`);
    
    return {
      success: true,
      inputSize,
      outputSize,
      compressionRatio: parseFloat(compressionRatio)
    };
  } catch (error) {
    console.error(`❌ Failed to optimize ${filename}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main optimization function
function optimizeGLBFiles() {
  console.log('🚀 Starting GLB file optimization...\n');
  
  // Check dependencies
  checkDependencies();
  
  // Parse arguments
  parseArgs();
  
  // Ensure output directory exists
  ensureOutputDir();
  
  // Get quality settings
  const qualitySettings = getQualitySettings();
  
  console.log('Configuration:');
  console.log(`  Input directory: ${config.inputDir}`);
  console.log(`  Output directory: ${config.outputDir}`);
  console.log(`  Quality level: ${config.quality}`);
  console.log(`  DRACO compression: ${config.draco}`);
  console.log(`  Texture size: ${qualitySettings.textureSize}px`);
  console.log(`  Optimize meshes: ${qualitySettings.optimizeMeshes}\n`);
  
  // Check if input directory exists
  if (!fs.existsSync(config.inputDir)) {
    console.error(`❌ Input directory does not exist: ${config.inputDir}`);
    process.exit(1);
  }
  
  // Find all GLB files
  const files = fs.readdirSync(config.inputDir)
    .filter(file => file.toLowerCase().endsWith('.glb'))
    .map(file => path.join(config.inputDir, file));
  
  if (files.length === 0) {
    console.log('ℹ️  No GLB files found in input directory');
    return;
  }
  
  console.log(`📁 Found ${files.length} GLB file(s):`);
  files.forEach(file => {
    const size = fs.statSync(file).size;
    console.log(`   ${path.basename(file)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  });
  console.log('');
  
  // Optimize each file
  const results = [];
  let totalInputSize = 0;
  let totalOutputSize = 0;
  
  for (const file of files) {
    const outputFile = path.join(config.outputDir, path.basename(file));
    const result = optimizeGLBFile(file, outputFile, qualitySettings);
    
    if (result.success) {
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
    }
    
    results.push({
      file: path.basename(file),
      ...result
    });
    
    console.log(''); // Add spacing between files
  }
  
  // Summary
  console.log('📊 Optimization Summary:');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    const totalCompression = ((totalInputSize - totalOutputSize) / totalInputSize * 100).toFixed(1);
    console.log(`✅ Successfully optimized: ${successful.length} file(s)`);
    console.log(`   Total input size: ${(totalInputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total output size: ${(totalOutputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Overall compression: ${totalCompression}%`);
  }
  
  if (failed.length > 0) {
    console.log(`❌ Failed to optimize: ${failed.length} file(s)`);
    failed.forEach(f => {
      console.log(`   ${f.file}: ${f.error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('   • Test the optimized files in your application');
  console.log('   • Monitor loading performance and memory usage');
  console.log('   • Consider implementing progressive loading if not already done');
  console.log('   • Use the optimized files in production');
  
  if (config.backup) {
    console.log('\n💾 Backup:');
    console.log(`   Original files preserved in: ${config.inputDir}`);
    console.log(`   Optimized files saved to: ${config.outputDir}`);
  }
}

// Run the script
if (require.main === module) {
  try {
    optimizeGLBFiles();
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

module.exports = { optimizeGLBFiles, parseArgs, getQualitySettings };

