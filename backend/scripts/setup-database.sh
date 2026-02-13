#!/bin/bash

# Mentalist Stars - Database Setup Script
# This script creates the D1 database and applies the schema

echo "🎭 Mentalist Stars - Database Setup"
echo "===================================="

# Step 1: Create D1 database
echo ""
echo "📦 Creating D1 database..."
wrangler d1 create mentalist-stars-db

echo ""
echo "⚠️  IMPORTANT: Copy the database_id from above and add it to wrangler.toml"
echo "   under [[d1_databases]] > database_id"
echo ""
read -p "Press Enter after you've updated wrangler.toml..."

# Step 2: Apply schema
echo ""
echo "🗄️  Applying database schema..."
wrangler d1 execute mentalist-stars-db --file=./src/db/schema.sql

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev (to test locally)"
echo "2. Run: npm run deploy (to deploy to production)"
echo ""
echo "📊 To view your database:"
echo "   wrangler d1 execute mentalist-stars-db --command='SELECT * FROM mentalists'"
