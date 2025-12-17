#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Performance Analysis Starting...\n');

// Analyze bundle size
function analyzeBundleSize() {
  console.log('📦 Analyzing Bundle Size...');
  
  try {
    // Run Next.js build with bundle analyzer
    execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
    console.log('✅ Bundle analysis completed');
  } catch (error) {
    console.log('❌ Bundle analysis failed:', error.message);
  }
}

// Check for performance issues in components
function analyzeComponents() {
  console.log('\n🔍 Analyzing Component Performance...');
  
  const componentsDir = path.join(__dirname, '../components');
  const issues = [];
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        analyzeFile(filePath);
      }
    });
  }
  
  function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(__dirname, filePath);
    
    // Check for common performance issues
    const checks = [
      {
        name: 'Missing React.memo',
        pattern: /export\s+(?:default\s+)?function\s+\w+/g,
        condition: (match) => !content.includes('React.memo') && !content.includes('memo('),
        severity: 'medium'
      },
      {
        name: 'Inline event handlers',
        pattern: /onClick=\{\(\)\s*=>\s*[^}]+}/g,
        condition: () => true,
        severity: 'low'
      },
      {
        name: 'Missing useCallback',
        pattern: /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/g,
        condition: (match) => !content.includes('useCallback'),
        severity: 'medium'
      },
      {
        name: 'Missing useMemo for expensive calculations',
        pattern: /\.filter\(|\.map\(|\.reduce\(/g,
        condition: (match) => !content.includes('useMemo'),
        severity: 'high'
      },
      {
        name: 'Large component file',
        pattern: /./g,
        condition: () => content.split('\n').length > 200,
        severity: 'medium'
      }
    ];
    
    checks.forEach(check => {
      const matches = content.match(check.pattern);
      if (matches && check.condition(matches)) {
        issues.push({
          file: relativePath,
          issue: check.name,
          severity: check.severity
        });
      }
    });
  }
  
  scanDirectory(componentsDir);
  
  if (issues.length > 0) {
    console.log('⚠️  Performance issues found:');
    issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`${icon} ${issue.file}: ${issue.issue} (${issue.severity})`);
    });
  } else {
    console.log('✅ No major performance issues found');
  }
}

// Generate performance report
function generateReport() {
  console.log('\n📊 Generating Performance Report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    bundleAnalysis: 'Run ANALYZE=true npm run build to see bundle analysis',
    recommendations: [
      'Use React.memo for components that receive stable props',
      'Implement useCallback for event handlers',
      'Use useMemo for expensive calculations',
      'Implement virtual scrolling for large lists',
      'Add lazy loading for images and components',
      'Use debouncing for search inputs',
      'Implement code splitting for large components'
    ],
    nextSteps: [
      'Run Lighthouse audit in browser DevTools',
      'Monitor Core Web Vitals',
      'Profile components with React DevTools',
      'Implement suggested optimizations',
      'Test performance improvements'
    ]
  };
  
  const reportPath = path.join(__dirname, '../performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Performance report generated:', reportPath);
}

// Main execution
async function main() {
  try {
    analyzeComponents();
    generateReport();
    
    console.log('\n🎯 Performance Analysis Complete!');
    console.log('\nNext steps:');
    console.log('1. Run "ANALYZE=true npm run build" to analyze bundle size');
    console.log('2. Check performance-report.json for detailed recommendations');
    console.log('3. Implement suggested optimizations');
    console.log('4. Run Lighthouse audit in browser DevTools');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main(); 