# Red Cross Youth AI Photo Booth - Fiesta 2025

A complete AI-powered face swap photo booth web application built for the Red Cross Youth Fiesta 2025. This application runs entirely in the browser using client-side JavaScript and can be deployed on GitHub Pages.

## 🌟 Features

- **AI-Powered Face Detection**: Uses Face-api.js for real-time face detection and landmark recognition
- **Face Swapping**: Advanced face swapping with multiple character templates
- **Group Photo Support**: Automatically detects multiple faces for group photos
- **Red Cross Youth Branding**: Custom design matching Red Cross Youth identity
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Camera Controls**: Front/back camera switching and permission handling
- **Countdown Timer**: 3-2-1 countdown before photo capture
- **Share Options**: Download, email, print, and QR code sharing
- **Real-time Preview**: Live face detection overlay with visual feedback
- **Accessibility**: Keyboard shortcuts and screen reader support

## 🎯 Character Templates

The app includes 8 character templates:
- 🦸‍♂️ Superhero
- 🦸‍♀️ Wonder Woman
- 🏴‍☠️ Pirate
- 👨‍🚀 Astronaut
- 👸 Princess
- 🥷 Ninja
- 🧙‍♂️ Wizard
- 🤖 Robot

*Note: Currently using emoji placeholders. See [Adding Real Images](#adding-real-images) for instructions on adding actual celebrity/character photos.*

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)

1. Fork this repository
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" and choose `main` branch
4. Your app will be available at `https://yourusername.github.io/ai-photobooth`

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-photobooth.git
   cd ai-photobooth
   ```

2. **Serve over HTTPS** (required for camera access)
   
   **Using Python 3:**
   ```bash
   python -m http.server 8000
   ```
   Then visit `https://localhost:8000` (you'll need to accept the self-signed certificate)
   
   **Using Node.js (with serve):**
   ```bash
   npx serve -s . -p 8000
   ```
   
   **Using PHP:**
   ```bash
   php -S localhost:8000
   ```

3. **Accept camera permissions** when prompted

## 📱 Usage Instructions

### For Event Organizers

1. **Setup**: Deploy the app on GitHub Pages or serve locally
2. **Test**: Verify camera access works on your devices
3. **Display**: Use on tablets/laptops for the photo booth station
4. **Instructions**: Show users how to select templates and capture photos

### For Users

1. **Start**: Click "Start Photo Booth" on the welcome screen
2. **Allow Camera**: Grant camera permission when prompted
3. **Select Template**: Choose your favorite character from the grid
4. **Position**: Make sure your face is in the green detection box
5. **Capture**: Click the capture button or press spacebar
6. **Countdown**: Get ready during the 3-2-1 countdown
7. **AI Processing**: Wait for the AI to swap your face
8. **Share**: Download, share, print, or scan QR code for your photo

## 🛠️ Technical Details

### Architecture

- **Frontend**: Pure vanilla JavaScript, HTML5, CSS3
- **AI Library**: Face-api.js (loaded from CDN)
- **Camera**: WebRTC Media API
- **Canvas**: HTML5 Canvas for image processing
- **QR Codes**: QRCode.js library
- **No Build Process**: Ready to deploy without compilation

### Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **Camera Required**: Devices with webcam/front camera
- **HTTPS Required**: Camera access requires secure connection

### Performance

- **AI Models**: ~10MB download (cached after first load)
- **Processing Time**: 2-5 seconds per photo
- **Memory Usage**: ~50MB for AI models
- **Mobile Optimized**: Responsive design for touch devices

## 🔧 Configuration

### Environment Variables

Create a `.env` file for configuration (optional):

```env
# App Configuration
APP_TITLE="Red Cross Youth AI Photo Booth"
EVENT_NAME="Fiesta 2025"
MAX_FACE_DETECTION_TIME=10000
CAMERA_RESOLUTION_WIDTH=1280
CAMERA_RESOLUTION_HEIGHT=720
```

### Customization

#### Colors and Branding

Edit CSS variables in `styles.css`:

```css
:root {
    --red-primary: #dc2626;        /* Main Red Cross red */
    --red-secondary: #b91c1c;      /* Darker red */
    --red-light: #fef2f2;          /* Light red background */
    /* ... other variables ... */
}
```

#### Event Information

Update branding in `app.js`:

```javascript
// In addBranding() method
ctx.fillText('Your Event Name 2025', canvas.width - 20, canvas.height - 20);
```

#### Face Templates

Replace placeholder templates in `app.js` (see [Adding Real Images](#adding-real-images)):

```javascript
this.faceTemplates = [
    {
        id: 'custom1',
        name: 'Custom Character',
        emoji: '⭐',
        imageUrl: 'path/to/your/image.jpg'
    },
    // ... more templates
];
```

## 📸 Adding Real Images

To replace the emoji placeholders with actual celebrity/character images:

### Step 1: Prepare Images

1. **Image Requirements**:
   - Square aspect ratio (300x300px minimum)
   - High quality, well-lit face photos
   - Front-facing poses work best
   - Avoid glasses, hats, or face obstructions

2. **Image Formats**:
   - Base64 encoded (for immediate loading)
   - Hosted URLs (ensure CORS support)
   - Local files in the project directory

### Step 2: Update Template Array

```javascript
// In app.js, replace the faceTemplates array:
this.faceTemplates = [
    {
        id: 'celebrity1',
        name: 'Celebrity Name',
        emoji: '⭐',
        // Option A: Base64 encoded image
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
        
        // Option B: Hosted image URL
        // imageUrl: 'https://example.com/celebrity-face.jpg'
        
        // Option C: Local file
        // imageUrl: './images/celebrity-face.jpg'
    },
    // ... add more templates
];
```

### Step 3: Legal Considerations

- ✅ Use royalty-free or creative commons images
- ✅ Obtain proper licensing for celebrity images
- ✅ Add attribution if required
- ❌ Don't use copyrighted images without permission

### Step 4: Test Results

After adding real images:
1. Test face swap quality with different lighting
2. Adjust blend modes if needed
3. Verify images load correctly on mobile

## 🚀 Deployment

### GitHub Pages Deployment

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

3. **Custom Domain** (optional):
   - Add CNAME file with your domain
   - Configure DNS to point to GitHub Pages

### Manual Deployment

For other hosting services:

1. **Upload Files**: Upload all files to your web server
2. **HTTPS Required**: Ensure your server supports HTTPS
3. **MIME Types**: Verify `.js` files are served with correct content-type
4. **CORS Headers**: If serving images from different domain, configure CORS

### GitHub Actions Deployment

The repository includes a GitHub Actions workflow for automatic deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## 🐛 Troubleshooting

### Camera Issues

**Problem**: "Camera Access Denied"
- **Solution**: Check browser permissions in settings
- **Chrome**: Settings → Privacy → Camera → Allow for your site
- **Firefox**: Click shield icon → Permissions → Camera → Allow

**Problem**: "No cameras found"
- **Solution**: Ensure device has working camera
- **Check**: Device Manager (Windows) or System Preferences (Mac)

**Problem**: Black video screen
- **Solution**: Try switching cameras or refresh page
- **Check**: Other apps aren't using the camera

### AI Model Issues

**Problem**: "Failed to load AI models"
- **Solution**: Check internet connection
- **Check**: CDN is accessible (test Face-api.js CDN)
- **Retry**: Refresh page to reload models

**Problem**: Slow face detection
- **Solution**: Reduce detection frequency in code
- **Edit**: Change interval in `setupFaceDetection()` from 200ms to 500ms

### Performance Issues

**Problem**: App runs slowly on mobile
- **Solution**: Reduce video resolution
- **Edit**: Modify camera constraints in `startCamera()`

**Problem**: Out of memory errors
- **Solution**: Clear browser cache and restart
- **Check**: Close other browser tabs

### Deployment Issues

**Problem**: App doesn't work on GitHub Pages
- **Solution**: Ensure all paths are relative
- **Check**: No absolute paths in HTML/CSS/JS
- **Verify**: HTTPS is working

**Problem**: Face-api.js fails to load
- **Solution**: Verify CDN links are correct
- **Backup**: Download and host models locally

## 📋 Development Scripts

Create a `package.json` for npm scripts (optional):

```json
{
  "name": "red-cross-youth-photo-booth",
  "version": "1.0.0",
  "scripts": {
    "dev": "python -m http.server 8000",
    "serve": "npx serve -s . -p 8000",
    "deploy": "gh-pages -d .",
    "test": "echo 'No tests configured'"
  },
  "devDependencies": {
    "gh-pages": "^3.2.3",
    "serve": "^14.0.1"
  }
}
```

Then run:
```bash
npm install
npm run dev    # Start development server
npm run deploy # Deploy to GitHub Pages
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Face-api.js**: Amazing face detection library
- **Red Cross Youth**: For the inspiring event
- **QRCode.js**: QR code generation
- **Modern browsers**: For supporting advanced web APIs

## 📞 Support

For issues and questions:

1. **Check**: This README and troubleshooting section
2. **Search**: Existing GitHub issues
3. **Create**: New issue with detailed description
4. **Include**: Browser, device, error messages, and steps to reproduce

## 🔮 Future Enhancements

Potential improvements for future versions:

- [ ] Real-time video filters
- [ ] Custom template upload
- [ ] Social media integration
- [ ] Advanced face morphing
- [ ] Batch processing for events
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Offline PWA functionality

---

**Built with ❤️ for Red Cross Youth Fiesta 2025**

*This photo booth app demonstrates the power of client-side AI and modern web technologies to create engaging, interactive experiences for community events.*