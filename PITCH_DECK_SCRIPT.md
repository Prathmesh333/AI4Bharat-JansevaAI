# 🎤 JanSeva AI - Pitch Deck Script

## Presentation Structure (5 Minutes)

---

## Slide 1: Opening Hook (30 seconds)

### Visual
- Split screen: Elderly farmer confused at computer vs. same farmer smiling with phone
- Big number: **"₹1,50,000 Crore"**

### Script
> "Every year, 1.5 lakh crore rupees of government welfare benefits go UNCLAIMED in India.
> 
> Not because people don't need help. But because they don't know which schemes exist, can't navigate English websites, or don't understand the complex forms.
>
> 800 million Indians are missing out on benefits that are ALREADY theirs.
>
> Today, we're going to change that."

---

## Slide 2: The Problem (45 seconds)

### Visual
- 4 icons representing barriers: Language, Digital Literacy, Awareness, Complexity

### Script
> "India has over 3,000 welfare schemes across central and state governments. 
>
> But there are 4 massive barriers:
>
> **First, Language.** 70% of rural India cannot read English, but most portals are English-first.
>
> **Second, Digital Literacy.** Navigating multi-step online forms is impossible for millions.
>
> **Third, Awareness.** Citizens simply don't know which schemes they qualify for.
>
> **Fourth, Complexity.** Even if you find a scheme, understanding eligibility rules and document requirements is overwhelming.
>
> The result? A farmer in Sitapur doesn't get crop insurance. A mother in Madurai misses her maternity benefit. A student in Nagpur loses a scholarship.
>
> This is not a technology problem. It's an ACCESS problem."

---

## Slide 3: Introducing JanSeva AI (30 seconds)

### Visual
- JanSeva AI logo with tagline
- Simple phone UI showing voice conversation

### Script
> "Introducing **JanSeva AI** — *Har Haq, Har Haath Tak.*
>
> Every right, to every hand.
>
> JanSeva AI is a voice-first, multilingual AI assistant that puts government welfare in the hands of every citizen.
>
> Speak in your language. Discover your schemes. Get your forms. Know your rights.
>
> No English. No complex websites. No confusion."

---

## Slide 4: Live Demo (90 seconds)

### Visual
- Screen recording of conversation flow

### Script
> "Let me show you how it works.
>
> *[Start demo]*
>
> Here's Ramesh, a farmer from UP. His crops were damaged by recent floods.
>
> He calls JanSeva AI and says in Hindi:
> **'मेरी फसल बाढ़ में खराब हो गई, कोई मदद मिल सकती है?'**
>
> JanSeva AI understands and responds:
> **'जी हां, आप PM फसल बीमा योजना के लिए eligible हो सकते हैं। कुछ सवाल पूछूंगा...'**
>
> It asks 5 simple questions about his land, income, and documents.
>
> Within 60 seconds, Ramesh knows:
> - He's eligible for PM Fasal Bima Yojana
> - He's also eligible for PM-KISAN ₹6,000/year
> - His form is pre-filled and ready
> - He needs Aadhaar, Kisan Card, and land records
> - The nearest CSC is 3 km away, open Monday-Friday
>
> *[End demo]*
>
> What used to take hours of confusion now takes 2 minutes of conversation."

---

## Slide 5: Technology (30 seconds)

### Visual
- AWS architecture diagram (simplified)
- AWS service logos: Bedrock, Polly, Transcribe, Translate

### Script
> "Under the hood, JanSeva AI is powered entirely by AWS.
>
> **Amazon Bedrock** provides the brain — using Claude 3.5 with RAG to reason about eligibility across 50+ schemes.
>
> **Amazon Transcribe and Polly** handle voice — understanding Hindi, Tamil, Telugu, and more.
>
> **Amazon Translate** enables real-time multilingual support.
>
> All serverless, all scalable, ready for 1 billion users."

---

## Slide 6: Impact & Metrics (30 seconds)

### Visual
- Target metrics in large font

### Script
> "The potential impact is massive.
>
> - **800 million** Indians who struggle with digital access
> - **₹1.5 lakh crore** in unclaimed benefits every year
> - **3,000+ schemes** they don't know about
>
> Our goal in Year 1:
> - 1 million users served
> - ₹50 crore in benefits unlocked
> - 10 languages supported
>
> This isn't just an app. It's digital inclusion at national scale."

---

## Slide 7: Why We'll Win (30 seconds)

### Visual
- Judging criteria with checkmarks

### Script
> "JanSeva AI aligns perfectly with every judging criterion:
>
> ✅ **Technical Excellence** — Full AWS Bedrock + Voice stack
>
> ✅ **Innovation** — Voice-first form-filling agent, not generic chatbot
>
> ✅ **Impact & Relevance** — Maximum Bharat focus, serves the underserved
>
> ✅ **Completeness** — End-to-end demo from voice to filled form
>
> This is AI for Bharat. Real AI. Real impact."

---

## Slide 8: Call to Action (15 seconds)

### Visual
- JanSeva AI logo
- Tagline: "Har Haq, Har Haath Tak"
- Team photo

### Script
> "JanSeva AI.
>
> Every right, to every hand.
>
> Thank you."

---

## Q&A Preparation

### Expected Questions & Answers

**Q: How do you ensure eligibility accuracy?**
> "We use Amazon Bedrock's RAG to retrieve exact eligibility rules from official government scheme documents. Our knowledge base is structured JSON with explicit criteria. We also display confidence scores and ask for clarification when uncertain."

**Q: What if the scheme rules change?**
> "Our knowledge base is designed for easy updates. We plan to integrate with MyScheme.gov.in API for real-time updates. For now, we display 'last updated' dates and recommend verification with local officials."

**Q: How do you handle privacy with Aadhaar?**
> "We never store Aadhaar. It's used only for form pre-filling during the session and immediately discarded. We use Amazon Bedrock Guardrails to mask PII in all logs."

**Q: Why not just improve government websites?**
> "Government websites are designed for literate, connected users. 70% of Bharat needs voice-first, local-language access. We're not replacing portals — we're building a bridge to them."

**Q: How will you scale to 3,000 schemes?**
> "Our RAG architecture is designed for scale. Adding a new scheme is just adding a JSON document to S3. The AI handles the rest. We'll prioritize by impact and user demand."

---

## Demo Checklist

- [ ] Internet connection stable
- [ ] AWS services warmed up (no cold start)
- [ ] Test Hindi voice recognition
- [ ] Pre-recorded backup video ready
- [ ] Form PDF generation tested
- [ ] Audio output tested
