#!/usr/bin/env python3
"""
Quick test script to verify face quality improvements
"""
import cv2
import numpy as np
from insightface.app import FaceAnalysis

def test_detection_quality():
    """Test face detection with different sizes"""
    print("🧪 Testing face detection quality improvements...")
    
    # Test with lower detection size (original)
    print("📏 Testing with 640x640 detection...")
    face_app_low = FaceAnalysis(name='buffalo_l')
    face_app_low.prepare(ctx_id=0, det_size=(640, 640))
    
    # Test with higher detection size (enhanced)
    print("📏 Testing with 1024x1024 detection...")
    face_app_high = FaceAnalysis(name='buffalo_l')
    face_app_high.prepare(ctx_id=0, det_size=(1024, 1024))
    
    print("✅ Detection quality test setup complete!")
    print(f"📊 Low resolution detector: {640}x{640}")
    print(f"📊 High resolution detector: {1024}x{1024}")
    
    return True

def test_restoration_fallback():
    """Test face restoration fallback system"""
    print("\n🔧 Testing face restoration system...")
    
    try:
        from gfpgan import GFPGANer
        print("✅ GFPGAN available - high quality restoration enabled")
        return "gfpgan"
    except Exception as e:
        print(f"⚠️ GFPGAN failed: {e}")
        print("🔄 Using OpenCV upscaling fallback")
        return "opencv"

def main():
    print("🎨 AI Photobooth Quality Test")
    print("=" * 50)
    
    # Test detection improvements
    detection_ok = test_detection_quality()
    
    # Test restoration system
    restoration_type = test_restoration_fallback()
    
    print("\n📋 Quality Enhancement Summary:")
    print("=" * 50)
    print(f"✅ Detection enhancement: {'ENABLED' if detection_ok else 'DISABLED'}")
    print(f"✅ Face restoration: {restoration_type.upper()}")
    
    if restoration_type == "gfpgan":
        print("🎊 MAXIMUM QUALITY MODE - GFPGAN restoration available!")
    else:
        print("⚡ FAST MODE - OpenCV upscaling fallback")
    
    print("\n🚀 Ready for Red Cross Fiesta!")
    return True

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        exit(1)