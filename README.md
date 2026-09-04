# RAID: AI Payment Recovery Control Plane

> **Recover revenue. Never recover recklessly.**

RAID is an AI-powered payment recovery system that handles **ambiguous payment states** and decides whether to **RECOVER, VERIFY, ESCALATE, or DO NOT RETRY**.

Instead of blindly retrying failed payments, RAID reconstructs the payment event sequence, reasons about uncertainty, estimates risk, and applies a deterministic policy before any financial action.

### Core Flow

```text
OBSERVE → RECONSTRUCT → REASON → PREDICT → POLICY GATE → ACT / VERIFY → AUDIT
```

### Key Idea

**AI recommends. Deterministic policy controls money.**

RAID is designed to prevent duplicate charges and unsafe recovery while maximizing **safe recovered revenue**.

---

## 🚀 Features

* AI-based payment-state reconstruction
* Duplicate-payment risk detection
* Recovery / Verify / Escalate decision engine
* Deterministic financial policy gate
* Counterfactual recovery analysis
* Razorpay Test Mode integration
* Webhook signature verification & deduplication
* Audit trail with Supabase
* Reproducible synthetic 10K transaction benchmark
* Safe simulated recovery for evaluation

---

## 🏗️ Architecture

```text
Payment Events
      ↓
State Reconstruction
      ↓
AI Reasoning + Risk
      ↓
Policy Engine
      ↓
┌─────┼─────────┐
↓     ↓         ↓
Recover Verify Escalate
      ↓
Razorpay Adapter
      ↓
Verification
      ↓
Audit Trail
```

---

## 🛠️ Tech Stack

* **Next.js / React**
* **Node.js**
* **OpenAI API**
* **Razorpay APIs & Webhooks**
* **Supabase / PostgreSQL**
* **Tailwind CSS**

---

## ⚡ Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/raid-ai-payment-recovery.git
cd raid-ai-payment-recovery
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env.local`:

```env
OPENAI_API_KEY=your_key

RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_secret

NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

> Never commit `.env.local`. Use `.env.example` as the template.

### 4. Start the application

```bash
npm run dev
```

Open **http://localhost:3000**

---

## 🧪 Evaluation

RAID includes a reproducible synthetic benchmark:

```bash
POST /api/evaluate
```

Example:

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"count":10000,"seed":42}'
```

The benchmark measures:

* Decision accuracy
* Recovery rate
* Revenue at risk
* Recovered value
* Unsafe actions blocked
* Escalation rate
* Decision latency

**No real customer funds are moved during evaluation.**

---

## 🔐 Safety

RAID does not allow the LLM to directly control financial actions.

```text
AI Recommendation
       ↓
Deterministic Policy
       ↓
Bounded Execution
       ↓
Verification
```

Low confidence or high duplicate risk results in **verification or escalation**, not blind recovery.

---

## 🌐 Demo

**Live:** https://raid-v4.vercel.app/

**Built for:** Razorpay AI Buildathon

> **Most systems ask: "How do we recover this payment?"**
>
> **RAID asks: "What is the safest action given everything we know?"**


