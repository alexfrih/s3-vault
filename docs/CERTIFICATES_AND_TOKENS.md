# Certificates and Tokens Setup Guide

## GitHub Personal Access Token

### Step 1: Create the Token
1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Fill in the details:
   - **Note**: `v0lt Release Token`
   - **Expiration**: Choose your preference (or no expiration)
   - **Scopes**: Check only `repo` (Full control of private repositories)
4. Click **"Generate token"**
5. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Add to .env
```bash
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## macOS Code Signing Certificate

### Option 1: Apple Developer Certificate (Recommended for Distribution)
**Cost**: $99/year

1. **Enroll in Apple Developer Program**
   - Go to https://developer.apple.com/programs/
   - Click "Enroll"
   - Pay the $99 annual fee

2. **Create Certificate in Apple Developer Portal**
   - Go to https://developer.apple.com/account/resources/certificates/list
   - Click the "+" button
   - Select "Developer ID Application"
   - Follow the Certificate Signing Request (CSR) instructions

3. **Generate CSR on your Mac**
   ```bash
   # Open Keychain Access
   open /Applications/Utilities/Keychain\ Access.app
   ```
   - Menu: Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority
   - Fill in:
     - Email Address: your@email.com
     - Common Name: Your Name or Company Name
     - CA Email: leave blank
     - Select "Saved to disk"
   - Save the CSR file

4. **Upload CSR to Apple Developer Portal**
   - Upload the CSR file you just created
   - Download the certificate (.cer file)

5. **Install Certificate**
   - Double-click the downloaded .cer file
   - It will open in Keychain Access and install

6. **Export as .p12**
   - In Keychain Access, find your certificate (usually in "My Certificates")
   - Right-click → Export
   - Choose .p12 format
   - Set a strong password (you'll need this)
   - Save to a secure location

7. **Add to .env**
   ```bash
   CSC_LINK=/path/to/your/certificate.p12
   CSC_KEY_PASSWORD=your_p12_password_here
   ```

### Option 2: Self-Signed Certificate (Development Only)
**Cost**: Free (but app will show warnings)

1. **Generate Self-Signed Certificate**
   ```bash
   # Open Keychain Access
   open /Applications/Utilities/Keychain\ Access.app
   ```
   - Menu: Keychain Access → Certificate Assistant → Create a Certificate
   - Name: "v0lt Development"
   - Identity Type: Self Signed Root
   - Certificate Type: Code Signing
   - Click "Create"

2. **Export as .p12**
   - Find the certificate in Keychain Access
   - Right-click → Export
   - Choose .p12 format
   - Set a password
   - Save it

3. **Add to .env**
   ```bash
   CSC_LINK=/path/to/your/development-cert.p12
   CSC_KEY_PASSWORD=your_password_here
   ```

## Testing Your Setup

### 1. Verify Token
```bash
# Test GitHub token
curl -H "Authorization: token YOUR_GH_TOKEN" https://api.github.com/user
```

### 2. Verify Certificate
```bash
# Check if certificate is properly configured
security find-identity -v -p codesigning
```

### 3. Test Release Build
```bash
# This will use your certificates and token
npm run release
```

## Security Best Practices

1. **Never commit .env or certificates to git**
2. **Store certificates in a secure location**
3. **Use strong passwords for .p12 files**
4. **Rotate GitHub tokens periodically**
5. **Revoke tokens if compromised**

## Troubleshooting

### "Certificate not trusted"
- Self-signed certificates will always show warnings
- Only Apple Developer certificates are fully trusted

### "GitHub token unauthorized"
- Ensure the token has `repo` scope
- Check if token has expired
- Verify you copied the entire token

### "Certificate not found"
- Check the path in CSC_LINK is absolute
- Verify the .p12 file exists
- Ensure password is correct

## Distribution Notes

- **With Apple Developer Certificate**: Users can install without warnings
- **With Self-Signed Certificate**: Users will see "unidentified developer" warning
- **Without Certificate**: macOS Gatekeeper will block the app by default

For production distribution, an Apple Developer Certificate is strongly recommended.