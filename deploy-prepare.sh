#!/bin/bash

echo "🚀 Preparing backend for PostgreSQL deployment..."

# Remove SQLite database file
echo "🗑️  Removing SQLite database file..."
rm -f prisma/dev.db

# Generate Prisma client for PostgreSQL
echo "🔧 Generating Prisma client for PostgreSQL..."
npx prisma generate

# Build the application
echo "🏗️  Building the application..."
npm run build

echo "✅ Backend is ready for PostgreSQL deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Set your DATABASE_URL environment variable to your Render PostgreSQL connection string"
echo "2. Set JWT_SECRET to a secure random string"
echo "3. Deploy to Render using the render.yaml configuration"
echo ""
echo "🔗 Your DATABASE_URL should look like:"
echo "postgresql://mbl_gaming_user:yohhJbJqZ5z7cMQegx1eXvnjotkDJq8F@dpg-d2h0228gjchc73bldv1g-a:5432/mbl_gaming" 