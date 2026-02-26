# 🏗️ JanSeva AI - Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JANSEVA AI ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────── USER CHANNELS ───────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │   │
│  │  │ WhatsApp │   │   IVR    │   │  Web App │   │  Mobile  │         │   │
│  │  │   Bot    │   │  (Voice) │   │ (PWA)    │   │   App    │         │   │
│  │  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘         │   │
│  │       │              │              │              │                │   │
│  └───────┴──────────────┴──────────────┴──────────────┴────────────────┘   │
│                                    │                                        │
│                        ┌───────────▼───────────┐                           │
│                        │   API Gateway (REST)  │                           │
│                        │   + WebSocket (Voice) │                           │
│                        └───────────┬───────────┘                           │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐ │
│  │                     AWS LAMBDA ORCHESTRATOR                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    Session Manager                               │  │ │
│  │  │  • User context tracking                                        │  │ │
│  │  │  • Conversation state machine                                   │  │ │
│  │  │  • Language preference                                          │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         │                          │                          │            │
│         ▼                          ▼                          ▼            │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│  │   AMAZON    │          │   AMAZON    │          │   AMAZON    │        │
│  │ TRANSCRIBE  │          │   POLLY     │          │  TRANSLATE  │        │
│  │ (Speech→Text)│         │ (Text→Speech)│         │ (Multi-lang) │        │
│  │             │          │             │          │             │        │
│  │ Hindi, Tamil│          │ Neural TTS  │          │ 10+ Indian  │        │
│  │ Telugu, etc │          │ Indian voice│          │ Languages   │        │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘        │
│         │                        │                        │                │
│         └────────────────────────┼────────────────────────┘                │
│                                  │                                          │
│                        ┌─────────▼─────────┐                               │
│                        │   AMAZON BEDROCK  │                               │
│                        │   (AI Engine)     │                               │
│                        └─────────┬─────────┘                               │
│                                  │                                          │
│  ┌───────────────────────────────┴───────────────────────────────────────┐ │
│  │                      BEDROCK COMPONENTS                                │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │ │
│  │  │  Claude 3.5     │  │   Knowledge     │  │    Guardrails   │       │ │
│  │  │  Sonnet         │  │   Base (RAG)    │  │                 │       │ │
│  │  │                 │  │                 │  │ • PII filtering │       │ │
│  │  │ • Eligibility   │  │ • 3000+ schemes │  │ • Harmful content│      │ │
│  │  │   reasoning     │  │ • State rules   │  │ • Bias detection│       │ │
│  │  │ • Form filling  │  │ • Documents     │  │                 │       │ │
│  │  │ • Conversation  │  │ • Procedures    │  │                 │       │ │
│  │  └────────┬────────┘  └────────┬────────┘  └─────────────────┘       │ │
│  │           │                    │                                      │ │
│  │           └────────────────────┘                                      │ │
│  │                      │                                                 │ │
│  └──────────────────────┼─────────────────────────────────────────────────┘ │
│                         │                                                   │
│              ┌──────────▼──────────┐                                       │
│              │   OUTPUT GENERATOR  │                                       │
│              └──────────┬──────────┘                                       │
│                         │                                                   │
│         ┌───────────────┼───────────────┐                                  │
│         │               │               │                                  │
│         ▼               ▼               ▼                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                          │
│  │  Pre-filled │ │  Document   │ │   Location  │                          │
│  │    Forms    │ │  Checklist  │ │   Finder    │                          │
│  │   (PDF)     │ │  (Local)    │ │   (Maps)    │                          │
│  └─────────────┘ └─────────────┘ └─────────────┘                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Amazon S3  │  │  DynamoDB   │  │  OpenSearch │  │  Secrets    │       │
│  │             │  │             │  │  Serverless │  │  Manager    │       │
│  │ • Scheme    │  │ • Sessions  │  │             │  │             │       │
│  │   documents │  │ • User pref │  │ • Vector    │  │ • API keys  │       │
│  │ • Form      │  │ • Analytics │  │   embeddings│  │ • Tokens    │       │
│  │   templates │  │             │  │   for RAG   │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. User Channels Layer

| Channel | Technology | Use Case |
|---------|------------|----------|
| **WhatsApp Bot** | Twilio/Meta Business API | Most accessible for rural users |
| **IVR (Voice)** | Amazon Connect + Lex | For users without smartphones |
| **Web App (PWA)** | React + Vite | CSC operators, urban users |
| **Mobile App** | React Native | Future phase |

### 2. Voice Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE PROCESSING FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎤 User speaks      "मेरी फसल खराब हो गई"                       │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────┐                                           │
│  │ Amazon Transcribe│  Language: hi-IN                         │
│  │ (Real-time STT) │  Model: Enhanced                          │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Text Output:    │  "मेरी फसल खराब हो गई"                     │
│  │ Language Code:  │  "hi"                                     │
│  │ Confidence:     │  0.94                                     │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Amazon Translate│  (If needed for processing)               │
│  │ hi → en        │  "My crop has been damaged"                │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Bedrock Claude  │  Process in English                       │
│  │ (Reasoning)     │  for best accuracy                        │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Amazon Translate│  en → hi (Response)                       │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Amazon Polly    │  Voice: Aditi (Hindi Neural)              │
│  │ (Neural TTS)    │  Speaking rate: 0.9x                      │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  🔊 User hears      "आप PM फसल बीमा योजना के लिए eligible हैं"  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. RAG Knowledge Base Structure

```
SCHEME KNOWLEDGE BASE (Amazon Bedrock + OpenSearch)
│
├── /central_schemes/
│   ├── agriculture/
│   │   ├── pm-kisan.json
│   │   ├── pm-fasal-bima.json
│   │   └── kisan-credit-card.json
│   ├── education/
│   │   ├── pm-scholarship.json
│   │   ├── national-means-merit.json
│   │   └── post-matric-scholarship.json
│   ├── healthcare/
│   │   ├── ayushman-bharat.json
│   │   └── janani-suraksha.json
│   └── social-welfare/
│       ├── pm-awas-yojana.json
│       ├── sukanya-samriddhi.json
│       └── atal-pension.json
│
├── /state_schemes/
│   ├── uttar_pradesh/
│   ├── maharashtra/
│   ├── tamil_nadu/
│   └── ... (28 states + 8 UTs)
│
├── /eligibility_rules/
│   ├── income_criteria.json
│   ├── caste_criteria.json
│   ├── age_criteria.json
│   └── occupation_criteria.json
│
└── /documents_required/
    ├── identity_docs.json
    ├── income_docs.json
    └── category_docs.json
```

**Sample Scheme JSON:**
```json
{
  "scheme_id": "PM-KISAN-001",
  "name": {
    "en": "PM-KISAN Samman Nidhi",
    "hi": "पीएम-किसान सम्मान निधि"
  },
  "description": {
    "en": "Income support of ₹6,000 per year to farmer families",
    "hi": "किसान परिवारों को ₹6,000 प्रति वर्ष की आय सहायता"
  },
  "eligibility": {
    "occupation": ["farmer", "agricultural_laborer"],
    "land_ownership": "required",
    "max_land_hectares": 2,
    "excluded_categories": ["institutional_land_holders", "income_tax_payers"]
  },
  "benefits": {
    "amount": 6000,
    "frequency": "yearly",
    "installments": 3
  },
  "documents_required": [
    "aadhaar_card",
    "bank_passbook",
    "land_records",
    "self_declaration"
  ],
  "application_portal": "https://pmkisan.gov.in",
  "helpline": "155261"
}
```

### 4. Conversation State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONVERSATION STATE MACHINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐      User initiates      ┌─────────────────┐      │
│  │  IDLE   │ ─────────────────────▶   │    GREETING     │      │
│  └─────────┘                          │  (Language Det) │      │
│                                       └────────┬────────┘      │
│                                                │               │
│                                                ▼               │
│                                       ┌─────────────────┐      │
│                                       │ NEED_DISCOVERY  │      │
│                                       │ "What help do   │      │
│                                       │  you need?"     │      │
│                                       └────────┬────────┘      │
│                                                │               │
│                           ┌────────────────────┼────────────┐  │
│                           │                    │            │  │
│                           ▼                    ▼            ▼  │
│                    ┌────────────┐      ┌────────────┐ ┌──────┐ │
│                    │ ELIGIBILITY│      │  SPECIFIC  │ │ FAQ  │ │
│                    │  DISCOVERY │      │   SCHEME   │ │      │ │
│                    │ (General)  │      │  (Named)   │ │      │ │
│                    └─────┬──────┘      └─────┬──────┘ └──┬───┘ │
│                          │                   │           │     │
│                          │                   │           │     │
│                          ▼                   ▼           │     │
│                    ┌─────────────────────────────┐       │     │
│                    │     QUESTION_COLLECTION    │       │     │
│                    │  • Income level            │       │     │
│                    │  • Family size             │       │     │
│                    │  • Occupation              │       │     │
│                    │  • Category (SC/ST/OBC)    │       │     │
│                    │  • State/District          │       │     │
│                    └────────────┬────────────────┘       │     │
│                                 │                        │     │
│                                 ▼                        │     │
│                    ┌─────────────────────────────┐       │     │
│                    │     ELIGIBILITY_CHECK      │◀──────┘     │
│                    │  (Bedrock RAG Query)       │             │
│                    └────────────┬────────────────┘             │
│                                 │                              │
│                                 ▼                              │
│                    ┌─────────────────────────────┐             │
│                    │     SCHEME_PRESENTATION    │             │
│                    │  "You are eligible for:"   │             │
│                    │  • PM-KISAN ✅              │             │
│                    │  • Fasal Bima ✅            │             │
│                    └────────────┬────────────────┘             │
│                                 │                              │
│              User selects scheme│                              │
│                                 ▼                              │
│                    ┌─────────────────────────────┐             │
│                    │      FORM_FILLING          │             │
│                    │  Collect form fields via   │             │
│                    │  conversation              │             │
│                    └────────────┬────────────────┘             │
│                                 │                              │
│                                 ▼                              │
│                    ┌─────────────────────────────┐             │
│                    │      OUTPUT_DELIVERY       │             │
│                    │  • Pre-filled PDF          │             │
│                    │  • Document checklist      │             │
│                    │  • Nearest CSC location    │             │
│                    └────────────┬────────────────┘             │
│                                 │                              │
│                                 ▼                              │
│                    ┌─────────────────────────────┐             │
│                    │      SESSION_COMPLETE      │             │
│                    │  Save for follow-up        │             │
│                    └─────────────────────────────┘             │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Specification

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/session/start` | POST | Initialize conversation session |
| `/api/v1/message` | POST | Send user message (text/audio) |
| `/api/v1/eligibility/check` | POST | Check eligibility for schemes |
| `/api/v1/forms/generate` | POST | Generate pre-filled form PDF |
| `/api/v1/location/csc` | GET | Find nearest CSC center |

### Sample Request/Response

**Start Session:**
```json
// POST /api/v1/session/start
{
  "channel": "whatsapp",
  "user_phone": "+91XXXXXXXXXX",
  "language_preference": "hi"
}

// Response
{
  "session_id": "sess_abc123",
  "greeting": "नमस्ते! मैं जनसेवा AI हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
  "audio_url": "https://s3.../greeting_hi.mp3"
}
```

**Check Eligibility:**
```json
// POST /api/v1/eligibility/check
{
  "session_id": "sess_abc123",
  "user_profile": {
    "occupation": "farmer",
    "annual_income": 120000,
    "land_hectares": 1.5,
    "state": "uttar_pradesh",
    "category": "obc",
    "family_size": 4
  }
}

// Response
{
  "eligible_schemes": [
    {
      "scheme_id": "PM-KISAN-001",
      "name": "पीएम-किसान सम्मान निधि",
      "benefit": "₹6,000/वर्ष",
      "confidence": 0.95
    },
    {
      "scheme_id": "PMFBY-001", 
      "name": "पीएम फसल बीमा योजना",
      "benefit": "फसल बीमा",
      "confidence": 0.88
    }
  ],
  "maybe_eligible": [
    {
      "scheme_id": "KCC-001",
      "name": "किसान क्रेडिट कार्ड",
      "missing_info": ["existing_loans"]
    }
  ]
}
```

---

## Security & Privacy

### Data Protection Measures

| Measure | Implementation |
|---------|----------------|
| **No PII Storage** | Session data deleted after 24 hours |
| **Encryption** | AES-256 at rest, TLS 1.3 in transit |
| **Aadhaar Handling** | Masked display, never stored |
| **Audit Logs** | All access logged in CloudWatch |
| **Consent** | Explicit opt-in before processing |

### Bedrock Guardrails

```python
guardrail_config = {
    "content_policy": {
        "filters": ["HATE", "INSULT", "VIOLENCE", "MISCONDUCT"]
    },
    "pii_policy": {
        "action": "MASK",
        "entities": ["AADHAAR", "PAN", "BANK_ACCOUNT"]
    },
    "topic_policy": {
        "blocked_topics": ["POLITICAL", "RELIGIOUS_CONTROVERSY"]
    }
}
```

---

## Scalability Design

### Load Handling

| Component | Scaling Strategy |
|-----------|------------------|
| **API Gateway** | Auto-scaling, 10K RPS |
| **Lambda** | Concurrent executions: 1000 |
| **Bedrock** | Provisioned throughput for peak |
| **DynamoDB** | On-demand capacity |

### Cost Optimization

- **Caching**: Common eligibility queries cached (ElastiCache)
- **Tiered Processing**: Simple FAQs bypass Bedrock
- **Voice Optimization**: Compress audio, stream responses

---

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────┐
│              OBSERVABILITY STACK                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ CloudWatch  │  │   X-Ray     │  │  CloudWatch │ │
│  │   Logs      │  │  (Tracing)  │  │   Metrics   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┼────────────────┘        │
│                          │                         │
│                          ▼                         │
│               ┌─────────────────┐                  │
│               │   Dashboard     │                  │
│               │  • Requests/min │                  │
│               │  • Latency P99  │                  │
│               │  • Error rate   │                  │
│               │  • Language dist│                  │
│               │  • Scheme hits  │                  │
│               └─────────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Development Environment

### Prerequisites

```bash
# Required tools
- AWS CLI v2
- Node.js 18+
- Python 3.11+
- Docker
- Terraform (for IaC)
```

### Local Setup

```bash
# Clone repository
git clone https://github.com/team/janseva-ai.git
cd janseva-ai

# Install dependencies
npm install
pip install -r requirements.txt

# Configure AWS
aws configure --profile janseva-dev

# Run locally with SAM
sam local start-api
```

---

## Cost Estimate (Hackathon Phase)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Amazon Bedrock | 100K requests | ~$50 |
| Amazon Polly | 1M characters | ~$4 |
| Amazon Transcribe | 100 hours | ~$24 |
| Lambda | 1M invocations | ~$0.20 |
| DynamoDB | On-demand | ~$5 |
| S3 | 10 GB | ~$0.23 |
| **Total** | | **~$85/month** |

*AWS credits likely available for hackathon participants*

---

## References

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Amazon Polly Indian Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)
- [Amazon Transcribe Hindi](https://docs.aws.amazon.com/transcribe/)
- [Government Schemes Portal](https://www.myscheme.gov.in/)
