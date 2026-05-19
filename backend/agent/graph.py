"""
Synapse AI - LangGraph Graph Definition
Defines the state machine: nodes, edges, conditional routing,
human-in-the-loop interrupt, and SQLite checkpointer for persistence.
"""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_core.messages import HumanMessage
import sqlite3

from .state import AgentState
from .nodes import clarity_node, research_node, validator_node, synthesis_node


# ─────────────────────────────────────────────
# Conditional Routing Functions
# ─────────────────────────────────────────────

def route_after_clarity(state: AgentState) -> str:
    """
    Routes after Clarity Agent:
    - "needs_clarification" → INTERRUPT (ask user for more info)
    - "clear" → research
    """
    if state.get("clarity_status") == "needs_clarification":
        return "interrupt"
    return "research"


def route_after_research(state: AgentState) -> str:
    """
    Routes after Research Agent:
    - confidence < 6 → validator (for quality check)
    - confidence >= 6 → synthesis (fast path, skip validation)
    """
    confidence = state.get("confidence_score", 0)
    if confidence >= 6:
        return "synthesis"
    return "validator"


def route_after_validator(state: AgentState) -> str:
    """
    Routes after Validator Agent:
    - insufficient AND attempts < 3 → loop back to research
    - sufficient OR max attempts reached → synthesis
    """
    validation = state.get("validation_result", "sufficient")
    attempts = state.get("research_attempts", 0)

    if validation == "insufficient" and attempts < 3:
        return "research"
    return "synthesis"


# ─────────────────────────────────────────────
# Graph Builder
# ─────────────────────────────────────────────

def build_graph(db_path: str = "synapse_state.db"):
    """
    Builds and compiles the LangGraph StateGraph with:
    - 4 agent nodes
    - Conditional routing
    - Human-in-the-loop interrupt (before research, when clarity fails)
    - SQLite checkpointer for persistent multi-turn memory
    """
    # Initialize SQLite checkpointer for state persistence
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    # Build the graph
    graph = StateGraph(AgentState)

    # --- Add Nodes ---
    graph.add_node("clarity", clarity_node)
    graph.add_node("research", research_node)
    graph.add_node("validator", validator_node)
    graph.add_node("synthesis", synthesis_node)

    # --- Entry Point ---
    graph.set_entry_point("clarity")

    # --- Conditional Edges ---
    graph.add_conditional_edges(
        "clarity",
        route_after_clarity,
        {
            "interrupt": END,   # Graph pauses; FastAPI returns "needs_clarification" to frontend
            "research": "research",
        }
    )

    graph.add_conditional_edges(
        "research",
        route_after_research,
        {
            "validator": "validator",
            "synthesis": "synthesis",
        }
    )

    graph.add_conditional_edges(
        "validator",
        route_after_validator,
        {
            "research": "research",
            "synthesis": "synthesis",
        }
    )

    # --- Terminal Edge ---
    graph.add_edge("synthesis", END)

    # Compile with checkpointer (enables thread-based memory)
    compiled = graph.compile(checkpointer=checkpointer)
    return compiled


# Singleton graph instance (loaded once on startup)
_graph_instance = None


def get_graph():
    """Returns the singleton compiled graph."""
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = build_graph()
    return _graph_instance
