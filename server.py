#!/usr/bin/env python3
"""
Simple HTTPS server for local development of the AI Photo Booth
Camera access requires HTTPS, so this script provides a local HTTPS server.
"""

import http.server
import ssl
import socketserver
import os
import sys
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with CORS headers for local development"""
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def create_self_signed_cert():
    """Create a self-signed certificate for HTTPS"""
    try:
        import ssl
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
        import ipaddress
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Local"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Development"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "AI Photo Booth"),
            x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.now(datetime.timezone.utc)
        ).not_valid_after(
            datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write certificate and private key
        with open("server.crt", "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
            
        with open("server.key", "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
            
        return True
        
    except ImportError:
        print("Warning: cryptography library not available for auto-generating certificates.")
        print("Please install with: pip install cryptography")
        return False
    except Exception as e:
        print(f"Error creating certificate: {e}")
        return False

def main():
    """Main server function"""
    PORT = 8000
    HOST = "localhost"
    
    print("🚀 AI Photo Booth Development Server")
    print("=" * 40)
    
    # Check if certificate files exist
    cert_file = "server.crt"
    key_file = "server.key"
    
    if not (os.path.exists(cert_file) and os.path.exists(key_file)):
        print("📜 SSL certificates not found. Creating self-signed certificate...")
        if create_self_signed_cert():
            print("✅ Self-signed certificate created successfully!")
        else:
            print("❌ Failed to create certificate. Falling back to HTTP.")
            print("⚠️  Camera access may not work over HTTP!")
            
            # Start HTTP server as fallback
            with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
                print(f"\n🌐 Server running at: http://{HOST}:{PORT}")
                print("📱 Note: Camera access requires HTTPS. Consider using ngrok or another HTTPS proxy.")
                print("🛑 Press Ctrl+C to stop the server\n")
                
                try:
                    httpd.serve_forever()
                except KeyboardInterrupt:
                    print("\n👋 Server stopped.")
                    return
    
    # Start HTTPS server
    try:
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            # Wrap socket with SSL
            context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            context.load_cert_chain(cert_file, key_file)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"\n🔒 HTTPS Server running at: https://{HOST}:{PORT}")
            print("📸 Camera access enabled with HTTPS!")
            print("⚠️  You may need to accept the self-signed certificate in your browser.")
            print("🛑 Press Ctrl+C to stop the server\n")
            
            print("📋 Quick Start:")
            print(f"   1. Open https://{HOST}:{PORT} in your browser")
            print("   2. Accept the security warning (self-signed certificate)")
            print("   3. Allow camera access when prompted")
            print("   4. Start taking AI face swap photos!\n")
            
            print("🔧 Troubleshooting:")
            print("   - If camera doesn't work, check browser permissions")
            print("   - For mobile testing, use ngrok or deploy to GitHub Pages")
            print("   - See README.md for full deployment instructions\n")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n👋 Server stopped.")
                
    except Exception as e:
        print(f"❌ Error starting HTTPS server: {e}")
        print("💡 Try running with: python server.py --http")

if __name__ == "__main__":
    # Check for HTTP-only flag
    if len(sys.argv) > 1 and sys.argv[1] == "--http":
        PORT = 8000
        HOST = "localhost"
        print("🌐 Starting HTTP server (camera may not work)...")
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            print(f"Server running at: http://{HOST}:{PORT}")
            print("Press Ctrl+C to stop")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped.")
    else:
        main()