# 📝 AI for Bharat Hackathon - Submission Form Content

Use the following content to fill the hackathon submission form on Hack2Skill.

---

## Project Title
**JanSeva AI**

---

## Tagline (One-liner)
**Har Haq, Har Haath Tak** — Voice-first AI that connects 800 million Indians with their entitled government welfare benefits

---

## Track Selection
**AI for Communities, Access & Public Impact** (Student Track)

---

## Problem Statement (Max 200 words)

India has 3,000+ government welfare schemes worth ₹15 lakh crore annually, yet less than 40% of eligible citizens access their benefits. The barriers are clear:

1. **Language**: 70% of rural India cannot navigate English-first portals
2. **Digital Literacy**: Complex multi-step applications exclude the digitally underserved
3. **Awareness**: Citizens don't know which schemes they qualify for
4. **Complexity**: Understanding eligibility rules and document requirements is overwhelming

Every year, ₹1.5 lakh crore in entitled benefits goes unclaimed. A farmer in Sitapur misses crop insurance. A mother in Madurai loses maternity benefits. A student in Nagpur forfeits a scholarship.

This is not a technology gap—it's an access gap. Current solutions focus on web portals designed for literate, connected users. But 800 million Indians need something fundamentally different: voice-first, local-language, conversational access to their rights.

---

## Solution Description (Max 300 words)

**JanSeva AI** is a voice-first, multilingual AI assistant that bridges the gap between government welfare schemes and the citizens who need them.

**How it works:**
1. **DISCOVERS**: User speaks in their native language (Hindi, Tamil, Telugu, etc.). AI asks 5-7 simple questions about income, occupation, family.
2. **MATCHES**: Amazon Bedrock RAG analyzes eligibility across 50+ schemes simultaneously
3. **FILLS**: AI generates pre-filled application forms through conversation
4. **GUIDES**: Provides document checklist and nearest CSC (Common Service Center) location

**Key Features:**
- 🎙️ **Voice-First**: No typing needed; works on basic phones via IVR
- 🌐 **10+ Indian Languages**: Hindi, Tamil, Telugu, Bengali, Marathi, and more
- 📱 **Low-Bandwidth**: Works on 2G with text-only fallback
- 📝 **Form Auto-Fill**: Eliminates complex paperwork
- 📍 **Location-Aware**: Finds nearest help centers

**Technology Stack (AWS):**
- Amazon Bedrock (Claude 3.5 + RAG for eligibility reasoning)
- Amazon Polly & Transcribe (voice input/output)
- Amazon Translate (multilingual support)
- AWS Lambda (serverless API)
- Amazon S3 & DynamoDB (data storage)

**Demo Scenario:**
A farmer says in Hindi: "मेरी फसल बाढ़ में खराब हो गई"
JanSeva AI responds: "आप PM फसल बीमा योजना के लिए eligible हैं" → asks questions → fills form → provides document list → shows nearest CSC

**Impact Potential:**
- 800M underserved Indians
- ₹1.5L Cr unclaimed benefits annually
- 10x faster application process

---

## AWS Services Used

1. **Amazon Bedrock** - Foundation model (Claude 3.5 Sonnet) + RAG knowledge base for eligibility reasoning across 50+ government schemes
2. **Amazon Q** - Developer productivity during hackathon development
3. **Amazon Polly** - Neural text-to-speech in Indian languages (Hindi, Tamil)
4. **Amazon Transcribe** - Real-time speech-to-text for voice input
5. **Amazon Translate** - Multilingual support for 10+ Indian languages
6. **AWS Lambda** - Serverless API endpoints
7. **Amazon S3** - Scheme document and form template storage
8. **Amazon DynamoDB** - Session management
9. **Amazon API Gateway** - REST API and WebSocket for voice streaming
10. **Amazon OpenSearch Serverless** - Vector embeddings for RAG

---

## Innovation & Uniqueness (Max 150 words)

JanSeva AI is NOT another chatbot. Here's what makes it unique:

1. **Voice-First Form-Filling Agent**: Unlike existing chatbots that just answer questions, JanSeva AI FILLS your application through conversation. No forms, no typing, no confusion.

2. **Multi-Scheme Eligibility in One Conversation**: Users discover ALL schemes they qualify for simultaneously, not one at a time.

3. **True "Bharat" Design**: Built for 2G networks, low-literacy users, and regional dialects—not as an afterthought but as the core architecture.

4. **Proactive Guidance**: Doesn't just tell you about schemes—provides pre-filled PDFs, document checklists, and nearest service center with directions.

5. **Scalable RAG Architecture**: Adding a new scheme is as simple as adding a JSON file. Ready to scale to 3,000+ schemes.

This is welfare delivery reimagined for the digital India that actually exists.

---

## Impact & Relevance (Max 150 words)

**Quantified Impact:**
- **800 million** Indians lack digital literacy to access current portals
- **₹1.5 lakh crore** in welfare benefits go unclaimed annually
- **3,000+** schemes exist but awareness is below 40%

**Direct Beneficiaries:**
- 150M+ farmers (PM-KISAN, Fasal Bima)
- 200M+ women (maternity benefits, Sukanya Samriddhi)
- 100M+ students (scholarships, fee waivers)
- 140M+ senior citizens (pension schemes)

**Bharat Relevance:**
- Voice-first for non-literate users
- 10+ Indian languages from Day 1
- Works on 2G/low-bandwidth
- Partners with existing CSC infrastructure

**Scalability:**
- Serverless architecture scales to 1B users
- Per-query cost: ~₹0.50
- Year 1 target: 1M users, ₹50 Cr benefits unlocked

This directly addresses India's last-mile governance challenge.

---

## Demo Video Link
[To be added after recording]

---

## GitHub Repository
[To be added after code push]

---

## Team Details

| Name | Role | College/Organization |
|------|------|---------------------|
| [Your Name] | Team Lead / Full Stack | [Your College] |
| [Member 2] | AI/ML Engineer | [College] |
| [Member 3] | Backend Developer | [College] |
| [Member 4] | Domain Expert | [College] |

---

## Additional Notes

- All scheme data sourced from official government portals (myscheme.gov.in, scholarship.gov.in)
- Privacy-first: No PII stored; Aadhaar used only for session-based form filling
- Open to partnership with CSC e-Governance for deployment
- Aligned with Digital India and Digital Public Infrastructure (DPI) vision
