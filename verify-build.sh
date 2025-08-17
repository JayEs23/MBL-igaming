#!/bin/bash

echo "🔍 Verifying backend build process..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if dist folder was created
if [ -d "dist" ]; then
    echo "✅ Build successful! Dist folder contents:"
    ls -la dist/
    
    if [ -f "dist/main.js" ]; then
        echo "✅ main.js found in dist folder"
    else
        echo "❌ main.js NOT found in dist folder"
    fi
else
    echo "❌ Build failed! Dist folder not created"
    exit 1
fi

echo "🎉 Build verification complete!" 