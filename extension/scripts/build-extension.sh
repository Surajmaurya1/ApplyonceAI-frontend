#!/usr/bin/env bash
set -euo pipefail

echo "Building ApplyOnce AI Extension..."

cd "$(dirname "$0")/.."

# Step 1: Verify .env exists
if [ ! -f ".env" ]; then
  echo "ERROR: .env not found. Create it from .env.example with VITE_API_URL set."
  exit 1
fi

# Step 2: Verify VITE_API_URL is set
if ! grep -q "VITE_API_URL=http" .env; then
  echo "ERROR: VITE_API_URL is not set in extension/.env."
  exit 1
fi

# Step 3: Verify NO AI keys are in .env
for key in GEMINI_API_KEY GROQ_API_KEY CEREBRAS_API_KEY OPENROUTER_API_KEY; do
  if grep -q "$key=" .env; then
    echo "SECURITY ERROR: $key found in extension .env. Remove it before building."
    exit 1
  fi
done

# Step 4: Build
npm run build

# Step 5: Scan the built output for secrets
echo "Scanning dist/ for secrets..."

SECRET_PATTERNS=(
  "AIza"
  "gsk_"
  "csk-"
  "sk-or-v1-"
  "GEMINI_API_KEY"
  "GROQ_API_KEY"
  "CEREBRAS_API_KEY"
  "OPENROUTER_API_KEY"
  "generativelanguage.googleapis.com"
  "api.groq.com"
  "api.cerebras.ai"
  "openrouter.ai"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -r "$pattern" dist/ --include="*.js" 2>/dev/null | grep -qv "//"; then
    echo "SECURITY VIOLATION: Pattern '$pattern' found in dist/. Aborting."
    rm -rf dist/
    exit 1
  fi
done

echo "Security scan passed. No secrets in build output."

# Step 6: Create zip
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="applyonce-extension-v${VERSION}.zip"

cd dist
zip -r "../$ZIP_NAME" . -x "*.map" -x "*.d.ts"
cd ..

echo "Extension packaged: $ZIP_NAME"
echo "Size: $(du -sh "$ZIP_NAME" | cut -f1)"
echo "READY to upload to Chrome Web Store."
