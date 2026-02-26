# 🎯 JanSeva AI - PowerPoint Presentation Content

## Instructions
Copy each slide's content into your PowerPoint template "Idea Submission _ AWS AI for Bharat Hackathon.pptx"

---

## Slide 1: Title Slide

**Title:** JanSeva AI

**Tagline:** *"Har Haq, Har Haath Tak"*
*(Every Right, To Every Hand)*

**Subtitle:** Voice-first AI that connects 800 million Indians with government welfare benefits

**Track:** AI for Communities, Access & Public Impact

**Powered by:** AWS Bedrock

---

## Slide 2: The Problem

### India's Welfare Paradox

| Statistic | Reality |
|-----------|---------|
| **₹15 Lakh Crore** | Annual government welfare budget |
| **3,000+** | Government schemes available |
| **<40%** | Actual utilization rate |
| **₹1.5 Lakh Crore** | Unclaimed benefits every year |

### 4 Barriers Preventing Access

1. 🔤 **Language Barrier** — 70% cannot navigate English portals
2. 💻 **Digital Illiteracy** — Complex multi-step online applications
3. 📋 **Awareness Gap** — Citizens don't know what they qualify for
4. 📄 **Documentation Confusion** — Unclear requirements & processes

---

## Slide 3: Meet JanSeva AI

### What Is JanSeva AI?

A **voice-first, multilingual AI assistant** that transforms how citizens access government welfare.

### How It Works

```
👤 Citizen speaks in their language
        ↓
🤖 AI asks 5-7 simple questions
        ↓
🎯 Matches to ALL eligible schemes
        ↓
📝 Generates pre-filled application form
        ↓
📍 Provides documents + nearest service center
```

**In 2 minutes, what used to take 2 hours.**

---

## Slide 4: Key Features

| Feature | Description | Bharat Relevance |
|---------|-------------|------------------|
| 🎙️ **Voice-First** | Speak naturally, no typing | 70% rural users prefer voice |
| 🌐 **10+ Languages** | Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia | Covers 95% population |
| 🎯 **Smart Discovery** | One conversation → Multiple schemes found | No portal hunting |
| 📝 **Auto Form-Fill** | Conversation fills application forms | Eliminates paperwork |
| 📱 **Low-Bandwidth** | Works on 2G, text fallback | Accessible everywhere |
| 📍 **Location-Aware** | Nearest CSC with hours & directions | Reduces travel confusion |
| 🔒 **Privacy-First** | No data stored after session | Built on trust |

---

## Slide 5: Demo Flow

### User Journey: Farmer Seeking Crop Insurance

**Step 1: Voice Input (Hindi)**
> "मेरी फसल बाढ़ में खराब हो गई, कोई मदद मिल सकती है?"

**Step 2: Smart Eligibility Questions**
- Family income?
- Land holding size?
- Already enrolled in PM-KISAN?
- Category (SC/ST/OBC)?
- State and District?

**Step 3: Scheme Discovery**
✅ PM Fasal Bima Yojana — Eligible (Crop Insurance)
✅ PM-KISAN — Eligible (₹6,000/year)
✅ Kisan Credit Card — Check documents

**Step 4: Form Generation & Guidance**
- Pre-filled PDF application ready
- Documents: Aadhaar, KCC, Land Records
- Nearest CSC: 3 km away, Mon-Fri 10-5

---

## Slide 6: Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      USER CHANNELS                           │
│   WhatsApp  │  Voice (IVR)  │  Web App  │  Mobile App       │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    AWS API GATEWAY                           │
│              (REST + WebSocket for Voice)                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│               VOICE PROCESSING LAYER                         │
│  Amazon Transcribe → Amazon Translate → Amazon Polly        │
│  (Speech-to-Text)    (Multilingual)     (Text-to-Speech)    │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                  AMAZON BEDROCK                              │
│             Claude 3.5 Sonnet + RAG                          │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Conversation    │  │ Knowledge Base                   │   │
│  │ Engine          │  │ • 3,000+ Schemes                 │   │
│  │ • Intent        │  │ • Eligibility Rules              │   │
│  │ • Context       │  │ • Documents Required             │   │
│  │ • Form Fill     │  │ • Application Procedures         │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    DATA LAYER                                │
│  DynamoDB (Sessions) │ S3 (Forms) │ OpenSearch (Vectors)    │
└──────────────────────────────────────────────────────────────┘
```

---

## Slide 7: AWS Services Deep Dive

| Service | Purpose | How We Use It |
|---------|---------|---------------|
| **Amazon Bedrock** | Foundation Model + RAG | Claude 3.5 Sonnet for conversation & eligibility reasoning |
| **Amazon Q** | Developer Productivity | Accelerates development during hackathon |
| **Amazon Transcribe** | Speech-to-Text | Real-time voice input in 10+ Indian languages |
| **Amazon Polly** | Text-to-Speech | Neural voices for natural responses |
| **Amazon Translate** | Multilingual | Real-time translation across all languages |
| **AWS Lambda** | Serverless Compute | All core services run serverless |
| **Amazon DynamoDB** | Session Storage | 7-day session persistence for resumption |
| **Amazon S3** | Document Storage | Scheme templates & generated forms |
| **Amazon OpenSearch** | Vector Database | Semantic search for RAG |
| **Amazon API Gateway** | API Layer | REST + WebSocket for voice streaming |

---

## Slide 8: Core Services

### 5 Microservices Architecture

| Service | Responsibility |
|---------|----------------|
| **Voice Processing Service** | Speech-to-text, text-to-speech, language detection, 2G optimization |
| **Conversation Service** | Claude 3.5 integration, context management, state machine |
| **Eligibility Service** | User profiling, scheme matching, benefit ranking |
| **Form Generation Service** | Field mapping, PDF generation, reference numbers |
| **Location Service** | CSC discovery, travel time, document guidance |

### Design Patterns
- Serverless-first with AWS Lambda
- Event-driven with Amazon EventBridge
- DynamoDB for session state
- S3 for document storage
- CloudWatch for monitoring

---

## Slide 9: Data Models

### User Profile Structure
```
UserProfile {
  demographics: { age, gender, category, maritalStatus }
  location: { state, district, block, village, pincode }
  occupation: { type, sector, income, landHolding }
  family: { size, dependents, children, elderlyMembers }
  documents: { aadhaar, pan, bankAccount, rationCard... }
}
```

### Scheme Information
```
SchemeInfo {
  id, name, nameTranslations
  eligibilityCriteria: { age, income, category, occupation... }
  benefits: { amount, frequency, type }
  requiredDocuments: [...]
  applicationProcess: [steps...]
}
```

### Session Management
- SessionId, Language, CurrentIntent
- ConversationHistory, UserProfile
- EligibleSchemes, SelectedScheme
- FormData, Status
- 7-day TTL for session persistence

---

## Slide 10: Requirements Fulfilled

### 14 Requirements Implemented

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Voice-First Multilingual Interaction | ✅ 10+ Indian languages |
| 2 | Intelligent Scheme Discovery | ✅ RAG across 3000+ schemes |
| 3 | Conversational Form Generation | ✅ Natural language → PDF |
| 4 | Location-Aware Service Guidance | ✅ CSC + documents + directions |
| 5 | Privacy-First Data Handling | ✅ Session-only, auto-delete |
| 6 | Robust Knowledge Management | ✅ OpenSearch + daily updates |
| 7 | Session Management & Continuity | ✅ 7-day resume capability |
| 8 | Error Handling & Fallback | ✅ Graceful degradation |
| 9 | Performance & Scalability | ✅ <3s voice, 1000 concurrent |
| 10 | Analytics & Impact Measurement | ✅ Anonymized tracking |
| 11 | Security & Compliance | ✅ AES-256, TLS 1.3, PII masking |
| 12 | Scheme Lifecycle Management | ✅ 48-hour new scheme ingestion |
| 13 | Offline & Low-Connectivity Support | ✅ 2G mode, text fallback |
| 14 | Accessibility & Inclusivity | ✅ WCAG 2.1 AA compliant |

---

## Slide 11: Innovation & Uniqueness

### What Makes JanSeva AI Different?

| Aspect | Generic Chatbots | JanSeva AI |
|--------|------------------|------------|
| **Interaction** | Text-only | Voice-first + multilingual |
| **Discovery** | Single scheme lookup | Multi-scheme eligibility in one go |
| **Output** | Just information | Pre-filled application forms |
| **Network** | Requires 4G+ | Works on 2G |
| **Languages** | English/Hindi | 10+ regional languages |
| **Privacy** | Stores user data | Session-only, auto-delete |
| **Guidance** | Generic instructions | Personalized document checklist + nearest CSC |

### Technical Innovations
1. **Conversational Form-Filling Agent** — Not just Q&A, actually fills forms
2. **Multi-Scheme RAG** — Check eligibility across 3000+ schemes simultaneously
3. **2G-Optimized Voice** — Compressed audio, text fallback, offline caching
4. **Privacy by Design** — Zero data retention after session

---

## Slide 12: Impact & Relevance

### Potential Impact

| Metric | Scale |
|--------|-------|
| **Underserved Population** | 800 Million Indians |
| **Annual Unclaimed Benefits** | ₹1.5 Lakh Crore |
| **Schemes Covered** | 3,000+ |
| **Languages Supported** | 10+ |

### Target Beneficiaries

| Segment | Population | Key Schemes |
|---------|------------|-------------|
| 👨‍🌾 Farmers | 150M+ | PM-KISAN, Fasal Bima, KCC |
| 👩 Women | 200M+ | Sukanya Samriddhi, Maternity Benefits |
| 🎓 Students | 100M+ | NSP, Post-Matric Scholarships |
| 👴 Seniors | 140M+ | Pension, Ayushman Bharat |
| 👷 Workers | 80M+ | E-Shram, Labor Welfare |

### Year 1 Goals
- 1 Million users served
- ₹50 Crore benefits unlocked
- 10 languages fully supported
- 200+ schemes in knowledge base

---

## Slide 13: Judging Criteria Alignment

| Criteria | Weight | Our Strength | Evidence |
|----------|--------|--------------|----------|
| **Technical Excellence** | 30% | Full AWS Bedrock + RAG + Voice stack | 10 AWS services integrated |
| **Innovation & Creativity** | 30% | Voice-first form-filling agent | Not a generic chatbot |
| **Impact & Relevance** | 25% | Maximum Bharat focus | 800M underserved citizens |
| **Completeness & Presentation** | 15% | End-to-end working demo | Voice → Eligibility → Form → Guidance |

### Why We Win
✅ Directly addresses "AI for Bharat" theme  
✅ Solves real problem for real people  
✅ Uses cutting-edge AWS GenAI services  
✅ Demonstrable, polished prototype  
✅ Clear path to national scale

---

## Slide 14: Implementation Plan

### Hackathon Timeline

| Phase | Dates | Deliverable |
|-------|-------|-------------|
| **Idea Submission** | Jan 13-25, 2026 | This presentation + demo video |
| **Prototype Dev** | Feb 10-22, 2026 | Full MVP with 50 schemes |
| **Final Shortlist** | Mar 10, 2026 | Refined product |
| **Virtual Pitching** | Mar 16-17, 2026 | Live demo |

### Development Phases

**Week 1: Core Infrastructure**
- AWS setup (Bedrock, Transcribe, Polly)
- Knowledge base with 50 schemes
- Basic conversation flow

**Week 2: Key Features**
- Voice processing pipeline
- Eligibility engine with RAG
- Form generation service

**Week 3: Polish**
- Multi-language support
- Location service
- Demo preparation

---

## Slide 15: Future Roadmap

### Phase 2: Post-Hackathon (Month 1-2)
- Expand to 200 schemes
- Add 5 more regional languages
- WhatsApp Business API production deployment
- CSC operator partnership pilot

### Phase 3: Scale (Month 3-6)
- DigiLocker integration for document pre-fetch
- Direct e-Filing to select government portals
- Government partnership discussions
- Performance optimization for 1M+ users

### Phase 4: National Deployment (Year 1)
- All 3,000+ schemes coverage
- All 22 scheduled languages
- AI-powered grievance tracking
- Impact dashboard for government stakeholders

---

## Slide 16: Team

| Role | Responsibility | Skills |
|------|----------------|--------|
| **Team Lead / Full Stack** | Architecture, Frontend, Integration | React, Node.js, AWS |
| **AI/ML Engineer** | Bedrock RAG, Prompt Engineering | Python, LangChain, ML |
| **Backend Developer** | Lambda, DynamoDB, APIs | Serverless, TypeScript |
| **Domain Expert** | Scheme Research, User Testing | Government systems knowledge |

---

## Slide 17: Call to Action

### JanSeva AI

**"Har Haq, Har Haath Tak"**

*Every Right, To Every Hand*

---

**What We're Building:**
A voice-first AI that connects 800 million Indians with their entitled government benefits.

**Why It Matters:**
₹1.5 Lakh Crore in welfare benefits go unclaimed every year because of language, literacy, and access barriers.

**How We'll Win:**
By making government schemes as easy as a phone conversation in your own language.

---

### Thank You! 🙏

**Track:** AI for Communities, Access & Public Impact  
**Powered by:** AWS Bedrock  
**Prize Pool:** ₹40 Lakhs

---

## Appendix Slides (Optional)

### A1: Scheme Categories Covered

| Category | Example Schemes | Beneficiaries |
|----------|-----------------|---------------|
| Agriculture | PM-KISAN, PMFBY, KCC | 150M farmers |
| Education | NSP, INSPIRE, Post-Matric | 100M students |
| Healthcare | Ayushman Bharat, Janani Suraksha | 500M citizens |
| Housing | PMAY-G, PMAY-U | 50M families |
| Social Security | APY, PMSBY, PMJJBY | 200M workers |
| Employment | MGNREGA, PMEGP, Mudra | 80M job seekers |

### A2: Performance Targets

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Voice Response Time | <3 seconds | Rural users on slow networks |
| Eligibility Check | <10 seconds | Check 100+ schemes |
| Form Generation | <15 seconds | Complex PDF creation |
| Concurrent Sessions | 1,000+ | Peak load handling |
| Language Switch | Seamless | Natural conversation |

### A3: Security & Compliance

| Requirement | Implementation |
|-------------|----------------|
| Aadhaar Compliance | UIDAI regulations, no storage |
| Encryption at Rest | AES-256 |
| Encryption in Transit | TLS 1.3+ |
| PII Masking | All logs sanitized |
| Rate Limiting | 100 req/min per user |
| Data Retention | Session-only, 7-day max |

---

## How to Use This Content

1. **Slide 1-3**: Opening hook, problem, solution (2 min)
2. **Slide 4-5**: Features + Demo flow (1.5 min)
3. **Slide 6-9**: Technical deep dive (1.5 min)
4. **Slide 10-13**: Requirements + Innovation + Impact (1.5 min)
5. **Slide 14-16**: Roadmap + Team (1 min)
6. **Slide 17**: Closing + CTA (0.5 min)

**Total: ~8 minutes** (or trim slides 6-9 for 5-minute version)
