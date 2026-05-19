"""
Synapse AI - FastAPI Main Application
Exposes REST endpoints for the multi-agent LangGraph research assistant.

Endpoints:
  POST /api/chat          - Send a new message or resume an interrupted thread
  GET  /api/thread/{id}   - Get conversation history for a thread
  POST /api/config        - Save user API keys (Groq + Tavily) to Supabase
  GET  /api/config/{uid}  - Load user config from Supabase
  GET  /api/health        - Health check
"""
import os
import uuid
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from agent.graph import get_graph
from supabase import create_client, Client

# Load .env file
load_dotenv()

# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the graph on startup."""
    get_graph()
    yield

app = FastAPI(
    title="Synapse AI Research Assistant",
    description="Multi-agent business research system powered by LangGraph + Groq",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000"), "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Supabase Client (lazy init)
# ─────────────────────────────────────────────

def get_supabase() -> Client | None:
    """Returns Supabase client if configured, else None."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if url and key:
        return create_client(url, key)
    return None


# ─────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Incoming chat request from the frontend."""
    message: str                    # The user's message
    thread_id: str | None = None    # Existing thread ID (None = new conversation)
    user_id: str | None = None      # Supabase user ID (for loading API keys)
    groq_api_key: str | None = None       # Optional: override from UI config page
    tavily_api_key: str | None = None     # Optional: override from UI config page


class ChatResponse(BaseModel):
    """Response returned to the frontend."""
    thread_id: str
    status: str                     # "complete" | "needs_clarification" | "error"
    response: str | None = None     # The final answer (if complete)
    clarification_question: str | None = None  # Question to show user (if interrupted)
    confidence_score: int | None = None
    agent_steps: list[str] = []    # List of agent steps for UI display


class ConfigRequest(BaseModel):
    """Save API keys for a user."""
    user_id: str
    groq_api_key: str
    tavily_api_key: str


# ─────────────────────────────────────────────
# API Key Resolution
# ─────────────────────────────────────────────

def resolve_api_keys(request: ChatRequest) -> tuple[str, str]:
    """
    Resolves API keys with priority:
    1. Keys passed directly in the request (from frontend config page)
    2. Keys stored in Supabase for the user
    3. Keys from the .env file (fallback)
    """
    groq_key = request.groq_api_key or ""
    tavily_key = request.tavily_api_key or ""

    # Try Supabase if user is authenticated and keys are missing
    if (not groq_key or not tavily_key) and request.user_id:
        try:
            sb = get_supabase()
            if sb:
                result = sb.table("user_configs").select("*").eq("user_id", request.user_id).single().execute()
                if result.data:
                    groq_key = groq_key or result.data.get("groq_api_key", "")
                    tavily_key = tavily_key or result.data.get("tavily_api_key", "")
        except Exception:
            pass  # Fall through to env vars

    # Final fallback: environment variables
    groq_key = groq_key or os.getenv("GROQ_API_KEY", "")
    tavily_key = tavily_key or os.getenv("TAVILY_API_KEY", "")

    return groq_key, tavily_key


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Synapse AI Research Assistant"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint. Handles both new conversations and follow-up messages.
    Manages human-in-the-loop interruptions when Clarity Agent is unsatisfied.
    """
    graph = get_graph()

    # Generate thread_id if this is a new conversation
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    # Resolve API keys (env → Supabase → request override)
    groq_key, tavily_key = resolve_api_keys(request)

    if not groq_key:
        raise HTTPException(
            status_code=400,
            detail="No Groq API key found. Please configure your API keys in the Settings page."
        )
    if not tavily_key:
        raise HTTPException(
            status_code=400,
            detail="No Tavily API key found. Please configure your API keys in the Settings page."
        )

    # Build the initial state for this turn
    initial_state = {
        "user_query": request.message,
        "messages": [HumanMessage(content=request.message)],
        "clarity_status": "pending",
        "clarification_question": "",
        "research_data": [],
        "confidence_score": 0,
        "research_attempts": 0,
        "validation_result": "pending",
        "final_response": "",
        "groq_api_key": groq_key,
        "tavily_api_key": tavily_key,
    }

    agent_steps = []

    try:
        # Run the graph (LangGraph handles state merging via checkpointer)
        result = graph.invoke(initial_state, config=config)

        # Track agent steps for UI display
        if result.get("clarity_status"):
            agent_steps.append(f"✓ Clarity Agent: {result['clarity_status']}")
        if result.get("research_attempts", 0) > 0:
            agent_steps.append(f"✓ Research Agent: {result['research_attempts']} attempt(s), confidence {result.get('confidence_score', 0)}/10")
        if result.get("validation_result") and result["validation_result"] != "pending":
            agent_steps.append(f"✓ Validator Agent: {result['validation_result']}")
        if result.get("final_response"):
            agent_steps.append("✓ Synthesis Agent: Response generated")

        # Check if graph was interrupted (Clarity Agent asked for clarification)
        if result.get("clarity_status") == "needs_clarification":
            return ChatResponse(
                thread_id=thread_id,
                status="needs_clarification",
                clarification_question=result.get("clarification_question", "Could you please specify which company you're asking about?"),
                agent_steps=["⚠ Clarity Agent: Query needs clarification"],
            )

        # Success - return the synthesized response
        return ChatResponse(
            thread_id=thread_id,
            status="complete",
            response=result.get("final_response", "Research complete."),
            confidence_score=result.get("confidence_score"),
            agent_steps=agent_steps,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent pipeline error: {str(e)}")


@app.get("/api/thread/{thread_id}")
async def get_thread_history(thread_id: str):
    """Returns the conversation history for a given thread."""
    graph = get_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = graph.get_state(config)
        messages = state.values.get("messages", []) if state else []
        return {
            "thread_id": thread_id,
            "messages": [
                {"role": m.type, "content": m.content}
                for m in messages
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Thread not found: {str(e)}")


@app.post("/api/config")
async def save_config(request: ConfigRequest):
    """Saves user API keys to Supabase for future sessions."""
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Supabase not configured on the server.")

    try:
        sb.table("user_configs").upsert({
            "user_id": request.user_id,
            "groq_api_key": request.groq_api_key,
            "tavily_api_key": request.tavily_api_key,
        }).execute()
        return {"success": True, "message": "API keys saved successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")


@app.get("/api/config/{user_id}")
async def get_config(user_id: str):
    """Loads user config from Supabase (returns masked keys)."""
    sb = get_supabase()
    if not sb:
        return {"has_config": False}

    try:
        result = sb.table("user_configs").select("groq_api_key, tavily_api_key").eq("user_id", user_id).single().execute()
        if result.data:
            groq = result.data.get("groq_api_key", "")
            tavily = result.data.get("tavily_api_key", "")
            return {
                "has_config": True,
                "groq_key_preview": f"gsk_...{groq[-6:]}" if groq else "",
                "tavily_key_preview": f"tvly-...{tavily[-6:]}" if tavily else "",
            }
        return {"has_config": False}
    except Exception:
        return {"has_config": False}
