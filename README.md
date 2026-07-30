# 🍜 Maggino's | Distributed Noodle Logistics & Edge NLP

[![CI/CD Pipeline](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&logo=githubactions)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript)](#)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)](#)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)](#)
[![Load Tested](https://img.shields.io/badge/Load_Tested-k6-7D64FF?style=for-the-badge&logo=k6)](#)

> **The Problem:** A late-night hostel Maggi stall experiencing extreme burst traffic between 12:00 AM and 3:00 AM, leading to race conditions on inventory, dropped orders over unstable college Wi-Fi, and fragmented feedback.
>
> **The Solution:** A highly concurrent Progressive Web App (PWA) backed by atomic database locks, featuring a zero-dependency NLP engine engineered from first principles to run sentiment analysis directly at the edge.

🔗 **[Live Demo](#)** | 📖 **[Read the LinkedIn Architecture Breakdown](#)**

<div align="center">
  <!-- Ensure you convert your dynamic landing page video to a GIF and name it hero-demo.gif in this folder -->
  <img src=".github/assets/hero-demo.gif" alt="Maggino's PWA Live Demo" width="800"/>
</div>

---

## 🧠 Core Data Science & NLP (Zero-Dependency)

I deliberately bypassed black-box APIs (OpenAI, HuggingFace) to build an **Aspect-Based Sentiment Engine** from scratch. This guarantees zero network latency, zero API costs, and proves a fundamental understanding of NLP algorithms.

### 1. Zero-Dependency NLP Engine
* **Regex Clause Segmentation:** Complex reviews are programmatically split into independent logical clauses before scoring to prevent blended average errors.
* **Levenshtein Distance Fuzzy Matching:** Hand-coded algorithm to catch common late-night typos, ensuring misspelled keywords still accurately trigger sentiment weights.
* **3-Token Negation Window:** Context-aware polarity flipping looks up to three tokens behind an aspect word to detect negations (e.g., *not*, *hardly*, *without*).

<div align="center">
  <img src=".github/assets/image_d6c32d.jpg" alt="Aspect-Based Review Intelligence Dashboard" width="700"/>
  <p><i>Live Operations Intelligence dashboard isolating compound student reviews into specific performance aspects.</i></p>
</div>

<details>
<summary><b>🔍 Deep Dive: The Algorithmic NLP Pipeline (Click to expand)</b></summary>
<br>

**1. Segmentation Logic**
Standard sentiment analysis fails on compound reviews. The engine uses regex boundaries to split inputs before scoring.
* *Input:* `"The classic maggi was amazing but delivery was incredibly l8 and cold"`
* *Clause 1:* `["classic maggi", "amazing"]` ➔ Scores Aspect: Food
* *Clause 2:* `["delivery", "incredibly l8", "cold"]` ➔ Scores Aspect: Logistics

**2. Fuzzy Matching Implementation**
Late-night typing is notoriously inaccurate. I implemented a Levenshtein distance matrix to calculate the minimum number of single-character edits required to match a string.
* `l8` matches `late` (Distance: 2)
* `delivry` matches `delivery` (Distance: 1)
</details>

### 2. Time-Series Forecasting & XAI
* **Pace Extrapolation:** Forecasts inventory burn-down using live-pace mapping against historical midnight demand curves.
* **Explainable AI (XAI) Wastage Risk:** Outputs a 5-factor risk score for stockouts/wastage. Rather than a black-box percentage, the system provides plain-English deterministic reasoning for its risk assessment.

<div align="center">
  <img src=".github/assets/image_d6c34c.png" alt="XAI Wastage Risk Engine" width="700"/>
  <p><i>Explainable AI scoring providing deterministic, plain-English reasoning for stockout and wastage risks based on historical pacing.</i></p>
</div>

---

## ⚡ Architecture & Concurrency Control

```mermaid
graph TD
    Client[Client PWA] -->|HTTPS| Auth[Google OAuth & RBAC]
    Auth --> DB[(Cloud Firestore)]
    
    subgraph Transaction Security Layer
    DB --> |Request Lock| Guard{Stock > 0?}
    Guard -->|Yes| Write[runTransaction Atomic Commit]
    Guard -->|No| Reject[Throw 409 Conflict: Race Condition]
    end
    
    subgraph Analytics Pipeline
    Write --> NLP[Custom NLP Engine]
    NLP --> Agg[Logical Day Mapping]
    Agg --> PRNG[Mulberry32 PRNG Data Modeler]
    end
