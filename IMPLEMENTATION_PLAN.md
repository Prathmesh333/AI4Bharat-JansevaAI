# 🗓️ JanSeva AI - Implementation Plan

## Hackathon Timeline Alignment

| Phase | Official Dates | Our Focus |
|-------|---------------|-----------|
| **Idea Submission** | Jan 13-25, 2026 | Documentation + Demo Video |
| **Initial Shortlist** | Feb 10, 2026 | - |
| **Prototype Development** | Feb 10-22, 2026 | Full MVP |
| **Final Shortlist** | Mar 10, 2026 | - |
| **Virtual Pitching** | Mar 16-17, 2026 | Live Demo |

---

## Phase 1: Idea Submission (Current Phase)

### Deadline: January 25, 2026

#### Deliverables Checklist

- [x] Project Name & Branding: **JanSeva AI**
- [x] Tagline: **"Har Haq, Har Haath Tak"**
- [x] Problem Statement Document
- [x] Solution Overview
- [x] Technical Architecture
- [ ] Demo Video (3-5 minutes)
- [ ] Submission Form Completion

#### Demo Video Script

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEMO VIDEO STRUCTURE                         │
│                    Duration: 3-4 minutes                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0:00 - 0:30  │  HOOK + PROBLEM                                │
│               │  "800 million Indians miss their entitled       │
│               │   benefits every year..."                       │
│               │  [Show statistics, real quotes]                 │
│                                                                 │
│  0:30 - 1:00  │  INTRODUCE JANSEVA AI                          │
│               │  "Meet JanSeva AI - your rights, in your       │
│               │   language, in your hands"                      │
│               │  [Show app interface, voice capability]         │
│                                                                 │
│  1:00 - 2:30  │  LIVE DEMO                                     │
│               │  Scenario: Farmer asking about crop damage      │
│               │  • Voice input in Hindi                         │
│               │  • AI asks eligibility questions                │
│               │  • Shows matching schemes                       │
│               │  • Generates pre-filled form                    │
│               │  • Provides document checklist                  │
│               │  • Shows nearest CSC location                   │
│                                                                 │
│  2:30 - 3:00  │  TECHNOLOGY + IMPACT                           │
│               │  "Powered by AWS Bedrock..."                    │
│               │  [Architecture diagram, AWS services]           │
│               │  "Potential to unlock ₹1.5L Cr in benefits"     │
│                                                                 │
│  3:00 - 3:30  │  CALL TO ACTION                                │
│               │  "JanSeva AI - Har Haq, Har Haath Tak"          │
│               │  [Team intro, thank you]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Prototype Development

### Duration: Feb 10-22, 2026 (12 Days)

### Sprint Breakdown

#### Week 1 (Feb 10-16): Core Infrastructure

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| **Day 1** | AWS Account Setup | All | IAM, Bedrock access, S3 buckets |
| **Day 2** | Knowledge Base Creation | AI/ML | 50 schemes in vector DB |
| **Day 3** | Bedrock RAG Setup | AI/ML | Working eligibility queries |
| **Day 4** | Lambda Functions | Backend | Core API endpoints |
| **Day 5** | Voice Pipeline | Backend | Transcribe + Polly integration |
| **Day 6** | Basic UI | Frontend | Web interface prototype |
| **Day 7** | Integration Testing | All | End-to-end flow works |

#### Week 2 (Feb 17-22): Polish & Expand

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| **Day 8** | Multi-language Support | AI/ML | Hindi + Tamil + Telugu |
| **Day 9** | Form Generation | Backend | PDF generation working |
| **Day 10** | UI/UX Polish | Frontend | Mobile-responsive, accessible |
| **Day 11** | WhatsApp Integration | Backend | Basic bot working |
| **Day 12** | Demo Preparation | All | Recorded demo, presentation |

---

## Technical Implementation Details

### Step 1: Knowledge Base Setup

```python
# schemes_processor.py
import boto3
import json

def create_scheme_embeddings():
    """
    Process scheme documents and create vector embeddings
    for Amazon Bedrock Knowledge Base
    """
    bedrock = boto3.client('bedrock-agent-runtime')
    
    schemes = load_schemes_from_s3("s3://janseva-schemes/")
    
    for scheme in schemes:
        # Create embedding using Titan
        embedding = bedrock.invoke_model(
            modelId="amazon.titan-embed-text-v1",
            body=json.dumps({
                "inputText": scheme['full_text']
            })
        )
        
        # Store in OpenSearch Serverless
        store_embedding(scheme['id'], embedding)
```

### Step 2: Eligibility Engine

```python
# eligibility_engine.py
from langchain import PromptTemplate
import boto3

ELIGIBILITY_PROMPT = """
You are JanSeva AI, an expert on Indian government welfare schemes.

Given the user profile:
- Occupation: {occupation}
- Annual Income: ₹{income}
- State: {state}
- Category: {category}
- Family Size: {family_size}

And the following scheme information from the knowledge base:
{context}

Determine which schemes the user is eligible for.
For each scheme, provide:
1. Scheme name (in Hindi and English)
2. Key benefit
3. Confidence score (0-1)
4. Any missing information needed

Respond in JSON format.
"""

def check_eligibility(user_profile: dict) -> dict:
    bedrock = boto3.client('bedrock-runtime')
    
    # RAG retrieval
    context = retrieve_relevant_schemes(user_profile)
    
    # LLM reasoning
    response = bedrock.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "messages": [{
                "role": "user",
                "content": ELIGIBILITY_PROMPT.format(
                    **user_profile,
                    context=context
                )
            }],
            "max_tokens": 2000
        })
    )
    
    return parse_eligibility_response(response)
```

### Step 3: Voice Processing

```python
# voice_processor.py
import boto3

def process_voice_input(audio_bytes: bytes, language: str) -> str:
    """Convert speech to text using Amazon Transcribe"""
    transcribe = boto3.client('transcribe')
    
    # Start streaming transcription
    response = transcribe.start_stream_transcription(
        LanguageCode=f"{language}-IN",  # hi-IN, ta-IN, te-IN
        MediaSampleRateHertz=16000,
        MediaEncoding='pcm',
        AudioStream=audio_stream_generator(audio_bytes)
    )
    
    return response['TranscriptResultStream']

def generate_voice_response(text: str, language: str) -> bytes:
    """Convert text to speech using Amazon Polly"""
    polly = boto3.client('polly')
    
    voice_map = {
        'hi': 'Aditi',   # Hindi
        'ta': 'Kajal',   # Tamil  
        'te': 'Kajal',   # Telugu (fallback)
    }
    
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat='mp3',
        VoiceId=voice_map.get(language, 'Aditi'),
        Engine='neural'
    )
    
    return response['AudioStream'].read()
```

### Step 4: Form Generation

```python
# form_generator.py
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Hindi font
pdfmetrics.registerFont(TTFont('NotoSansDevanagari', 'NotoSansDevanagari.ttf'))

def generate_prefilled_form(scheme_id: str, user_data: dict) -> bytes:
    """Generate pre-filled PDF form for scheme application"""
    
    template = load_form_template(scheme_id)
    
    # Create PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    # Add header
    c.setFont('NotoSansDevanagari', 16)
    c.drawString(100, 800, template['title_hi'])
    
    # Fill form fields
    c.setFont('NotoSansDevanagari', 12)
    y_position = 750
    
    for field in template['fields']:
        c.drawString(100, y_position, f"{field['label_hi']}: ")
        c.drawString(300, y_position, user_data.get(field['key'], '___________'))
        y_position -= 30
    
    c.save()
    return buffer.getvalue()
```

---

## Scheme Data Sources

### Priority Schemes for MVP (50)

| Category | Schemes | Source |
|----------|---------|--------|
| **Agriculture** | PM-KISAN, PMFBY, KCC, Soil Health Card | pmkisan.gov.in |
| **Education** | Post-Matric Scholarship, NSP, INSPIRE | scholarships.gov.in |
| **Healthcare** | Ayushman Bharat, Janani Suraksha | pmjay.gov.in |
| **Housing** | PMAY-G, PMAY-U | pmaymis.gov.in |
| **Women & Child** | Sukanya Samriddhi, Beti Bachao | India.gov.in |
| **Employment** | MGNREGA, PMEGP, Mudra | nrega.nic.in |
| **Social Security** | APY, PMSBY, PMJJBY | jansuraksha.gov.in |
| **State Schemes** | Top 10 from UP, MH, TN, RJ, MP | State portals |

### Data Collection Process

1. **Scrape official government portals** for scheme details
2. **Convert to structured JSON** with eligibility rules
3. **Translate to regional languages** using Amazon Translate
4. **Create vector embeddings** for RAG retrieval
5. **Validate with domain experts** (optional)

---

## Testing Strategy

### Unit Tests

```python
# tests/test_eligibility.py
def test_farmer_pm_kisan_eligible():
    user = {
        "occupation": "farmer",
        "income": 100000,
        "land_hectares": 1.5,
        "state": "uttar_pradesh"
    }
    result = check_eligibility(user)
    assert "PM-KISAN" in [s['name'] for s in result['eligible']]

def test_income_tax_payer_excluded():
    user = {
        "occupation": "farmer",
        "income": 1000000,  # Above threshold
        "pays_income_tax": True
    }
    result = check_eligibility(user)
    assert "PM-KISAN" not in [s['name'] for s in result['eligible']]
```

### Integration Tests

```python
# tests/test_e2e.py
def test_full_conversation_flow():
    session = start_session(language="hi")
    
    # User says they need help with education
    response = send_message(session, "मेरे बच्चे की पढ़ाई के लिए मदद चाहिए")
    assert "scholarship" in response['intent'] or "education" in response['intent']
    
    # Answer eligibility questions
    send_message(session, "सालाना आय 2 लाख")
    send_message(session, "SC category")
    send_message(session, "12वीं पास")
    
    # Check schemes returned
    result = send_message(session, "eligible schemes")
    assert len(result['schemes']) > 0
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Bedrock latency** | Implement caching for common queries |
| **Translation errors** | Manual review of key phrases; fallback to English |
| **Scheme data outdated** | Add last_updated field; disclaimer in UI |
| **Voice recognition issues** | Fallback to text input; retry mechanism |
| **Low bandwidth** | Text-only mode; compressed audio |

---

## Success Metrics for Demo

| Metric | Target |
|--------|--------|
| Query to response time | < 3 seconds |
| Eligibility accuracy | > 90% for top 50 schemes |
| Languages supported | 3 (Hindi, Tamil, Telugu) |
| Schemes in knowledge base | 50 |
| Form generation time | < 5 seconds |
| Voice recognition accuracy | > 85% |

---

## Team Responsibilities

| Role | Primary Tasks | Backup |
|------|--------------|--------|
| **AI/ML Lead** | Bedrock RAG, Prompt Engineering | Backend |
| **Backend Lead** | Lambda, API, Integrations | AI/ML |
| **Frontend Lead** | Web UI, Mobile-responsive | Backend |
| **Domain Expert** | Scheme research, User testing | All |

---

## Post-Hackathon Roadmap

### Immediate (Month 1-2)
- Expand to 200 schemes
- Add 5 more languages
- WhatsApp production deployment

### Short-term (Month 3-6)
- DigiLocker integration
- Direct e-Filing for select schemes
- CSC partnership pilot

### Long-term (Year 1)
- All 3,000+ schemes
- All 22 scheduled languages
- Government partnership for official deployment

---

## Resources & References

- [AWS Bedrock Getting Started](https://docs.aws.amazon.com/bedrock/latest/userguide/)
- [MyScheme Portal API](https://www.myscheme.gov.in/)
- [India Open Data](https://data.gov.in/)
- [National Scholarship Portal](https://scholarships.gov.in/)
