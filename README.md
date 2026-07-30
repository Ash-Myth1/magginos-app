# 🍜 Maggino's: Production-Grade Midnight Noodle Logistics

[![CI/CD Pipeline](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&logo=githubactions)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript)](#)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)](#)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)](#)

> **Executive Summary:** Maggino's is a Progressive Web App (PWA) built to handle the intense, highly-concurrent burst traffic of a late-night hostel Maggi stall. What started as a delivery app evolved into an exercise in implementing **zero-dependency NLP, atomic database transactions, and deterministic data modeling**. 

🔗 **[Live Demo](#)** | 📖 **[Read the LinkedIn Case Study](#)**

---

## 🧠 Core AI & Data Science (First-Principles Engineering)

Instead of relying on heavy black-box ML APIs (like OpenAI or HuggingFace) which introduce latency and cost, I engineered a custom **Aspect-Based Sentiment Engine** and **Forecasting Model** from scratch to run at the edge.

### 1. Zero-Dependency NLP Engine
* **Regex Clause Segmentation:** Complex reviews (e.g., *"food was good but delivery was incredibly late"*) are programmatically split into independent logical clauses before scoring to prevent blended average errors.
* **Levenshtein Distance Fuzzy Matching:** Hand-coded algorithm to catch common late-night typos, ensuring misspelled keywords still accurately trigger sentiment weights.
* **3-Token Negation Window:** Context-aware polarity flipping. The engine looks up to three tokens behind an aspect word to detect negations (e.g., *not*, *hardly*, *without*), preventing "not good" from being scored as positive.
* **Rating-Calibration Layer:** Blends raw 1–5 star integer ratings with text-derived sentiment, ensuring critical text feedback isn't diluted by a lazy 5-star rating.

### 2. Time-Series Forecasting & XAI
* **Pace Extrapolation:** Forecasts inventory burn-down using live-pace mapping against historical midnight demand curves.
* **Explainable AI (XAI) Wastage Risk:** Outputs a 5-factor risk score for stockouts/wastage. Rather than a black-box percentage, the system provides plain-English deterministic reasoning for its risk assessment.

---

## ⚡ Architecture & Concurrency Control

```mermaid
graph TD
    Client[Client PWA] -->|HTTPS| Auth[Google OAuth & RBAC]
    Auth --> Firestore[(Cloud Firestore)]
    
    subgraph Transaction Layer
    Firestore -->|Double-Layered Atomic Lock| DB_Guard{Stock > 0?}
    DB_Guard -->|Yes| Write[runTransaction Commit]
    DB_Guard -->|No| Reject[Throw Race Condition Error]
    end
    
    subgraph NLP & Data Pipeline
    Write --> NLP[Custom Aspect NLP Engine]
    NLP --> Analytics[Logical Day Aggregation]
    end
