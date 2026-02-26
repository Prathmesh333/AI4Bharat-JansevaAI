# Pre-Push Checklist for GitHub

Before pushing your code to GitHub, verify these items:

## ✅ Security Checks

- [ ] `.env` file is in `.gitignore` (contains API keys)
- [ ] No API keys or secrets in code
- [ ] No AWS credentials in repository
- [ ] `.gitignore` is properly configured
- [ ] Sensitive files are excluded

## ✅ Code Quality

- [ ] All tests pass (`npm test`)
- [ ] No console.log statements in production code
- [ ] Code is properly formatted
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] No TODO comments with sensitive information

## ✅ Documentation

- [ ] README.md is updated with:
  - [ ] Your GitHub username
  - [ ] Team member names
  - [ ] Contact information
  - [ ] Correct repository URL
- [ ] LICENSE file is present
- [ ] CONTRIBUTING.md is present
- [ ] All documentation files are up to date

## ✅ Configuration Files

- [ ] `package.json` has correct project name and description
- [ ] `.env.example` exists (without actual secrets)
- [ ] `tsconfig.json` is properly configured
- [ ] `jest.config.js` is present

## ✅ Project Structure

- [ ] All source code is in `src/`
- [ ] All tests are in `tests/`
- [ ] Infrastructure code is in `infrastructure/`
- [ ] Documentation is in `.kiro/specs/`
- [ ] No unnecessary files (temp files, logs, etc.)

## ✅ Files to Include

- [x] Source code (`src/`)
- [x] Tests (`tests/`)
- [x] Infrastructure (`infrastructure/`)
- [x] Documentation (`.kiro/specs/`, `*.md`)
- [x] Configuration (`package.json`, `tsconfig.json`, etc.)
- [x] Server code (`server/`)
- [x] Public assets (`server/public/`)
- [x] `.env.example` (template without secrets)

## ✅ Files to Exclude (in .gitignore)

- [x] `node_modules/`
- [x] `.env` (contains secrets)
- [x] `coverage/`
- [x] `dist/`, `build/`
- [x] `.vscode/`, `.idea/`
- [x] `*.log`
- [x] `cdk.out/`

## ✅ Before First Push

```bash
# 1. Check git status
git status

# 2. Review what will be committed
git diff --cached

# 3. Verify .env is NOT in the list
git status | grep .env
# Should show: nothing (if .env is properly ignored)

# 4. Check for large files
git ls-files -z | xargs -0 du -h | sort -h | tail -10

# 5. Run tests one more time
npm test

# 6. Check for sensitive data
git grep -i "api.key\|password\|secret\|token" -- ':!*.md' ':!GITHUB_SETUP.md'
```

## ✅ Repository Settings (After Push)

- [ ] Repository is Public (for hackathon)
- [ ] Description is set
- [ ] Topics/tags are added
- [ ] README displays correctly
- [ ] License is visible
- [ ] Team members are added as collaborators

## ✅ AWS Credits Form

- [ ] GitHub URL is added to form
- [ ] Repository is accessible (public)
- [ ] README shows project status
- [ ] Code demonstrates technical capability

## 🚨 Critical: Never Push These

- ❌ `.env` file with real API keys
- ❌ AWS credentials
- ❌ Database passwords
- ❌ Private keys or certificates
- ❌ Personal information
- ❌ Large binary files (videos, large images)

## ✅ Final Verification

```bash
# Clone your repo in a temp directory to verify
cd /tmp
git clone https://github.com/YOUR_USERNAME/janseva-ai.git
cd janseva-ai
npm install
npm test
npm start
```

If everything works, you're good to go! 🚀

---

## Quick Commands

```bash
# Initialize and push
git init
git add .
git commit -m "Initial commit: JanSeva AI - Voice-first welfare scheme assistant"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/janseva-ai.git
git push -u origin main
```

## After Pushing

1. ✅ Verify on GitHub: https://github.com/YOUR_USERNAME/janseva-ai
2. ✅ Update AWS credits form with GitHub URL
3. ✅ Share with team members
4. ✅ Add repository topics/tags
5. ✅ Star your own repo (for visibility)

---

**Ready to push?** Follow the [GITHUB_SETUP.md](GITHUB_SETUP.md) guide!
