class PhotoBooth {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.capturedImage = null;
        this.selectedTemplate = null;
        this.currentStream = null;
        this.facingMode = 'user'; // 'user' for front camera, 'environment' for back camera
        
        this.initializeEventListeners();
        this.startCamera();
        this.loadTemplates();
    }

    initializeEventListeners() {
        // Camera controls
        document.getElementById('capture-btn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('switch-camera-btn').addEventListener('click', () => this.switchCamera());
        
        // Preview controls
        document.getElementById('retake-btn').addEventListener('click', () => this.retakePhoto());
        document.getElementById('continue-btn').addEventListener('click', () => this.showTemplateSelection());
        
        // Template controls
        document.getElementById('back-to-preview-btn').addEventListener('click', () => this.showPreview());
        
        // Result controls
        document.getElementById('download-btn').addEventListener('click', () => this.downloadResult());
        document.getElementById('start-over-btn').addEventListener('click', () => this.startOver());
    }

    async startCamera() {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please make sure you have granted camera permissions.');
        }
    }

    switchCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        this.startCamera();
    }

    capturePhoto() {
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;
        
        this.ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
        this.capturedImage = this.canvas.toDataURL('image/jpeg', 0.8);
        
        // Show preview
        document.getElementById('captured-preview').src = this.capturedImage;
        this.showStep('preview-step');
    }

    retakePhoto() {
        this.capturedImage = null;
        this.showStep('camera-step');
    }

    showPreview() {
        this.showStep('preview-step');
    }

    showTemplateSelection() {
        this.showStep('template-step');
    }

    async loadTemplates() {
        try {
            const response = await fetch('/get_templates');
            const data = await response.json();
            
            const templateGrid = document.getElementById('template-grid');
            templateGrid.innerHTML = '';
            
            data.templates.forEach(template => {
                const templateItem = document.createElement('div');
                templateItem.className = 'template-item';
                templateItem.innerHTML = `
                    <img src="/template/${template}" alt="${template}">
                    <p>${template.replace(/\.[^/.]+$/, "")}</p>
                `;
                
                templateItem.addEventListener('click', () => this.selectTemplate(template, templateItem));
                templateGrid.appendChild(templateItem);
            });
        } catch (error) {
            console.error('Error loading templates:', error);
            alert('Error loading templates. Please try again.');
        }
    }

    selectTemplate(templateName, templateElement) {
        // Remove previous selection
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select current template
        templateElement.classList.add('selected');
        this.selectedTemplate = templateName;
        
        // Auto-proceed to processing after short delay
        setTimeout(() => {
            this.processSwap();
        }, 500);
    }

    updateProcessingStep(stepId, status = 'active') {
        // Reset all steps
        document.querySelectorAll('.progress-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        // Mark steps as completed up to current step
        const steps = ['step-swap', 'step-enhance', 'step-finalize'];
        const currentIndex = steps.indexOf(stepId);
        
        for (let i = 0; i < currentIndex; i++) {
            document.getElementById(steps[i]).classList.add('completed');
        }
        
        // Mark current step as active
        if (status === 'active') {
            document.getElementById(stepId).classList.add('active');
        } else if (status === 'completed') {
            document.getElementById(stepId).classList.add('completed');
        }
    }

    async processSwap() {
        if (!this.capturedImage || !this.selectedTemplate) {
            alert('Please capture a photo and select a template first.');
            return;
        }

        this.showStep('processing-step');
        
        // Get quality setting
        const useEnhancement = document.getElementById('enhance-quality').checked;

        try {
            // Step 1: Face swapping
            this.updateProcessingStep('step-swap', 'active');
            document.getElementById('status-text').textContent = 'Detecting and swapping faces...';

            const response = await fetch('/process_swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    captured_image: this.capturedImage,
                    template: this.selectedTemplate,
                    use_enhancement: useEnhancement
                })
            });

            const data = await response.json();

            if (data.success) {
                // Step 2: Enhancement (if enabled)
                if (useEnhancement) {
                    this.updateProcessingStep('step-enhance', 'active');
                    document.getElementById('status-text').textContent = 'Enhancing face quality...';
                    
                    // Small delay to show the enhancement step
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Step 3: Finalize
                this.updateProcessingStep('step-finalize', 'active');
                document.getElementById('status-text').textContent = 'Finalizing your masterpiece...';
                
                await new Promise(resolve => setTimeout(resolve, 500));

                // Show results
                document.getElementById('result-image').src = data.result_image;
                document.getElementById('faces-count').textContent = 
                    `${data.faces_swapped} face${data.faces_swapped !== 1 ? 's' : ''} swapped successfully!`;
                
                // Show enhancement status
                const qualityInfo = document.getElementById('quality-info');
                if (data.enhanced) {
                    qualityInfo.textContent = '✨ Enhanced with AI face restoration';
                    qualityInfo.style.color = '#4CAF50';
                } else {
                    qualityInfo.textContent = useEnhancement ? '⚡ Fast mode (enhancement disabled)' : '⚡ Fast mode';
                    qualityInfo.style.color = '#FFC107';
                }
                
                this.resultImage = data.result_image;
                this.showStep('result-step');
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Error processing swap:', error);
            alert(`Error: ${error.message}`);
            this.showStep('template-step');
        }
    }

    downloadResult() {
        if (!this.resultImage) {
            alert('No result image to download.');
            return;
        }

        const link = document.createElement('a');
        link.download = `red-cross-fiesta-${Date.now()}.jpg`;
        link.href = this.resultImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    startOver() {
        this.capturedImage = null;
        this.selectedTemplate = null;
        this.resultImage = null;
        
        // Remove template selections
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.showStep('camera-step');
    }

    showStep(stepId) {
        // Hide all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show target step
        document.getElementById(stepId).classList.add('active');
    }
}

// Initialize the photo booth when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PhotoBooth();
});

// Add service for serving template images
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/sw.js').catch(console.error);
}