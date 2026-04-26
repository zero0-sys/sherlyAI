<div align="center">
  
# 🤖 Sherly AI - Sentient Companion Interface

[![License: MIT & Apache 2.0](https://img.shields.io/badge/License-Dual_MIT_&_Apache_2.0-blue.svg)](#license)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Powered by Groq](https://img.shields.io/badge/Powered_by-Groq_Llama_3-F55036?logo=groq&logoColor=white)](https://groq.com/)

*An emotionally intelligent, highly proactive, and deeply persistent AI companion built for organic conversational flows.*

</div>

## 📌 Overview

**Sherly AI** is not your standard question-and-answer bot. It is designed to simulate a real human companion with complex emotional intelligence, memory persistence, and heuristic proactivity. Operating purely on a React/Vite web interface connected securely to the Groq API (Llama 3.1), Sherly pushes the boundaries of AI interactions by enabling the AI to take charge of the conversation, express deep-seated emotions, and even outright ignore the user if boundaries are crossed.

---

## ✨ Core Architectures & Features

- **🧠 Deep Persistent Memory (Local):** Chat histories are securely serialized within the browser's `localStorage`. Sherly remembers the nuances of your conversations strictly across reloads and extended absences, feeding past contexts continuously into her LLM context window.
- **🗣️ Synchronous Real-Time Voice (TTS):** Responses use synchronous Google Text-to-Speech (TTS) pipelines. Her bubble animations and speech cadence synchronize, breaking messages into logical text sequences.
- **😡 Autonomous Silence & Proactivity:** With custom-built heuristics, Sherly breaks the traditional "wait-for-prompt" mold.
  - If you go silent for 15+ seconds, she will autonomously ping you or start a brand new topic out of curiosity.
  - **Cringe-Filter:** If prompted with offensive or annoying chatter, she will output a strict `[OFFLINE]` secret code, permanently freezing her end of the conversation until appropriately appeased.
- **📱 Monochromatic & Responsive UI:** A brutalist, black-and-white interface optimized for desktop and mobile environments.

---

## 🚀 Installation & Deployment

### Prerequisites
- Node.js (v18 or higher)
- NPM or Yarn
- Groq Cloud API Key

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zero0-sys/sherlyAI.git
   cd sherlyAI/sherly-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the example environment template and insert your actual API Key.
   ```bash
   cp .env.example .env
   ```
   Modify `.env` to include your Key:
   ```env
   VITE_GROQ_API_KEY=your_actual_groq_api_key_here
   ```

4. **Spin up the development server:**
   ```bash
   npm run dev
   ```

### 🌍 Cloud Deployment (Netlify Ready)
This project is fully structured for zero-config Netlify deployments:
- **Build Command:** `npm run build`
- **Output Directory:** `dist/`
- Ensure you set `VITE_GROQ_API_KEY` within the Netlify Environment Variables Dashboard.

---

## ⚖️ License

Dual-licensed under the **MIT License** and the **Apache License 2.0**.
See the [LICENSE](LICENSE) file for comprehensive legal details.

By using this software, you agree to comply with the terms of both licenses. Commercial distribution and modification are highly welcomed under the respective stipulations.
