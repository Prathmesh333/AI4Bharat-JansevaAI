# GitHub Setup Guide

Follow these steps to push your JanSeva AI project to GitHub.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `janseva-ai`
3. Description: `Voice-first multilingual AI assistant for government welfare schemes`
4. Choose: **Public** (for hackathon visibility)
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

## Step 2: Initialize Git (if not already done)

```bash
# Navigate to your project directory
cd D:\Hackathon\AI4Bharat

# Initialize git (if not already initialized)
git init

# Check status
git status
```

## Step 3: Add Files to Git

```bash
# Add all files (respects .gitignore)
git add .

# Check what will be committed
git status

# Commit the files
git commit -m "Initial commit: JanSeva AI - Voice-first welfare scheme assistant"
```

## Step 4: Connect to GitHub

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/janseva-ai.git

# Verify remote
git remote -v
```

## Step 5: Push to GitHub

```bash
# Push to main branch
git branch -M main
git push -u origin main
```

## Step 6: Verify on GitHub

1. Go to `https://github.com/YOUR_USERNAME/janseva-ai`
2. You should see all your files
3. README.md will be displayed on the homepage

## Step 7: Add Repository Topics

On GitHub repository page:
1. Click "Add topics"
2. Add: `ai`, `aws`, `bedrock`, `voice-ai`, `government`, `india`, `hackathon`, `multilingual`, `accessibility`

## Step 8: Update Repository Description

On GitHub repository page:
1. Click the gear icon next to "About"
2. Description: `Voice-first multilingual AI assistant helping 80 crore Indians access government welfare schemes. Built with AWS Bedrock, Claude Sonnet 4.0, and supporting 22+ Indian languages.`
3. Website: Add your demo URL (if deployed)
4. Topics: Add relevant tags

## Important Files to Check Before Pushing

Make sure these files are properly configured:

✅ `.gitignore` - Excludes sensitive files  
✅ `.env` - Should be in .gitignore (NOT pushed to GitHub)  
✅ `README.md` - Updated with your information  
✅ `LICENSE` - MIT License included  
✅ `CONTRIBUTING.md` - Contribution guidelines  

## What Gets Pushed

✅ Source code (`src/`, `tests/`, `infrastructure/`)  
✅ Documentation (`.kiro/specs/`, `*.md` files)  
✅ Configuration (`package.json`, `tsconfig.json`, `jest.config.js`)  
✅ Public assets (`server/public/`)  
✅ Example files (`.env.example`)  

## What Does NOT Get Pushed (in .gitignore)

❌ `node_modules/` - Dependencies  
❌ `.env` - Environment variables with API keys  
❌ `coverage/` - Test coverage reports  
❌ `dist/`, `build/` - Build outputs  
❌ `.vscode/`, `.idea/` - IDE settings  
❌ `*.log` - Log files  

## Troubleshooting

### Error: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/janseva-ai.git
```

### Error: "failed to push some refs"

```bash
# Pull first, then push
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Large files error

If you get an error about large files:
```bash
# Check file sizes
git ls-files -z | xargs -0 du -h | sort -h | tail -20

# Remove large files from git
git rm --cached path/to/large/file
git commit -m "Remove large file"
```

## After Pushing

1. **Add GitHub URL to AWS Credits Form**
   - Use: `https://github.com/YOUR_USERNAME/janseva-ai`

2. **Create a Release** (optional but recommended)
   - Go to Releases → Create new release
   - Tag: `v1.0.0-hackathon`
   - Title: "JanSeva AI - AI for Bharat 2026 Submission"
   - Description: Brief overview and demo link

3. **Enable GitHub Pages** (optional)
   - Settings → Pages
   - Source: Deploy from main branch
   - Folder: `/docs` or root

4. **Add Team Members**
   - Settings → Collaborators
   - Add your team members

## Next Steps

- [ ] Push code to GitHub
- [ ] Update AWS credits form with GitHub URL
- [ ] Share repository link with team
- [ ] Add screenshots to README
- [ ] Record demo video
- [ ] Deploy to AWS (after getting credits)

---

**Your GitHub URL will be:**
`https://github.com/YOUR_USERNAME/janseva-ai`

Use this URL in your AWS credits application form!
