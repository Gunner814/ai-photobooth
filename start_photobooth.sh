#!/bin/bash

echo "🎉 Starting Red Cross Fiesta AI Photobooth 🎉"
echo "=============================================="

# Check if conda is available
if command -v conda &> /dev/null; then
    echo "✅ Conda found"
    
    # Activate environment
    source ~/miniconda3/etc/profile.d/conda.sh
    conda activate photobooth
    
    echo "✅ Activated photobooth environment"
    echo "📍 Python version: $(python --version)"
    echo "📦 Installing any missing dependencies..."
    
    # Quick dependency check
    python -c "import flask, cv2, numpy, insightface, gfpgan; print('✅ All dependencies available')" 2>/dev/null || {
        echo "⚠️  Some dependencies missing, installing..."
        pip install -r requirements.txt
        pip install insightface --no-deps
    }
    
    echo "🚀 Starting photobooth server..."
    echo "📱 Open http://localhost:5000 in your browser"
    echo "💡 Use Ctrl+C to stop the server"
    echo ""
    
    python app.py
else
    echo "❌ Conda not found. Please install miniconda first."
    echo "💡 Or try: python app_simple.py (basic version without face swapping)"
fi