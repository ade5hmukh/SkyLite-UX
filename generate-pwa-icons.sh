#!/bin/bash

# Script to generate PWA icons from skylite.svg
# Requires: ImageMagick (install with: sudo apt install imagemagick)

echo "🎨 Generating PWA Icons from skylite.svg..."
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo ""
    echo "Please install ImageMagick:"
    echo "  Ubuntu/Debian: sudo apt install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo ""
    echo "Or use an online tool:"
    echo "  https://www.pwabuilder.com/imageGenerator"
    echo "  Upload public/skylite.svg and download the icons"
    exit 1
fi

# Generate regular icons
echo "📱 Generating 192x192 icon..."
convert public/skylite.svg -resize 192x192 -background none -gravity center -extent 192x192 public/icon-192.png

echo "📱 Generating 512x512 icon..."
convert public/skylite.svg -resize 512x512 -background none -gravity center -extent 512x512 public/icon-512.png

# Generate maskable icons (with padding for safe area)
echo "📱 Generating 192x192 maskable icon..."
convert public/skylite.svg -resize 154x154 -background "#06b6d4" -gravity center -extent 192x192 public/icon-maskable-192.png

echo "📱 Generating 512x512 maskable icon..."
convert public/skylite.svg -resize 410x410 -background "#06b6d4" -gravity center -extent 512x512 public/icon-maskable-512.png

echo ""
echo "✅ PWA icons generated successfully!"
echo ""
echo "Generated files:"
echo "  - public/icon-192.png (regular)"
echo "  - public/icon-512.png (regular)"
echo "  - public/icon-maskable-192.png (with safe area)"
echo "  - public/icon-maskable-512.png (with safe area)"
echo ""
echo "🎉 Your app is now ready to be installed as a PWA!"

