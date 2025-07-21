import os
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, send_file
import insightface
from insightface.app import FaceAnalysis
import base64
from io import BytesIO
from PIL import Image
import tempfile

app = Flask(__name__)

# Initialize InsightFace with higher detection size for better quality
face_app = FaceAnalysis(name='buffalo_l')
face_app.prepare(ctx_id=0, det_size=(1024, 1024))  # Increased from 640 to 1024

# Initialize face restoration with fallback
restorer = None
print("🔧 Attempting to initialize face restoration...")

try:
    # Try GFPGAN first
    from gfpgan import GFPGANer
    restorer = GFPGANer(
        model_path='https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth',
        upscale=2,
        arch='clean',
        channel_multiplier=2,
        bg_upsampler=None
    )
    print("✅ GFPGAN face restoration initialized")
except Exception as e1:
    print(f"⚠️ GFPGAN failed: {e1}")
    
    # Fallback to simple upscaling
    try:
        import cv2
        print("🔄 Using OpenCV upscaling as fallback...")
        
        class SimpleUpscaler:
            def enhance(self, image, **kwargs):
                # Simple cubic interpolation upscaling
                h, w = image.shape[:2]
                upscaled = cv2.resize(image, (w*2, h*2), interpolation=cv2.INTER_CUBIC)
                return None, None, upscaled
        
        restorer = SimpleUpscaler()
        print("✅ Simple upscaling fallback initialized")
    except Exception as e2:
        print(f"⚠️ All restoration methods failed: {e2}")
        print("Face restoration will be disabled")
        restorer = None

# Load face swapper model
try:
    swapper = insightface.model_zoo.get_model('models/inswapper_128.onnx', download=False)
except:
    print("Warning: Could not load swapper model. Make sure inswapper_128.onnx is in the models folder.")
    swapper = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_templates')
def get_templates():
    """Get list of available template images"""
    template_dir = 'template'
    templates = []
    
    if os.path.exists(template_dir):
        for filename in os.listdir(template_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                templates.append(filename)
    
    return jsonify({'templates': templates})

@app.route('/template/<filename>')
def serve_template(filename):
    """Serve template images"""
    return send_file(os.path.join('template', filename))

def enhance_face_quality(image, use_restoration=True):
    """Enhance face quality using face restoration"""
    if not use_restoration or not restorer:
        return image
    
    try:
        # GFPGAN expects RGB format
        if len(image.shape) == 3 and image.shape[2] == 3:
            # Convert BGR to RGB for GFPGAN
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image
        
        # Apply face restoration
        _, _, restored_img = restorer.enhance(image_rgb, has_aligned=False, only_center_face=False, paste_back=True)
        
        # Convert back to BGR for consistency
        restored_bgr = cv2.cvtColor(restored_img, cv2.COLOR_RGB2BGR)
        
        return restored_bgr
    except Exception as e:
        print(f"Face restoration failed: {e}")
        return image

@app.route('/process_swap', methods=['POST'])
def process_swap():
    """Process face swap between captured image and template with quality enhancement"""
    if not swapper:
        return jsonify({'error': 'Face swapper model not loaded'}), 500
    
    try:
        # Get the captured image and selected template
        data = request.get_json()
        captured_image_data = data['captured_image']
        template_name = data['template']
        use_enhancement = data.get('use_enhancement', True)  # Default to True
        
        # Decode base64 image
        image_data = base64.b64decode(captured_image_data.split(',')[1])
        captured_img = Image.open(BytesIO(image_data))
        captured_img = cv2.cvtColor(np.array(captured_img), cv2.COLOR_RGB2BGR)
        
        # Resize captured image if too small for better quality
        h, w = captured_img.shape[:2]
        if min(h, w) < 512:
            scale = 512 / min(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            captured_img = cv2.resize(captured_img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        
        # Load template image
        template_path = os.path.join('template', template_name)
        template_img = cv2.imread(template_path)
        
        if template_img is None:
            return jsonify({'error': 'Template image not found'}), 404
        
        # Resize template image if too small
        h, w = template_img.shape[:2]
        if min(h, w) < 512:
            scale = 512 / min(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            template_img = cv2.resize(template_img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        
        # Detect faces in both images
        captured_faces = face_app.get(captured_img)
        template_faces = face_app.get(template_img)
        
        if not captured_faces:
            return jsonify({'error': 'No faces detected in captured image'}), 400
        
        if not template_faces:
            return jsonify({'error': 'No faces detected in template image'}), 400
        
        # Sort faces by x-coordinate (left to right)
        captured_faces.sort(key=lambda x: x.bbox[0])
        template_faces.sort(key=lambda x: x.bbox[0])
        
        # Perform face swapping for each face pair
        result_img = template_img.copy()
        max_faces = min(len(captured_faces), len(template_faces))
        
        for i in range(max_faces):
            result_img = swapper.get(result_img, template_faces[i], captured_faces[i], paste_back=True)
        
        # Apply face quality enhancement if requested
        if use_enhancement:
            result_img = enhance_face_quality(result_img, use_restoration=True)
        
        # Convert result to base64
        _, buffer = cv2.imencode('.jpg', result_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        result_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'result_image': f'data:image/jpeg;base64,{result_base64}',
            'faces_swapped': max_faces,
            'enhanced': use_enhancement and restorer is not None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)