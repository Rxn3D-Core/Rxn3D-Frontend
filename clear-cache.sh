#!/bin/bash

# Script to clear Next.js cache and restart dev server

echo "🧹 Clearing Next.js cache..."

# Remove .next directory
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ Removed .next directory"
else
  echo "ℹ️  .next directory doesn't exist"
fi

# Remove node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ Removed node_modules/.cache"
fi

echo ""
echo "✨ Cache cleared! You can now restart your dev server with:"
echo "   npm run dev"
echo "   or"
echo "   pnpm dev"
echo "   or"
echo "   yarn dev"













