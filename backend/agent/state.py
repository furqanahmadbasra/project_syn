"""
Synapse AI - LangGraph State Schema
Defines the shared TypedDict that all agents read and write.
"""
from typing import TypedDict, Annotated, Literal
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Shared state object that flows through the entire LangGraph pipeline.
    Every agent has read/write access to this object.
    """
    # Full conversation history (LangGraph managed, supports multi-turn memory)
    messages: Annotated[list, add_messages]

    # The raw user query for the current turn
    user_query: str

    # --- Clarity Agent output ---
    # "clear" | "needs_clarification"
    clarity_status: Literal["clear", "needs_clarification", "pending"]

    # The specific clarification question to ask the user (if needed)
    clarification_question: str

    # --- Research Agent output ---
    # Raw research findings from Tavily
    research_data: list[dict]

    # Confidence score (0-10) assigned by the Research Agent
    confidence_score: int

    # Number of research attempts (for retry loop cap at 3)
    research_attempts: int

    # --- Validator Agent output ---
    # "sufficient" | "insufficient"
    validation_result: Literal["sufficient", "insufficient", "pending"]

    # --- Synthesis Agent output ---
    # The final formatted response to show to the user
    final_response: str

    # --- Session info ---
    # Groq API key (loaded from env or user config)
    groq_api_key: str

    # Tavily API key
    tavily_api_key: str
