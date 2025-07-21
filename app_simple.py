import os
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, send_file
import base64
from io import BytesIO
from PIL import Image

app = Flask(__name__)

# Simple face detection without InsightFace for testing
def detect_faces_simple(image):
    """Simple face detection using OpenCV"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    return faces

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

@app.route('/process_swap', methods=['POST'])
def process_swap():
    """Process face swap - simplified version for testing"""
    try:
        # Get the captured image and selected template
        data = request.get_json()
        captured_image_data = data['captured_image']
        template_name = data['template']
        
        # Decode base64 image
        image_data = base64.b64decode(captured_image_data.split(',')[1])
        captured_img = Image.open(BytesIO(image_data))
        captured_img = cv2.cvtColor(np.array(captured_img), cv2.COLOR_RGB2BGR)
        
        # Load template image
        template_path = os.path.join('template', template_name)
        template_img = cv2.imread(template_path)
        
        if template_img is None:
            return jsonify({'error': 'Template image not found'}), 404
        
        # Simple face detection for testing
        captured_faces = detect_faces_simple(captured_img)
        template_faces = detect_faces_simple(template_img)
        
        if len(captured_faces) == 0:
            return jsonify({'error': 'No faces detected in captured image'}), 400
        
        if len(template_faces) == 0:
            return jsonify({'error': 'No faces detected in template image'}), 400
        
        # For now, just return the template image as a placeholder
        # This will be replaced with actual face swapping once InsightFace is working
        result_img = template_img.copy()
        
        # Draw rectangles around detected faces for testing
        for (x, y, w, h) in template_faces:
            cv2.rectangle(result_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        # Convert result to base64
        _, buffer = cv2.imencode('.jpg', result_img)
        result_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'result_image': f'data:image/jpeg;base64,{result_base64}',
            'faces_swapped': min(len(captured_faces), len(template_faces))
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)