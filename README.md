# Synapse AI - Multi-Agent Research Assistant

Welcome to the Synapse AI Full-Stack application! This project uses a Next.js (React) frontend and a Python (FastAPI + LangGraph) backend to provide a multi-agent business research assistant.

## 📦 Prerequisites
Before you begin, ensure you have the following installed on your PC:
1. **Node.js** (v18 or higher) - For running the frontend.
2. **Python** (v3.10 or higher) - For running the backend.
3. **API Keys** - You will need free API keys for:
   - **Groq:** Get it at [console.groq.com/keys](https://console.groq.com/keys)
   - **Tavily:** Get it at [app.tavily.com](https://app.tavily.com)

---

## 🛠️ Step 1: Environment Variables Setup

You need to set up the environment variables for both the backend and frontend. 

### Backend `.env`
Navigate to `code/backend/` and rename `.env.example` to `.env`. Fill in your keys:
```env
GROQ_API_KEY=gsk_your_groq_api_key
TAVILY_API_KEY=tvly-your_tavily_api_key
GROQ_MODEL=llama-3.3-70b-versatile
FRONTEND_URL=http://localhost:3000
```
*(Note: Supabase keys are optional if you just want to run the app locally without syncing keys to an account).*

### Frontend `.env.local`
Navigate to `code/frontend/` and ensure you have an `.env.local` file containing:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```
*(If you set up a Supabase project for the database migrations, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` here).*

---

## 🚀 Step 2: Running the Application

You will need to open **two separate terminal windows** (one for the backend, one for the frontend).

### Terminal 1: Start the Backend (FastAPI + LangGraph)
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd code/backend
   ```
2. Install the Python dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Start the server (running on port 8000):
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   *Note: If `uvicorn` is in your PATH, you can just run `uvicorn main:app --reload --port 8000`.*

### Terminal 2: Start the Frontend (Next.js)
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd code/frontend
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server (running on port 3000):
   ```bash
   npm run dev
   ```

---

## 🎉 Step 3: Use the App!
Once both servers are running, open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

You can click the **"Config"** button in the top right corner of the UI to enter your API keys directly into the app if you didn't put them in the `.env` file!
