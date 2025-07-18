/**
 * AI Face Swap Photo Booth Application
 * Red Cross Youth Fiesta 2025
 * 
 * This application provides real-time face detection and swapping capabilities
 * using Face-api.js for AI processing entirely in the browser.
 */

class PhotoBoothApp {
    constructor() {
        this.video = null;
        this.stream = null;
        this.currentScreen = 'welcome';
        this.selectedTemplate = null;
        this.faceMatcher = null;
        this.isModelLoaded = false;
        this.cameras = [];
        this.currentCameraIndex = 0;
        this.faceDetectionInterval = null;
        this.capturedImage = null;
        
        // Face templates - These are placeholder images that can be replaced with real celebrity/character images
        this.faceTemplates = [
            {
                id: 'superhero1',
                name: 'Superhero',
                emoji: '🦸‍♂️',
                // In production, replace with actual base64 image or URL
                imageUrl: this.generatePlaceholderImage('🦸‍♂️', '#1e40af')
            },
            {
                id: 'superhero2',
                name: 'Wonder Woman',
                emoji: '🦸‍♀️',
                imageUrl: this.generatePlaceholderImage('🦸‍♀️', '#dc2626')
            },
            {
                id: 'pirate',
                name: 'Pirate',
                emoji: '🏴‍☠️',
                imageUrl: this.generatePlaceholderImage('🏴‍☠️', '#7c2d12')
            },
            {
                id: 'astronaut',
                name: 'Astronaut',
                emoji: '👨‍🚀',
                imageUrl: this.generatePlaceholderImage('👨‍🚀', '#1f2937')
            },
            {
                id: 'princess',
                name: 'Princess',
                emoji: '👸',
                imageUrl: this.generatePlaceholderImage('👸', '#db2777')
            },
            {
                id: 'ninja',
                name: 'Ninja',
                emoji: '🥷',
                imageUrl: this.generatePlaceholderImage('🥷', '#374151')
            },
            {
                id: 'wizard',
                name: 'Wizard',
                emoji: '🧙‍♂️',
                imageUrl: this.generatePlaceholderImage('🧙‍♂️', '#7c3aed')
            },
            {
                id: 'robot',
                name: 'Robot',
                emoji: '🤖',
                imageUrl: this.generatePlaceholderImage('🤖', '#059669')
            }
        ];
        
        this.init();
    }

    /**
     * Generate a placeholder image for face templates
     * This can be replaced with actual celebrity/character images
     */
    generatePlaceholderImage(emoji, bgColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Create gradient background
        const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(1, this.shadeColor(bgColor, -20));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 300);
        
        // Add emoji
        ctx.font = '120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 150, 150);
        
        return canvas.toDataURL();
    }
    
    /**
     * Utility function to darken/lighten colors
     */
    shadeColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Initialize the application
     */
    async init() {
        this.bindEvents();
        this.populateTemplates();
        await this.loadAIModels();
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Navigation buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startPhotoSession());
        document.getElementById('back-to-welcome-btn').addEventListener('click', () => this.showScreen('welcome'));
        document.getElementById('switch-camera-btn').addEventListener('click', () => this.switchCamera());
        
        // Capture and countdown
        document.getElementById('capture-btn').addEventListener('click', () => this.startCountdown());
        document.getElementById('cancel-countdown-btn').addEventListener('click', () => this.cancelCountdown());
        
        // Result actions
        document.getElementById('download-btn').addEventListener('click', () => this.downloadImage());
        document.getElementById('share-btn').addEventListener('click', () => this.shareImage());
        document.getElementById('print-btn').addEventListener('click', () => this.printImage());
        document.getElementById('email-btn').addEventListener('click', () => this.emailImage());
        document.getElementById('qr-btn').addEventListener('click', () => this.showQRCode());
        document.getElementById('retake-btn').addEventListener('click', () => this.retakePhoto());
        
        // Error handling
        document.getElementById('retry-btn').addEventListener('click', () => this.startPhotoSession());
        document.getElementById('back-to-start-btn').addEventListener('click', () => this.showScreen('welcome'));
        
        // Modal controls
        document.getElementById('close-qr-modal').addEventListener('click', () => this.closeQRModal());
        document.getElementById('qr-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-modal') this.closeQRModal();
        });
        
        // Custom image upload
        document.getElementById('custom-image-upload').addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Resize handler for responsive video
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyPress(e) {
        switch(e.key) {
            case ' ':
                if (this.currentScreen === 'camera') {
                    e.preventDefault();
                    this.startCountdown();
                }
                break;
            case 'Escape':
                if (this.currentScreen === 'countdown') {
                    this.cancelCountdown();
                } else if (document.getElementById('qr-modal').classList.contains('active')) {
                    this.closeQRModal();
                }
                break;
            case 'Enter':
                if (this.currentScreen === 'welcome') {
                    this.startPhotoSession();
                }
                break;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.video && this.currentScreen === 'camera') {
            // Adjust video dimensions if needed
            this.setupFaceDetection();
        }
    }

    /**
     * Load AI models for face detection
     */
    async loadAIModels() {
        try {
            this.showLoadingOverlay('Loading AI models...');
            
            // Load face-api.js models from CDN
            // Using a different approach due to CDN path issues
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.isModelLoaded = true;
            this.hideLoadingOverlay();
            console.log('AI models loaded successfully');
        } catch (error) {
            console.error('Error loading AI models:', error);
            this.hideLoadingOverlay();
            this.showError('Failed to load AI models', 'Please refresh the page and try again.');
        }
    }

    /**
     * Populate face templates in the UI
     */
    populateTemplates() {
        const templateGrid = document.getElementById('template-grid');
        templateGrid.innerHTML = '';
        
        this.faceTemplates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = `template-item ${template.isCustom ? 'custom-template' : ''}`;
            templateItem.dataset.templateId = template.id;
            
            if (template.isCustom) {
                // For custom uploaded images, show the actual image
                const img = document.createElement('img');
                img.src = template.imageUrl;
                img.alt = template.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                
                templateItem.appendChild(img);
                
                // Add remove button for custom templates
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove custom template';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeCustomTemplate(template.id);
                });
                templateItem.appendChild(removeBtn);
                
            } else {
                // For default emoji templates, show placeholder
                templateItem.innerHTML = `
                    <div class="template-placeholder">
                        <div class="emoji">${template.emoji}</div>
                        <div>${template.name}</div>
                    </div>
                `;
            }
            
            templateItem.addEventListener('click', () => this.selectTemplate(template));
            templateGrid.appendChild(templateItem);
        });
    }

    /**
     * Handle custom image upload
     */
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file!');
                return;
            }
            
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Image size must be less than 10MB!');
                return;
            }
            
            // Convert to data URL
            const dataUrl = await this.fileToDataUrl(file);
            
            // Validate that the image contains a face
            const isValidFace = await this.validateFaceInImage(dataUrl);
            if (!isValidFace) {
                alert('No face detected in the uploaded image. Please choose an image with a clear face.');
                return;
            }
            
            // Create custom template
            const customTemplate = {
                id: `custom_${Date.now()}`,
                name: 'Custom Face',
                emoji: '📷',
                imageUrl: dataUrl,
                isCustom: true
            };
            
            // Add to templates array
            this.faceTemplates.push(customTemplate);
            
            // Re-populate templates
            this.populateTemplates();
            
            // Auto-select the custom template
            this.selectTemplate(customTemplate);
            
            console.log('Custom template added:', file.name);
            
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        }
    }
    
    /**
     * Convert file to data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Validate that an image contains a detectable face
     */
    async validateFaceInImage(imageUrl) {
        if (!this.isModelLoaded) {
            console.warn('AI models not loaded, skipping face validation');
            return true; // Allow upload if models aren't loaded
        }
        
        try {
            const img = new Image();
            img.src = imageUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            const detections = await faceapi
                .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();
            
            return detections.length > 0;
        } catch (error) {
            console.warn('Face validation failed:', error);
            return true; // Allow upload if validation fails
        }
    }

    /**
     * Remove a custom template
     */
    removeCustomTemplate(templateId) {
        // Remove from templates array
        this.faceTemplates = this.faceTemplates.filter(t => t.id !== templateId);
        
        // If this was the selected template, clear selection
        if (this.selectedTemplate && this.selectedTemplate.id === templateId) {
            this.selectedTemplate = null;
            document.getElementById('capture-btn').disabled = true;
            document.getElementById('instruction-text').textContent = 'Select a character template above, then click capture!';
        }
        
        // Re-populate templates
        this.populateTemplates();
    }

    /**
     * Select a face template
     */
    selectTemplate(template) {
        // Handle both template objects and template IDs
        if (typeof template === 'string') {
            template = this.faceTemplates.find(t => t.id === template);
        }
        
        if (!template) return;
        
        // Remove previous selection
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        const templateElement = document.querySelector(`[data-template-id="${template.id}"]`);
        if (templateElement) {
            templateElement.classList.add('selected');
        }
        
        this.selectedTemplate = template;
        document.getElementById('capture-btn').disabled = false;
        document.getElementById('instruction-text').textContent = 'Perfect! Now click capture to take your photo.';
        
        console.log('Selected template:', template.name);
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const messageEl = overlay.querySelector('p');
        messageEl.textContent = message;
        overlay.classList.add('active');
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    /**
     * Show a specific screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
        
        // Cleanup based on screen
        if (screenName !== 'camera' && this.faceDetectionInterval) {
            clearInterval(this.faceDetectionInterval);
            this.faceDetectionInterval = null;
        }
    }

    /**
     * Start photo session
     */
    async startPhotoSession() {
        try {
            await this.initCamera();
            this.showScreen('camera');
            this.setupFaceDetection();
        } catch (error) {
            console.error('Error starting photo session:', error);
            this.showError('Camera Access Denied', 'Please allow camera access to use the photo booth.');
        }
    }

    /**
     * Initialize camera
     */
    async initCamera() {
        try {
            // Get available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');
            
            if (this.cameras.length === 0) {
                throw new Error('No cameras found');
            }
            
            // Show/hide camera switch button
            document.getElementById('switch-camera-btn').style.display = 
                this.cameras.length > 1 ? 'flex' : 'none';
            
            await this.startCamera();
        } catch (error) {
            throw new Error(`Camera initialization failed: ${error.message}`);
        }
    }

    /**
     * Start camera stream
     */
    async startCamera() {
        try {
            // Stop existing stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: {
                    deviceId: this.cameras[this.currentCameraIndex]?.deviceId,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: this.cameras.length === 1 ? 'user' : undefined
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video = document.getElementById('video');
            this.video.srcObject = this.stream;
            
            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });
            
            console.log('Camera started successfully');
        } catch (error) {
            throw new Error(`Failed to start camera: ${error.message}`);
        }
    }

    /**
     * Switch between available cameras
     */
    async switchCamera() {
        if (this.cameras.length <= 1) return;
        
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        await this.startCamera();
        this.setupFaceDetection();
    }

    /**
     * Setup face detection overlay
     */
    setupFaceDetection() {
        if (!this.isModelLoaded || !this.video) return;
        
        // Clear existing interval
        if (this.faceDetectionInterval) {
            clearInterval(this.faceDetectionInterval);
        }
        
        // Setup overlay canvas
        const overlay = document.getElementById('overlay-canvas');
        const video = this.video;
        
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        
        // Start face detection
        this.faceDetectionInterval = setInterval(async () => {
            await this.detectFaces();
        }, 200); // Check every 200ms for performance
    }

    /**
     * Detect faces in video stream
     */
    async detectFaces() {
        if (!this.video || !this.isModelLoaded) return;
        
        try {
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();
            
            // Clear previous detections
            const overlay = document.getElementById('face-detection-overlay');
            overlay.innerHTML = '';
            
            // Draw face boxes
            detections.forEach((detection, index) => {
                const box = detection.detection.box;
                const videoRect = this.video.getBoundingClientRect();
                const scaleX = videoRect.width / this.video.videoWidth;
                const scaleY = videoRect.height / this.video.videoHeight;
                
                const faceBox = document.createElement('div');
                faceBox.className = 'face-box';
                faceBox.style.left = `${box.x * scaleX}px`;
                faceBox.style.top = `${box.y * scaleY}px`;
                faceBox.style.width = `${box.width * scaleX}px`;
                faceBox.style.height = `${box.height * scaleY}px`;
                
                overlay.appendChild(faceBox);
            });
            
            // Update instruction text based on detected faces
            const instructionText = document.getElementById('instruction-text');
            if (detections.length === 0) {
                instructionText.textContent = 'No faces detected. Please look at the camera.';
            } else if (detections.length === 1) {
                instructionText.textContent = this.selectedTemplate ? 
                    'Perfect! One face detected. Ready to capture.' :
                    'Great! Face detected. Now select a character template.';
            } else {
                instructionText.textContent = `${detections.length} faces detected. Perfect for group photos!`;
            }
            
        } catch (error) {
            console.error('Face detection error:', error);
        }
    }

    /**
     * Start countdown before capture
     */
    async startCountdown() {
        if (!this.selectedTemplate) {
            alert('Please select a character template first!');
            return;
        }
        
        this.showScreen('countdown');
        
        const countdownNumber = document.getElementById('countdown-number');
        let count = 3;
        
        const countdownInterval = setInterval(() => {
            countdownNumber.textContent = count;
            count--;
            
            if (count < 0) {
                clearInterval(countdownInterval);
                this.capturePhoto();
            }
        }, 1000);
        
        // Store interval for cancellation
        this.countdownInterval = countdownInterval;
    }

    /**
     * Cancel countdown
     */
    cancelCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        this.showScreen('camera');
    }

    /**
     * Capture photo and process with AI
     */
    async capturePhoto() {
        try {
            this.showScreen('processing');
            this.updateProcessingStatus('Capturing image...', 20);
            
            // Capture image from video
            const canvas = document.getElementById('processing-canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            ctx.drawImage(this.video, 0, 0);
            
            this.updateProcessingStatus('Detecting faces...', 40);
            
            // Detect faces in captured image
            const detections = await faceapi
                .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();
            
            if (detections.length === 0) {
                throw new Error('No faces detected in the captured image');
            }
            
            this.updateProcessingStatus('Processing face swap...', 60);
            
            // Process face swap
            const resultCanvas = await this.processFaceSwap(canvas, detections);
            
            this.updateProcessingStatus('Finalizing result...', 80);
            
            // Add Red Cross Youth branding
            const finalCanvas = this.addBranding(resultCanvas);
            
            this.updateProcessingStatus('Complete!', 100);
            
            // Show result
            setTimeout(() => {
                this.showResult(finalCanvas);
            }, 500);
            
        } catch (error) {
            console.error('Capture error:', error);
            this.showError('Capture Failed', error.message);
        }
    }

    /**
     * Update processing status
     */
    updateProcessingStatus(message, progress) {
        document.getElementById('processing-status').textContent = message;
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }

    /**
     * Process face swap using AI with realistic landmark-based blending
     * Takes the user's face from camera and puts it into the template image
     */
    async processFaceSwap(sourceCanvas, detections) {
        // Create template image
        const templateImg = new Image();
        templateImg.src = this.selectedTemplate.imageUrl;
        
        await new Promise(resolve => {
            templateImg.onload = resolve;
        });
        
        // Create result canvas with template image dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = templateImg.width;
        canvas.height = templateImg.height;
        
        // Draw template image as background
        ctx.drawImage(templateImg, 0, 0);
        
        // Detect faces in the template image with multiple detection methods
        let templateDetections = [];
        
        // Try multiple face detection configurations with available models
        const detectionMethods = [
            // High resolution, lower threshold for better detection
            () => faceapi.detectAllFaces(templateImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.2 })).withFaceLandmarks(),
            // Medium resolution, low threshold  
            () => faceapi.detectAllFaces(templateImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })).withFaceLandmarks(),
            // Lower resolution, higher threshold
            () => faceapi.detectAllFaces(templateImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })).withFaceLandmarks(),
            // Very permissive detection
            () => faceapi.detectAllFaces(templateImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.1 })).withFaceLandmarks()
        ];
        
        // Try each detection method until we find faces
        for (const method of detectionMethods) {
            try {
                console.log('Attempting face detection in template image...');
                templateDetections = await method();
                if (templateDetections && templateDetections.length > 0) {
                    console.log(`Found ${templateDetections.length} face(s) in template image`);
                    break;
                }
            } catch (error) {
                console.warn('Face detection method failed:', error);
                continue;
            }
        }
        
        if (!templateDetections || templateDetections.length === 0) {
            console.warn('Could not detect faces in template with any method, using fallback positioning');
        }
        
        // Debug logging
        console.log(`Source faces detected: ${detections.length}`);
        console.log(`Template faces detected: ${templateDetections.length}`);
        
        // For each detected face in the source (camera), swap with template faces
        for (let i = 0; i < detections.length && i < Math.max(1, templateDetections.length); i++) {
            const sourceFace = detections[i];
            const sourceBox = sourceFace.detection.box;
            const sourceLandmarks = sourceFace.landmarks;
            
            console.log(`Processing face ${i + 1}/${detections.length}`);
            
            // Determine target position and landmarks
            let targetBox, targetLandmarks;
            if (templateDetections[i]) {
                targetBox = templateDetections[i].detection.box;
                targetLandmarks = templateDetections[i].landmarks;
                console.log('Using detected template face for target positioning');
            } else {
                // Fallback: place in center/top area of template
                const size = Math.min(canvas.width, canvas.height) * 0.3;
                targetBox = {
                    x: (canvas.width - size) / 2,
                    y: canvas.height * 0.2,
                    width: size,
                    height: size
                };
                targetLandmarks = null;
                console.log('Using fallback positioning for target');
            }
            
            // Perform enhanced face swap with landmark-based masking
            console.log('About to perform face swap:', {
                sourceBox,
                targetBox,
                hasSourceLandmarks: !!sourceLandmarks,
                hasTargetLandmarks: !!targetLandmarks
            });
            
            await this.performEnhancedFaceSwap(
                sourceCanvas, sourceFace, sourceBox, sourceLandmarks,
                canvas, targetBox, targetLandmarks
            );
            
            console.log('Face swap completed for face', i + 1);
        }
        
        console.log('processFaceSwap completed, returning canvas with dimensions:', {
            width: canvas.width,
            height: canvas.height
        });
        
        return canvas;
    }
    
    /**
     * Enhanced face swap with Delaunay triangulation morphing and advanced blending
     */
    async performEnhancedFaceSwap(sourceCanvas, sourceFace, sourceBox, sourceLandmarks, 
                                  targetCanvas, targetBox, targetLandmarks) {
        console.log('performEnhancedFaceSwap called with:', {
            hasSourceCanvas: !!sourceCanvas,
            hasSourceFace: !!sourceFace,
            hasSourceBox: !!sourceBox,
            hasSourceLandmarks: !!sourceLandmarks,
            hasTargetCanvas: !!targetCanvas,
            hasTargetBox: !!targetBox,
            hasTargetLandmarks: !!targetLandmarks
        });
        
        const ctx = targetCanvas.getContext('2d');
        
        if (!sourceLandmarks) {
            // No source landmarks - can't perform any face swap
            console.warn('No source landmarks available for face swapping');
            return;
        }
        
        if (!targetLandmarks) {
            // No target landmarks - use simple face swap with positioning
            console.log('No target landmarks, using simple face swap method');
            return this.performSimpleFaceSwap(sourceCanvas, sourceFace, sourceBox, targetCanvas, targetBox);
        }
        
        console.log('Both source and target landmarks available, proceeding with Delaunay triangulation');
        
        try {
            console.log('Step 1: Starting color correction...');
            // Step 1: Apply color correction to source image first
            const colorCorrectedSource = await this.applyBasicColorCorrection(
                sourceCanvas, targetCanvas, targetBox
            );
            console.log('Step 1: Color correction completed');
            
            console.log('Step 2: Starting FIXED Delaunay triangulation face morphing...');
            // Step 2: Perform FIXED Delaunay triangulation face morphing
            await this.performFixedDelaunayFaceMorphing(
                colorCorrectedSource, sourceLandmarks, sourceBox,
                targetCanvas, targetLandmarks, targetBox
            );
            console.log('Step 2: FIXED Delaunay triangulation completed successfully');
            
        } catch (error) {
            console.warn('Delaunay morphing failed, falling back to simple method:', error);
            console.error('Full error details:', error);
            
            // Fallback to working simple method
            console.log('Using working simple face swap method as fallback');
            const sourceFaceCanvas = this.extractFaceWithLandmarks(sourceCanvas, sourceBox, sourceLandmarks);
            const faceMask = this.createTargetFaceMask(targetCanvas, targetBox, targetLandmarks);
            const colorCorrectedFace = await this.applyBasicColorCorrection(sourceFaceCanvas, targetCanvas, targetBox);
            const scaledFaceCanvas = this.scaleAndPositionFace(colorCorrectedFace, sourceBox, targetBox);
            const targetCtx = targetCanvas.getContext('2d');
            this.applyFaceWithMask(targetCtx, scaledFaceCanvas, faceMask, targetBox);
        }
    }
    
    /**
     * Fallback simple face swap method
     */
    async performSimpleFaceSwap(sourceCanvas, sourceFace, sourceBox, targetCanvas, targetBox) {
        const ctx = targetCanvas.getContext('2d');
        
        // Extract source face
        const sourceFaceCanvas = this.extractFaceWithLandmarks(sourceCanvas, sourceBox, sourceFace.landmarks);
        
        // Create mask
        const faceMarkCanvas = this.createLandmarkBasedMask(sourceBox, sourceFace.landmarks);
        
        // Apply color correction
        const colorCorrectedFace = await this.applyBasicColorCorrection(sourceFaceCanvas, targetCanvas, targetBox);
        
        // Calculate positioning
        const positioning = this.calculateLandmarkAlignment(sourceFace.landmarks, null, sourceBox, targetBox);
        
        // Apply with blending
        this.applyFaceWithFeatheredBlending(ctx, colorCorrectedFace, faceMarkCanvas, positioning);
    }
    
    /**
     * Extract face region using landmark-based boundaries
     */
    extractFaceWithLandmarks(sourceCanvas, sourceBox, landmarks) {
        const faceCanvas = document.createElement('canvas');
        const faceCtx = faceCanvas.getContext('2d');
        
        faceCanvas.width = sourceBox.width;
        faceCanvas.height = sourceBox.height;
        
        // Draw the source face region
        faceCtx.drawImage(
            sourceCanvas,
            sourceBox.x, sourceBox.y, sourceBox.width, sourceBox.height,
            0, 0, faceCanvas.width, faceCanvas.height
        );
        
        return faceCanvas;
    }
    
    /**
     * Create anatomically accurate mask using facial landmarks
     */
    createLandmarkBasedMask(faceBox, landmarks) {
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        
        maskCanvas.width = faceBox.width;
        maskCanvas.height = faceBox.height;
        
        if (!landmarks) {
            // Fallback to circular mask if no landmarks
            const centerX = faceBox.width / 2;
            const centerY = faceBox.height / 2;
            const radius = Math.min(faceBox.width, faceBox.height) / 2.5;
            
            maskCtx.fillStyle = 'white';
            maskCtx.beginPath();
            maskCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            maskCtx.fill();
            
            return this.createFeatheredMask(maskCanvas);
        }
        
        // Get key facial boundary points
        const jawLine = landmarks.getJawOutline();
        const leftEyebrow = landmarks.getLeftEyeBrow();
        const rightEyebrow = landmarks.getRightEyeBrow();
        
        // Create face outline combining jawline and eyebrows
        const faceOutline = [
            ...jawLine,
            ...rightEyebrow.slice().reverse(),
            ...leftEyebrow
        ];
        
        // Convert landmarks to relative coordinates
        const relativePoints = faceOutline.map(point => ({
            x: point.x - faceBox.x,
            y: point.y - faceBox.y
        }));
        
        // Draw the anatomical face shape
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.moveTo(relativePoints[0].x, relativePoints[0].y);
        
        for (let i = 1; i < relativePoints.length; i++) {
            maskCtx.lineTo(relativePoints[i].x, relativePoints[i].y);
        }
        
        maskCtx.closePath();
        maskCtx.fill();
        
        // Create feathered version for smooth blending
        return this.createFeatheredMask(maskCanvas);
    }
    
    /**
     * Create feathered mask for seamless blending
     */
    createFeatheredMask(solidMask) {
        const featheredCanvas = document.createElement('canvas');
        const featheredCtx = featheredCanvas.getContext('2d');
        
        featheredCanvas.width = solidMask.width;
        featheredCanvas.height = solidMask.height;
        
        // Apply heavy blur for feathering effect
        featheredCtx.filter = 'blur(8px)';
        featheredCtx.drawImage(solidMask, 0, 0);
        
        // Draw again without blur to strengthen the center
        featheredCtx.filter = 'none';
        featheredCtx.globalCompositeOperation = 'source-over';
        featheredCtx.globalAlpha = 0.7;
        featheredCtx.drawImage(solidMask, 0, 0);
        
        featheredCtx.globalAlpha = 1.0;
        featheredCtx.globalCompositeOperation = 'source-over';
        
        return featheredCanvas;
    }
    
    /**
     * Create face mask with target canvas dimensions for proper blending
     */
    createTargetFaceMask(targetCanvas, targetBox, targetLandmarks) {
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        
        // Use target canvas dimensions
        maskCanvas.width = targetCanvas.width;
        maskCanvas.height = targetCanvas.height;
        
        if (!targetLandmarks) {
            // Fallback to circular mask if no landmarks
            const centerX = targetBox.x + targetBox.width / 2;
            const centerY = targetBox.y + targetBox.height / 2;
            const radius = Math.min(targetBox.width, targetBox.height) / 2.5;
            
            maskCtx.fillStyle = 'white';
            maskCtx.beginPath();
            maskCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            maskCtx.fill();
            
            return maskCanvas;
        }
        
        // Create landmark-based mask using target landmarks at full canvas coordinates
        const positions = targetLandmarks.positions || targetLandmarks._positions;
        
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        
        // Start with central jaw line (landmarks 4-12) - excludes ear areas
        maskCtx.moveTo(positions[4].x, positions[4].y);
        for (let i = 5; i <= 12; i++) {
            maskCtx.lineTo(positions[i].x, positions[i].y);
        }
        
        // Connect to nose bridge area (avoiding eyebrows)
        // Use points around the eyes but stay below eyebrows
        const rightEyeOuter = positions[45]; // Right eye outer corner
        const leftEyeOuter = positions[36];  // Left eye outer corner
        const noseTop = positions[27];       // Nose top
        
        // Create a path that goes around eyes but excludes eyebrows
        maskCtx.lineTo(rightEyeOuter.x + 5, rightEyeOuter.y);
        maskCtx.lineTo(noseTop.x + 10, noseTop.y - 10); // Just above nose bridge
        maskCtx.lineTo(noseTop.x - 10, noseTop.y - 10);
        maskCtx.lineTo(leftEyeOuter.x - 5, leftEyeOuter.y);
        
        maskCtx.closePath();
        maskCtx.fill();
        
        return maskCanvas;
    }
    
    /**
     * FIXED Delaunay triangulation-based face morphing
     */
    async performFixedDelaunayFaceMorphing(sourceCanvas, sourceLandmarks, sourceBox, 
                                         targetCanvas, targetLandmarks, targetBox) {
        console.log('Starting FIXED Delaunay triangulation with proper face extraction');
        
        // Step 1: Extract faces properly (like the working method)
        const sourceFaceCanvas = this.extractFaceWithLandmarks(sourceCanvas, sourceBox, sourceLandmarks);
        console.log('Source face extracted');
        
        // Step 2: Create proper target mask
        const faceMask = this.createTargetFaceMask(targetCanvas, targetBox, targetLandmarks);
        console.log('Target face mask created');
        
        // Step 3: Get landmark points for triangulation
        const sourcePoints = this.getFaceLandmarkPoints(sourceLandmarks, sourceBox);
        const targetPoints = this.getFaceLandmarkPoints(targetLandmarks, targetBox);
        
        // Step 4: Add boundary points for complete coverage
        const sourcePointsWithBoundary = this.addFaceBoundaryPoints(sourcePoints, sourceLandmarks, sourceBox);
        const targetPointsWithBoundary = this.addFaceBoundaryPoints(targetPoints, targetLandmarks, targetBox);
        
        console.log(`Triangulation points: ${sourcePointsWithBoundary.length} source, ${targetPointsWithBoundary.length} target`);
        
        // Step 5: Create Delaunay triangulation from target points
        const delaunay = d3.Delaunay.from(targetPointsWithBoundary.map(p => [p.x, p.y]));
        const triangles = delaunay.triangles;
        console.log(`Generated ${triangles.length / 3} triangles`);
        
        // Step 6: Create morphed face canvas (same size as target area)
        const morphedCanvas = document.createElement('canvas');
        const morphedCtx = morphedCanvas.getContext('2d');
        morphedCanvas.width = targetBox.width;
        morphedCanvas.height = targetBox.height;
        
        // Step 7: Process each triangle with proper coordinate mapping
        let trianglesProcessed = 0;
        for (let i = 0; i < triangles.length; i += 3) {
            const t1 = triangles[i];
            const t2 = triangles[i + 1];
            const t3 = triangles[i + 2];
            
            // Get triangle vertices in target coordinates
            const targetTriangle = [
                { x: targetPointsWithBoundary[t1].x - targetBox.x, y: targetPointsWithBoundary[t1].y - targetBox.y },
                { x: targetPointsWithBoundary[t2].x - targetBox.x, y: targetPointsWithBoundary[t2].y - targetBox.y },
                { x: targetPointsWithBoundary[t3].x - targetBox.x, y: targetPointsWithBoundary[t3].y - targetBox.y }
            ];
            
            // Get corresponding source triangle vertices
            const sourceTriangle = [
                { x: sourcePointsWithBoundary[t1].x - sourceBox.x, y: sourcePointsWithBoundary[t1].y - sourceBox.y },
                { x: sourcePointsWithBoundary[t2].x - sourceBox.x, y: sourcePointsWithBoundary[t2].y - sourceBox.y },
                { x: sourcePointsWithBoundary[t3].x - sourceBox.x, y: sourcePointsWithBoundary[t3].y - sourceBox.y }
            ];
            
            // Skip degenerate triangles
            if (this.isDegenerate(targetTriangle) || this.isDegenerate(sourceTriangle)) {
                continue;
            }
            
            // Draw warped triangle
            this.drawWarpedTriangle(morphedCtx, sourceFaceCanvas, sourceTriangle, targetTriangle);
            trianglesProcessed++;
        }
        
        console.log(`Processed ${trianglesProcessed} valid triangles`);
        
        // Step 8: Apply the morphed face using the mask (like working method)
        const targetCtx = targetCanvas.getContext('2d');
        this.applyMorphedFaceToTarget(targetCtx, morphedCanvas, faceMask, targetBox);
        
        console.log('FIXED Delaunay triangulation morphing completed');
    }
    
    /**
     * Apply morphed face to target canvas with proper positioning
     */
    applyMorphedFaceToTarget(ctx, morphedCanvas, faceMask, targetBox) {
        // Create feathered mask
        const featheredMask = this.createFeatheredMask(faceMask);
        
        // Apply lighting and color corrections to morphed face
        const enhancedMorphedCanvas = this.applyLightingAndColorCorrection(morphedCanvas, ctx.canvas, targetBox);
        
        // Create blend canvas
        const blendCanvas = document.createElement('canvas');
        const blendCtx = blendCanvas.getContext('2d');
        blendCanvas.width = faceMask.width;
        blendCanvas.height = faceMask.height;
        
        // Draw the enhanced morphed face at target position
        blendCtx.drawImage(enhancedMorphedCanvas, targetBox.x, targetBox.y);
        
        // Apply mask
        blendCtx.globalCompositeOperation = 'destination-in';
        blendCtx.drawImage(featheredMask, 0, 0);
        
        // Draw final result with good visibility
        ctx.globalAlpha = 0.85;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(blendCanvas, 0, 0);
        ctx.globalAlpha = 1.0;
        
        console.log('Enhanced morphed face applied to target canvas');
    }
    
    /**
     * Apply advanced lighting and color correction to match target image
     */
    applyLightingAndColorCorrection(morphedCanvas, targetCanvas, targetBox) {
        const enhancedCanvas = document.createElement('canvas');
        const enhancedCtx = enhancedCanvas.getContext('2d', { willReadFrequently: true });
        
        enhancedCanvas.width = morphedCanvas.width;
        enhancedCanvas.height = morphedCanvas.height;
        
        // Draw original morphed face
        enhancedCtx.drawImage(morphedCanvas, 0, 0);
        
        // Analyze target lighting around face area
        const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const targetData = targetCtx.getImageData(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
        const lightingProfile = this.analyzeLighting(targetData);
        
        // Get morphed face data
        const morphedData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        
        // Apply lighting corrections
        this.applyLightingEffects(morphedData, lightingProfile);
        
        // Apply color temperature matching
        this.applyColorTemperatureMatching(morphedData, lightingProfile);
        
        // Apply contrast and brightness adjustments
        this.applyContrastBrightnessAdjustments(morphedData, lightingProfile);
        
        // Put corrected data back
        enhancedCtx.putImageData(morphedData, 0, 0);
        
        console.log('Applied lighting and color corrections:', lightingProfile);
        return enhancedCanvas;
    }
    
    /**
     * Analyze lighting characteristics of target area
     */
    analyzeLighting(imageData) {
        const data = imageData.data;
        let totalR = 0, totalG = 0, totalB = 0;
        let totalLuminance = 0;
        let minLuminance = 255;
        let maxLuminance = 0;
        const pixels = data.length / 4;
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            totalR += r;
            totalG += g;
            totalB += b;
            
            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += luminance;
            minLuminance = Math.min(minLuminance, luminance);
            maxLuminance = Math.max(maxLuminance, luminance);
        }
        
        const samplePixels = pixels / 4;
        const avgR = totalR / samplePixels;
        const avgG = totalG / samplePixels;
        const avgB = totalB / samplePixels;
        const avgLuminance = totalLuminance / samplePixels;
        
        return {
            avgColor: { r: avgR, g: avgG, b: avgB },
            avgLuminance: avgLuminance,
            contrast: maxLuminance - minLuminance,
            colorTemperature: this.calculateColorTemperature(avgR, avgG, avgB),
            brightness: avgLuminance / 255
        };
    }
    
    /**
     * Apply lighting effects based on target lighting profile
     */
    applyLightingEffects(imageData, lightingProfile) {
        const data = imageData.data;
        const targetBrightness = lightingProfile.brightness;
        const targetContrast = lightingProfile.contrast / 255;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Apply gentler brightness adjustment to avoid darkness
            let newR = r * (0.9 + targetBrightness * 0.2);
            let newG = g * (0.9 + targetBrightness * 0.2);
            let newB = b * (0.9 + targetBrightness * 0.2);
            
            // Apply gentler contrast adjustment
            const contrast = 0.9 + targetContrast * 0.2;
            newR = ((newR - 128) * contrast) + 128;
            newG = ((newG - 128) * contrast) + 128;
            newB = ((newB - 128) * contrast) + 128;
            
            data[i] = Math.max(0, Math.min(255, newR));
            data[i + 1] = Math.max(0, Math.min(255, newG));
            data[i + 2] = Math.max(0, Math.min(255, newB));
        }
    }
    
    /**
     * Apply color temperature matching
     */
    applyColorTemperatureMatching(imageData, lightingProfile) {
        const data = imageData.data;
        const targetTemp = lightingProfile.colorTemperature;
        const tempAdjustment = (targetTemp - 6500) / 10000; // Normalize around daylight
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Adjust color temperature
            if (tempAdjustment > 0) {
                // Warmer (more red/yellow)
                r = Math.min(255, r * (1 + tempAdjustment * 0.3));
                g = Math.min(255, g * (1 + tempAdjustment * 0.1));
            } else {
                // Cooler (more blue)
                b = Math.min(255, b * (1 - tempAdjustment * 0.3));
                g = Math.min(255, g * (1 - tempAdjustment * 0.1));
            }
            
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    }
    
    /**
     * Apply contrast and brightness adjustments for cinematic matching
     */
    applyContrastBrightnessAdjustments(imageData, lightingProfile) {
        const data = imageData.data;
        const avgColor = lightingProfile.avgColor;
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Blend with target average color for better integration (reduced blend)
            const blendFactor = 0.08;
            r = r * (1 - blendFactor) + avgColor.r * blendFactor;
            g = g * (1 - blendFactor) + avgColor.g * blendFactor;
            b = b * (1 - blendFactor) + avgColor.b * blendFactor;
            
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
    }
    
    /**
     * Calculate color temperature from RGB values
     */
    calculateColorTemperature(r, g, b) {
        // Simplified color temperature calculation
        const ratio = b / (r + g + b);
        
        if (ratio > 0.4) return 7000; // Cool/blue
        if (ratio < 0.25) return 3000; // Warm/red
        return 5500; // Neutral
    }
    
    /**
     * Scale and position face canvas to fit target dimensions
     */
    scaleAndPositionFace(faceCanvas, sourceBox, targetBox) {
        const scaledCanvas = document.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');
        
        scaledCanvas.width = targetBox.width;
        scaledCanvas.height = targetBox.height;
        
        // Calculate scale to fit target while maintaining aspect ratio
        const scaleX = targetBox.width / sourceBox.width;
        const scaleY = targetBox.height / sourceBox.height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = faceCanvas.width * scale;
        const scaledHeight = faceCanvas.height * scale;
        
        // Center the scaled face
        const offsetX = (targetBox.width - scaledWidth) / 2;
        const offsetY = (targetBox.height - scaledHeight) / 2;
        
        scaledCtx.drawImage(faceCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
        
        return scaledCanvas;
    }
    
    /**
     * Apply face with mask blending
     */
    applyFaceWithMask(ctx, faceCanvas, faceMask, targetBox) {
        // Create feathered mask
        const featheredMask = this.createFeatheredMask(faceMask);
        
        // Create blend canvas
        const blendCanvas = document.createElement('canvas');
        const blendCtx = blendCanvas.getContext('2d');
        blendCanvas.width = faceMask.width;
        blendCanvas.height = faceMask.height;
        
        // Draw the face at target position
        blendCtx.drawImage(faceCanvas, targetBox.x, targetBox.y);
        
        // Apply mask
        blendCtx.globalCompositeOperation = 'destination-in';
        blendCtx.drawImage(featheredMask, 0, 0);
        
        // Draw final result
        ctx.globalAlpha = 0.9;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(blendCanvas, 0, 0);
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Apply basic color correction to match skin tones
     */
    async applyBasicColorCorrection(sourceFaceCanvas, targetCanvas, targetBox) {
        try {
            // Get pixel data from source face
            const sourceCtx = sourceFaceCanvas.getContext('2d', { willReadFrequently: true });
            const sourceData = sourceCtx.getImageData(0, 0, sourceFaceCanvas.width, sourceFaceCanvas.height);
            
            // Get pixel data from target area (where we'll place the face)
            const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
            const targetData = targetCtx.getImageData(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
            
            // Calculate color statistics for both regions
            const sourceStats = this.calculateColorStats(sourceData);
            const targetStats = this.calculateColorStats(targetData);
            
            // Apply color transfer
            const correctedData = this.transferColors(sourceData, sourceStats, targetStats);
            
            // Create new canvas with corrected colors
            const correctedCanvas = document.createElement('canvas');
            const correctedCtx = correctedCanvas.getContext('2d', { willReadFrequently: true });
            correctedCanvas.width = sourceFaceCanvas.width;
            correctedCanvas.height = sourceFaceCanvas.height;
            
            correctedCtx.putImageData(correctedData, 0, 0);
            
            return correctedCanvas;
        } catch (error) {
            console.warn('Color correction failed, using original:', error);
            return sourceFaceCanvas;
        }
    }
    
    /**
     * Calculate color statistics (mean and standard deviation) for RGB channels
     */
    calculateColorStats(imageData) {
        const pixels = imageData.data;
        let rSum = 0, gSum = 0, bSum = 0;
        let rSumSq = 0, gSumSq = 0, bSumSq = 0;
        let count = 0;
        
        // Calculate means, ignoring transparent pixels
        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3];
            if (alpha > 50) { // Only consider non-transparent pixels
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                rSum += r;
                gSum += g;
                bSum += b;
                
                rSumSq += r * r;
                gSumSq += g * g;
                bSumSq += b * b;
                
                count++;
            }
        }
        
        if (count === 0) {
            return { rMean: 128, gMean: 128, bMean: 128, rStd: 1, gStd: 1, bStd: 1 };
        }
        
        const rMean = rSum / count;
        const gMean = gSum / count;
        const bMean = bSum / count;
        
        const rVariance = (rSumSq / count) - (rMean * rMean);
        const gVariance = (gSumSq / count) - (gMean * gMean);
        const bVariance = (bSumSq / count) - (bMean * bMean);
        
        return {
            rMean: rMean,
            gMean: gMean,
            bMean: bMean,
            rStd: Math.sqrt(Math.max(rVariance, 1)), // Avoid division by zero
            gStd: Math.sqrt(Math.max(gVariance, 1)),
            bStd: Math.sqrt(Math.max(bVariance, 1))
        };
    }
    
    /**
     * Transfer colors from source to match target statistics
     */
    transferColors(sourceData, sourceStats, targetStats) {
        const newData = new ImageData(sourceData.width, sourceData.height);
        const sourcePixels = sourceData.data;
        const newPixels = newData.data;
        
        for (let i = 0; i < sourcePixels.length; i += 4) {
            const alpha = sourcePixels[i + 3];
            
            if (alpha > 50) {
                // Apply color transfer formula with reduced intensity for more visible face swap
                let correctedR = ((sourcePixels[i] - sourceStats.rMean) * (targetStats.rStd / sourceStats.rStd)) + targetStats.rMean;
                let correctedG = ((sourcePixels[i + 1] - sourceStats.gMean) * (targetStats.gStd / sourceStats.gStd)) + targetStats.gMean;
                let correctedB = ((sourcePixels[i + 2] - sourceStats.bMean) * (targetStats.bStd / sourceStats.bStd)) + targetStats.bMean;
                
                // Blend original and corrected colors (50% each) to preserve face visibility
                const blendFactor = 0.5;
                let newR = (sourcePixels[i] * (1 - blendFactor)) + (correctedR * blendFactor);
                let newG = (sourcePixels[i + 1] * (1 - blendFactor)) + (correctedG * blendFactor);
                let newB = (sourcePixels[i + 2] * (1 - blendFactor)) + (correctedB * blendFactor);
                
                // Clamp values to valid range
                newPixels[i] = Math.max(0, Math.min(255, newR));
                newPixels[i + 1] = Math.max(0, Math.min(255, newG));
                newPixels[i + 2] = Math.max(0, Math.min(255, newB));
                newPixels[i + 3] = alpha;
            } else {
                // Keep transparent pixels as-is
                newPixels[i] = sourcePixels[i];
                newPixels[i + 1] = sourcePixels[i + 1];
                newPixels[i + 2] = sourcePixels[i + 2];
                newPixels[i + 3] = alpha;
            }
        }
        
        return newData;
    }
    
    /**
     * Calculate optimal face positioning using landmark alignment
     */
    calculateLandmarkAlignment(sourceLandmarks, targetLandmarks, sourceBox, targetBox) {
        if (!sourceLandmarks || !targetLandmarks) {
            // Improved fallback positioning with better scaling
            const idealScale = Math.min(targetBox.width / sourceBox.width, targetBox.height / sourceBox.height) * 0.9;
            return {
                x: targetBox.x,
                y: targetBox.y,
                width: sourceBox.width * idealScale,
                height: sourceBox.height * idealScale,
                rotation: 0,
                scale: idealScale
            };
        }
        
        // Get key facial features for precise alignment
        const sourceNose = sourceLandmarks.getNose()[3]; // Nose tip
        const sourceLeftEye = this.getEyeCenter(sourceLandmarks.getLeftEye());
        const sourceRightEye = this.getEyeCenter(sourceLandmarks.getRightEye());
        const sourceMouth = this.getMouthCenter(sourceLandmarks.getMouth());
        
        const targetNose = targetLandmarks.getNose()[3];
        const targetLeftEye = this.getEyeCenter(targetLandmarks.getLeftEye());
        const targetRightEye = this.getEyeCenter(targetLandmarks.getRightEye());
        const targetMouth = this.getMouthCenter(targetLandmarks.getMouth());
        
        // Calculate multiple distance metrics for better scaling
        const sourceEyeDistance = this.calculateDistance(sourceLeftEye, sourceRightEye);
        const targetEyeDistance = this.calculateDistance(targetLeftEye, targetRightEye);
        
        const sourceNoseToMouth = this.calculateDistance(sourceNose, sourceMouth);
        const targetNoseToMouth = this.calculateDistance(targetNose, targetMouth);
        
        // Use average of multiple scale factors for more accurate sizing
        const eyeScale = targetEyeDistance / sourceEyeDistance;
        const faceScale = targetNoseToMouth / sourceNoseToMouth;
        const avgScale = (eyeScale + faceScale) / 2;
        
        // Limit scale to reasonable bounds
        const finalScale = Math.max(0.5, Math.min(2.0, avgScale));
        
        // Calculate rotation based on eye alignment
        const sourceEyeAngle = Math.atan2(
            sourceRightEye.y - sourceLeftEye.y,
            sourceRightEye.x - sourceLeftEye.x
        );
        const targetEyeAngle = Math.atan2(
            targetRightEye.y - targetLeftEye.y,
            targetRightEye.x - targetLeftEye.x
        );
        
        const rotation = targetEyeAngle - sourceEyeAngle;
        
        // Calculate precise positioning based on facial feature alignment
        const scaledWidth = sourceBox.width * finalScale;
        const scaledHeight = sourceBox.height * finalScale;
        
        // Position based on nose alignment (center of face)
        const sourceNoseRelative = {
            x: (sourceNose.x - sourceBox.x) / sourceBox.width,
            y: (sourceNose.y - sourceBox.y) / sourceBox.height
        };
        
        const targetNoseAbsolute = {
            x: targetNose.x,
            y: targetNose.y
        };
        
        // Calculate where the top-left corner should be to align noses
        const newX = targetNoseAbsolute.x - (sourceNoseRelative.x * scaledWidth);
        const newY = targetNoseAbsolute.y - (sourceNoseRelative.y * scaledHeight);
        
        return {
            x: newX,
            y: newY,
            width: scaledWidth,
            height: scaledHeight,
            rotation: rotation,
            scale: finalScale,
            noseCenterSource: sourceNose,
            noseCenterTarget: targetNose,
            eyeScale: eyeScale,
            faceScale: faceScale
        };
    }
    
    /**
     * Calculate center point of mouth landmarks
     */
    getMouthCenter(mouthLandmarks) {
        const sumX = mouthLandmarks.reduce((sum, point) => sum + point.x, 0);
        const sumY = mouthLandmarks.reduce((sum, point) => sum + point.y, 0);
        
        return {
            x: sumX / mouthLandmarks.length,
            y: sumY / mouthLandmarks.length
        };
    }
    
    /**
     * Calculate distance between two points
     */
    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );
    }
    
    /**
     * Calculate center point of eye landmarks
     */
    getEyeCenter(eyeLandmarks) {
        const sumX = eyeLandmarks.reduce((sum, point) => sum + point.x, 0);
        const sumY = eyeLandmarks.reduce((sum, point) => sum + point.y, 0);
        
        return {
            x: sumX / eyeLandmarks.length,
            y: sumY / eyeLandmarks.length
        };
    }
    
    /**
     * Perform Delaunay triangulation-based face morphing
     */
    async performDelaunayFaceMorphing(sourceCanvas, sourceLandmarks, sourceBox, 
                                     targetCanvas, targetLandmarks, targetBox) {
        // Create face mask first to limit triangulation to face area only
        // IMPORTANT: Create mask with target canvas dimensions, not source box dimensions
        const faceMask = this.createTargetFaceMask(targetCanvas, targetBox, targetLandmarks);
        console.log('Face mask created with dimensions:', { width: faceMask.width, height: faceMask.height });
        
        // Extract just the face region from source canvas
        const sourceFaceCanvas = this.extractFaceWithLandmarks(sourceCanvas, sourceBox, sourceLandmarks);
        console.log('Source face extracted with dimensions:', { width: sourceFaceCanvas.width, height: sourceFaceCanvas.height });
        
        // Get landmark positions as arrays (only face landmarks, no boundary points that extend to background)
        const sourcePoints = this.getFaceLandmarkPoints(sourceLandmarks, sourceBox);
        const targetPoints = this.getFaceLandmarkPoints(targetLandmarks, targetBox);
        
        // Add only face boundary points (not full bounding box)
        const sourcePointsWithBoundary = this.addFaceBoundaryPoints(sourcePoints, sourceLandmarks, sourceBox);
        const targetPointsWithBoundary = this.addFaceBoundaryPoints(targetPoints, targetLandmarks, targetBox);
        
        // Create Delaunay triangulation from target points
        const delaunay = d3.Delaunay.from(targetPointsWithBoundary.map(p => [p.x, p.y]));
        const triangles = delaunay.triangles;
        
        // Create a temporary canvas for the morphed face
        const morphedCanvas = document.createElement('canvas');
        const morphedCtx = morphedCanvas.getContext('2d');
        morphedCanvas.width = targetCanvas.width;
        morphedCanvas.height = targetCanvas.height;
        
        // Process each triangle
        for (let i = 0; i < triangles.length; i += 3) {
            const t1 = triangles[i];
            const t2 = triangles[i + 1];
            const t3 = triangles[i + 2];
            
            // Get triangle vertices
            const targetTriangle = [
                targetPointsWithBoundary[t1],
                targetPointsWithBoundary[t2],
                targetPointsWithBoundary[t3]
            ];
            
            const sourceTriangle = [
                sourcePointsWithBoundary[t1],
                sourcePointsWithBoundary[t2],
                sourcePointsWithBoundary[t3]
            ];
            
            // Skip degenerate triangles
            if (this.isDegenerate(targetTriangle) || this.isDegenerate(sourceTriangle)) {
                continue;
            }
            
            // Draw warped triangle to temporary canvas
            this.drawWarpedTriangle(morphedCtx, sourceFaceCanvas, sourceTriangle, targetTriangle);
        }
        
        // Apply the morphed face using the mask with feathered blending
        console.log('Applying morphed face to target canvas...');
        const ctx = targetCanvas.getContext('2d');
        this.applyMorphedFaceWithMask(ctx, morphedCanvas, faceMask, targetBox);
        console.log('Morphed face applied to target canvas');
    }
    
    /**
     * Convert facial landmarks to point array (face-only, no background boundary)
     */
    getFaceLandmarkPoints(landmarks, boundingBox) {
        const points = [];
        
        // Get all 68 landmark points
        const positions = landmarks.positions || landmarks._positions;
        for (let i = 0; i < positions.length; i++) {
            points.push({
                x: positions[i].x,
                y: positions[i].y
            });
        }
        
        return points;
    }
    
    /**
     * Convert facial landmarks to point array (legacy function for compatibility)
     */
    getLandmarkPointsArray(landmarks, boundingBox) {
        return this.getFaceLandmarkPoints(landmarks, boundingBox);
    }
    
    /**
     * Add boundary points around face for complete coverage
     */
    /**
     * Add face boundary points (only around actual face perimeter, not bounding box)
     */
    addFaceBoundaryPoints(points, landmarks, boundingBox) {
        const pointsWithBoundary = [...points];
        
        // Get face outline points from landmarks
        const positions = landmarks.positions || landmarks._positions;
        
        // Add strategic boundary points around the central face outline
        // Get central jaw line points (4-12) - excludes ear areas for cleaner face swap
        const jawPoints = [];
        for (let i = 4; i <= 12; i++) {
            jawPoints.push({
                x: positions[i].x,
                y: positions[i].y
            });
        }
        
        // Add forehead points by extending from eyebrow area
        const leftEyebrow = positions[19]; // Left eyebrow outer
        const rightEyebrow = positions[24]; // Right eyebrow outer
        const noseTop = positions[27]; // Nose top
        
        // Create forehead boundary points
        const foreheadOffset = 25;
        const foreheadPoints = [
            { x: leftEyebrow.x - 10, y: leftEyebrow.y - foreheadOffset },
            { x: noseTop.x, y: noseTop.y - foreheadOffset },
            { x: rightEyebrow.x + 10, y: rightEyebrow.y - foreheadOffset }
        ];
        
        pointsWithBoundary.push(...foreheadPoints);
        
        return pointsWithBoundary;
    }
    
    /**
     * Add boundary points around face for complete coverage (legacy function)
     */
    addBoundaryPoints(points, boundingBox) {
        const pointsWithBoundary = [...points];
        
        // Add corner and edge points for full coverage
        const margin = 20;
        const corners = [
            { x: boundingBox.x - margin, y: boundingBox.y - margin }, // Top-left
            { x: boundingBox.x + boundingBox.width + margin, y: boundingBox.y - margin }, // Top-right
            { x: boundingBox.x + boundingBox.width + margin, y: boundingBox.y + boundingBox.height + margin }, // Bottom-right
            { x: boundingBox.x - margin, y: boundingBox.y + boundingBox.height + margin }, // Bottom-left
            
            // Add some mid-edge points for better triangulation
            { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y - margin }, // Top-center
            { x: boundingBox.x + boundingBox.width + margin, y: boundingBox.y + boundingBox.height / 2 }, // Right-center
            { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height + margin }, // Bottom-center
            { x: boundingBox.x - margin, y: boundingBox.y + boundingBox.height / 2 } // Left-center
        ];
        
        pointsWithBoundary.push(...corners);
        
        return pointsWithBoundary;
    }
    
    /**
     * Apply morphed face with mask and feathered blending
     */
    applyMorphedFaceWithMask(ctx, morphedCanvas, faceMask, targetBox) {
        console.log('applyMorphedFaceWithMask called with:', {
            hasMorphedCanvas: !!morphedCanvas,
            hasFaceMask: !!faceMask,
            targetBox,
            morphedCanvasSize: { width: morphedCanvas?.width, height: morphedCanvas?.height },
            faceMaskSize: { width: faceMask?.width, height: faceMask?.height }
        });
        
        // Create a feathered mask for smooth blending
        const featheredMask = this.createFeatheredMask(faceMask);
        console.log('Feathered mask created');
        
        // Apply the morphed face using the feathered mask
        ctx.save();
        
        // Set blend mode for realistic integration
        ctx.globalCompositeOperation = 'source-over';
        
        // Create a temporary canvas for blending
        const blendCanvas = document.createElement('canvas');
        const blendCtx = blendCanvas.getContext('2d');
        blendCanvas.width = morphedCanvas.width;
        blendCanvas.height = morphedCanvas.height;
        
        // Draw the morphed face
        blendCtx.drawImage(morphedCanvas, 0, 0);
        
        // Apply the mask
        blendCtx.globalCompositeOperation = 'destination-in';
        blendCtx.drawImage(featheredMask, 0, 0);
        
        // Draw the final result to the target canvas with MAXIMUM visibility for testing
        console.log('Drawing final blended result to target canvas');
        ctx.globalAlpha = 1.0; // FULL opacity - no transparency
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(blendCanvas, 0, 0);
        
        // TEMP: Also draw the raw morphed face without mask for debugging
        console.log('DEBUGGING: Drawing raw morphed face at target position');
        ctx.globalAlpha = 0.7;
        ctx.drawImage(morphedCanvas, targetBox.x, targetBox.y, targetBox.width, targetBox.height);
        
        // Debug: Check if anything was actually drawn
        const imageData = ctx.getImageData(targetBox.x, targetBox.y, Math.min(100, targetBox.width), Math.min(100, targetBox.height));
        const hasNonTransparentPixels = Array.from(imageData.data).some((value, index) => index % 4 === 3 && value > 0);
        console.log('Final result has non-transparent pixels in target area:', hasNonTransparentPixels);
        
        ctx.restore();
    }
    
    /**
     * Create feathered mask from face mask for smooth blending
     */
    createFeatheredMask(faceMask) {
        const featheredCanvas = document.createElement('canvas');
        const featheredCtx = featheredCanvas.getContext('2d');
        featheredCanvas.width = faceMask.width;
        featheredCanvas.height = faceMask.height;
        
        // Draw the mask
        featheredCtx.drawImage(faceMask, 0, 0);
        
        // Apply blur for feathering effect (reduced for more visible swap)
        featheredCtx.filter = 'blur(4px)';
        featheredCtx.globalCompositeOperation = 'source-over';
        featheredCtx.drawImage(faceMask, 0, 0);
        
        return featheredCanvas;
    }
    
    /**
     * Check if triangle is degenerate (zero area)
     */
    isDegenerate(triangle) {
        const [p1, p2, p3] = triangle;
        
        // Calculate area using cross product
        const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;
        return area < 1.0; // Skip very small triangles
    }
    
    /**
     * Draw a warped triangle from source to target
     */
    drawWarpedTriangle(ctx, sourceCanvas, sourceTriangle, targetTriangle) {
        // Calculate affine transformation matrix
        const transform = this.calculateAffineTransform(sourceTriangle, targetTriangle);
        
        if (!transform) return; // Skip if transformation calculation failed
        
        ctx.save();
        
        // Create clipping path for target triangle
        ctx.beginPath();
        ctx.moveTo(targetTriangle[0].x, targetTriangle[0].y);
        ctx.lineTo(targetTriangle[1].x, targetTriangle[1].y);
        ctx.lineTo(targetTriangle[2].x, targetTriangle[2].y);
        ctx.closePath();
        ctx.clip();
        
        // Apply transformation matrix
        ctx.setTransform(
            transform.a, transform.b, transform.c, 
            transform.d, transform.e, transform.f
        );
        
        // Draw the source image (only the clipped triangle will be visible)
        ctx.drawImage(sourceCanvas, 0, 0);
        
        ctx.restore();
    }
    
    /**
     * Calculate affine transformation matrix between two triangles
     */
    calculateAffineTransform(sourceTriangle, targetTriangle) {
        try {
            const [s1, s2, s3] = sourceTriangle;
            const [t1, t2, t3] = targetTriangle;
            
            // Set up system of linear equations for affine transformation
            // [a c e] [sx sy 1] = [tx ty 1] for each point
            // [b d f] 
            
            // Create matrices for solving the transformation
            const sourceMatrix = [
                [s1.x, s1.y, 1, 0, 0, 0],
                [0, 0, 0, s1.x, s1.y, 1],
                [s2.x, s2.y, 1, 0, 0, 0],
                [0, 0, 0, s2.x, s2.y, 1],
                [s3.x, s3.y, 1, 0, 0, 0],
                [0, 0, 0, s3.x, s3.y, 1]
            ];
            
            const targetVector = [t1.x, t1.y, t2.x, t2.y, t3.x, t3.y];
            
            // Solve for transformation parameters using simple matrix inversion
            const params = this.solveLinearSystem(sourceMatrix, targetVector);
            
            if (!params) return null;
            
            return {
                a: params[0], c: params[1], e: params[2],
                b: params[3], d: params[4], f: params[5]
            };
            
        } catch (error) {
            console.warn('Affine transformation calculation failed:', error);
            return null;
        }
    }
    
    /**
     * Simple linear system solver for 6x6 matrix (affine transformation)
     */
    solveLinearSystem(matrix, vector) {
        try {
            // This is a simplified solver for the specific 6x6 affine case
            // For production, you might want to use a more robust linear algebra library
            
            // Using Cramer's rule for the 2x2 sub-problems
            const [s1, s2, s3] = [
                { x: matrix[0][0], y: matrix[0][1] },
                { x: matrix[2][0], y: matrix[2][1] },
                { x: matrix[4][0], y: matrix[4][1] }
            ];
            
            const [t1, t2, t3] = [
                { x: vector[0], y: vector[1] },
                { x: vector[2], y: vector[3] },
                { x: vector[4], y: vector[5] }
            ];
            
            // Calculate transformation for x coordinates
            const denom = (s1.x - s3.x) * (s2.y - s3.y) - (s2.x - s3.x) * (s1.y - s3.y);
            if (Math.abs(denom) < 1e-10) return null; // Degenerate case
            
            const a = ((t1.x - t3.x) * (s2.y - s3.y) - (t2.x - t3.x) * (s1.y - s3.y)) / denom;
            const c = ((s1.x - s3.x) * (t2.x - t3.x) - (s2.x - s3.x) * (t1.x - t3.x)) / denom;
            const e = t3.x - a * s3.x - c * s3.y;
            
            // Calculate transformation for y coordinates
            const b = ((t1.y - t3.y) * (s2.y - s3.y) - (t2.y - t3.y) * (s1.y - s3.y)) / denom;
            const d = ((s1.x - s3.x) * (t2.y - t3.y) - (s2.x - s3.x) * (t1.y - t3.y)) / denom;
            const f = t3.y - b * s3.x - d * s3.y;
            
            return [a, c, e, b, d, f];
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Apply face with advanced feathered blending
     */
    applyFaceWithFeatheredBlending(ctx, faceCanvas, maskCanvas, positioning) {
        ctx.save();
        
        // Apply transformation for better alignment
        const centerX = positioning.x + positioning.width / 2;
        const centerY = positioning.y + positioning.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(positioning.rotation);
        ctx.scale(positioning.scale, positioning.scale);
        ctx.translate(-positioning.width / 2, -positioning.height / 2);
        
        // Create temporary canvas for masked face
        const maskedFaceCanvas = document.createElement('canvas');
        const maskedFaceCtx = maskedFaceCanvas.getContext('2d');
        
        maskedFaceCanvas.width = faceCanvas.width;
        maskedFaceCanvas.height = faceCanvas.height;
        
        // Draw face
        maskedFaceCtx.drawImage(faceCanvas, 0, 0);
        
        // Apply mask using destination-in for clean cutout
        maskedFaceCtx.globalCompositeOperation = 'destination-in';
        maskedFaceCtx.drawImage(maskCanvas, 0, 0);
        
        // Draw the masked face onto target
        ctx.drawImage(maskedFaceCanvas, 0, 0, positioning.width, positioning.height);
        
        ctx.restore();
    }

    /**
     * Add Red Cross Youth branding to the image
     */
    addBranding(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Add watermark
        ctx.save();
        ctx.font = 'bold 24px Inter';
        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.textAlign = 'right';
        ctx.fillText('Red Cross Youth Fiesta 2025', canvas.width - 20, canvas.height - 20);
        
        // Add logo in corner
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(20, 20, 40, 40);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+', 40, 45);
        
        ctx.restore();
        
        return canvas;
    }

    /**
     * Show the final result
     */
    showResult(canvas) {
        const resultCanvas = document.getElementById('result-canvas');
        const ctx = resultCanvas.getContext('2d');
        
        resultCanvas.width = canvas.width;
        resultCanvas.height = canvas.height;
        ctx.drawImage(canvas, 0, 0);
        
        this.capturedImage = canvas;
        this.showScreen('result');
    }

    /**
     * Download the captured image
     */
    downloadImage() {
        if (!this.capturedImage) return;
        
        const link = document.createElement('a');
        link.download = `red-cross-youth-fiesta-2025-${Date.now()}.png`;
        link.href = this.capturedImage.toDataURL();
        link.click();
    }

    /**
     * Share the image using Web Share API
     */
    async shareImage() {
        if (!this.capturedImage) return;
        
        try {
            if (navigator.share && navigator.canShare) {
                const blob = await new Promise(resolve => {
                    this.capturedImage.toBlob(resolve, 'image/png');
                });
                
                const file = new File([blob], 'red-cross-youth-photo.png', { type: 'image/png' });
                
                await navigator.share({
                    title: 'Red Cross Youth Fiesta 2025',
                    text: 'Check out my AI face swap photo from Red Cross Youth Fiesta 2025!',
                    files: [file]
                });
            } else {
                // Fallback: copy to clipboard
                const blob = await new Promise(resolve => {
                    this.capturedImage.toBlob(resolve, 'image/png');
                });
                
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                
                alert('Image copied to clipboard!');
            }
        } catch (error) {
            console.error('Share failed:', error);
            this.downloadImage(); // Fallback to download
        }
    }

    /**
     * Print the image
     */
    printImage() {
        if (!this.capturedImage) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Red Cross Youth Fiesta 2025 Photo</title>
                    <style>
                        body { 
                            margin: 0; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh; 
                        }
                        img { 
                            max-width: 100%; 
                            height: auto; 
                        }
                    </style>
                </head>
                <body>
                    <img src="${this.capturedImage.toDataURL()}" alt="Red Cross Youth Photo">
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    }

    /**
     * Email the image
     */
    emailImage() {
        if (!this.capturedImage) return;
        
        const imageData = this.capturedImage.toDataURL();
        const subject = encodeURIComponent('My Red Cross Youth Fiesta 2025 Photo');
        const body = encodeURIComponent(`Check out my AI face swap photo from Red Cross Youth Fiesta 2025!\n\nImage data: ${imageData}`);
        
        window.open(`mailto:?subject=${subject}&body=${body}`);
    }

    /**
     * Show QR code for easy mobile download
     */
    async showQRCode() {
        if (!this.capturedImage) return;
        
        try {
            const imageData = this.capturedImage.toDataURL();
            const qrContainer = document.getElementById('qr-code-container');
            qrContainer.innerHTML = '';
            
            // Generate QR code with image data URL
            await QRCode.toCanvas(qrContainer, imageData, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#dc2626',
                    light: '#ffffff'
                }
            });
            
            document.getElementById('qr-modal').classList.add('active');
        } catch (error) {
            console.error('QR code generation failed:', error);
            alert('QR code generation failed. Please try downloading directly.');
        }
    }

    /**
     * Close QR code modal
     */
    closeQRModal() {
        document.getElementById('qr-modal').classList.remove('active');
    }

    /**
     * Retake photo
     */
    retakePhoto() {
        this.selectedTemplate = null;
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.getElementById('capture-btn').disabled = true;
        document.getElementById('instruction-text').textContent = 'Select a character template above, then click capture!';
        this.showScreen('camera');
    }

    /**
     * Show error screen
     */
    showError(title, message) {
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
        this.showScreen('error');
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.faceDetectionInterval) {
            clearInterval(this.faceDetectionInterval);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.photoBoothApp = new PhotoBoothApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.photoBoothApp) {
        window.photoBoothApp.cleanup();
    }
});

// Service Worker registration for PWA capabilities (optional)
// Disabled for now since we don't have a service worker file
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
*/

/**
 * HOW TO ADD REAL CELEBRITY/CHARACTER IMAGES:
 * 
 * 1. Replace the placeholder images in the faceTemplates array with actual images:
 *    - Use base64 encoded images for immediate loading
 *    - Or use URLs to hosted images (make sure they support CORS)
 *    - Images should be square (recommended: 300x300px or larger)
 *    - Use high-quality, well-lit face photos for best results
 * 
 * 2. Example of adding a real image:
 *    {
 *        id: 'celebrity1',
 *        name: 'Celebrity Name',
 *        emoji: '⭐',
 *        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...' // base64 data
 *        // OR
 *        imageUrl: 'https://example.com/celebrity-face.jpg' // hosted image
 *    }
 * 
 * 3. For best face swapping results:
 *    - Use images with clearly visible faces
 *    - Avoid images with glasses, hats, or obstructions
 *    - Front-facing photos work best
 *    - Good lighting and contrast improve results
 * 
 * 4. Legal considerations:
 *    - Ensure you have rights to use the images
 *    - Consider using royalty-free or creative commons images
 *    - For celebrity images, check licensing requirements
 *    - Add proper attribution if required
 */