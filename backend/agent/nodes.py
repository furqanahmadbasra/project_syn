"""
Synapse AI - Agent Nodes
Implements the 4 specialized agents as LangGraph node functions.
Each node reads from and writes to the shared AgentState.
"""
import json
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from .state import AgentState
from .tools import get_tavily_tool


# ─────────────────────────────────────────────
# Helper: Build LLM from state keys
# ─────────────────────────────────────────────
def _get_llm(state: AgentState, temperature: float = 0.1) -> ChatGroq:
    """Instantiate Groq LLM using the API key stored in state."""
    import os
    api_key = state.get("groq_api_key") or os.getenv("GROQ_API_KEY", "")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return ChatGroq(api_key=api_key, model=model, temperature=temperature)


# ─────────────────────────────────────────────
# 1. CLARITY AGENT
# ─────────────────────────────────────────────
def clarity_node(state: AgentState) -> dict:
    """
    Evaluates whether the user query is specific enough to research.
    - Checks if a company name is identifiable (from current query OR conversation history).
    - Returns clarity_status = "clear" or "needs_clarification".
    - If needs_clarification, also populates clarification_question.
    """
    llm = _get_llm(state)

    # Build context from conversation history (for follow-up awareness)
    history_context = ""
    if state.get("messages"):
        history_context = "\n".join([
            f"{m.type.upper()}: {m.content}"
            for m in state["messages"][-6:]  # last 6 messages for context window
        ])

    system_prompt = """You are the Clarity Agent in a multi-agent AI research system.
Your ONLY job is to determine if the user's query is clear enough to research.

RULES:
1. A query is "clear" if it mentions or implies a specific company/organization.
2. A query is "clear" if context from conversation history makes the company obvious.
3. A query is "needs_clarification" ONLY if you truly cannot identify which company to research.
4. Common follow-ups like "What about competitors?", "Tell me about the CEO", "What are their financials?" are CLEAR if a company was mentioned in conversation history.

You must respond in valid JSON only:
{
  "clarity_status": "clear" or "needs_clarification",
  "reasoning": "brief explanation",
  "clarification_question": "the specific question to ask the user (only if needs_clarification, else empty string)"
}"""

    user_message = f"""Conversation History:
{history_context or "No previous messages."}

Current User Query: {state['user_query']}

Analyze and respond in JSON."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message)
    ])

    try:
        # Parse JSON response from LLM
        raw = response.content.strip()
        # Handle markdown code blocks if LLM wraps in ```json
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        result = json.loads(raw)
    except Exception:
        # Fallback: assume clear to avoid blocking user
        result = {"clarity_status": "clear", "clarification_question": ""}

    return {
        "clarity_status": result.get("clarity_status", "clear"),
        "clarification_question": result.get("clarification_question", ""),
    }


# ─────────────────────────────────────────────
# 2. RESEARCH AGENT
# ─────────────────────────────────────────────
def research_node(state: AgentState) -> dict:
    """
    Searches the web for company information using Tavily.
    Assigns a confidence_score (0-10) based on data quality.
    """
    import os
    llm = _get_llm(state)
    tavily_key = state.get("tavily_api_key") or os.getenv("TAVILY_API_KEY", "")
    search_tool = get_tavily_tool(tavily_key)

    # Build a smart search query using conversation context
    history_context = "\n".join([
        f"{m.type.upper()}: {m.content}"
        for m in state.get("messages", [])[-4:]
    ])

    # Ask LLM to derive the best search query from context + current query
    query_system = """You are a search query optimizer. Given the user query and conversation history,
generate the most effective search query to find business intelligence about a company.
Respond with ONLY the search query string, nothing else."""

    optimized_query_response = llm.invoke([
        SystemMessage(content=query_system),
        HumanMessage(content=f"History:\n{history_context}\n\nCurrent Query: {state['user_query']}")
    ])
    optimized_query = optimized_query_response.content.strip()

    # Execute the Tavily search
    search_results = search_tool.invoke({"query": optimized_query})

    # Score the confidence based on result quality
    score_prompt = f"""You are evaluating the quality of web search results for a business research query.

Query: {optimized_query}
Number of results: {len(search_results)}
Sample content: {str(search_results)[:2000]}

Rate confidence (0-10) on whether these results can answer the user's question about a company.
- 0-3: Very little or irrelevant data found
- 4-5: Some data but incomplete
- 6-7: Good data, mostly relevant
- 8-10: Excellent, comprehensive data found

Respond in JSON: {{"confidence_score": <integer 0-10>, "reasoning": "brief note"}}"""

    score_response = llm.invoke([HumanMessage(content=score_prompt)])

    try:
        raw = score_response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        score_data = json.loads(raw)
        confidence = int(score_data.get("confidence_score", 6))
    except Exception:
        confidence = 6  # default to passable confidence

    return {
        "research_data": search_results,
        "confidence_score": confidence,
        "research_attempts": state.get("research_attempts", 0) + 1,
    }


# ─────────────────────────────────────────────
# 3. VALIDATOR AGENT
# ─────────────────────────────────────────────
def validator_node(state: AgentState) -> dict:
    """
    Reviews research quality and decides if it's sufficient to answer the user.
    Loops back to research if insufficient (max 3 attempts).
    """
    llm = _get_llm(state)

    research_summary = "\n\n".join([
        f"Source: {r.get('url', 'unknown')}\nContent: {r.get('content', '')[:500]}"
        for r in state.get("research_data", [])
        if not r.get("error")
    ])

    validation_prompt = f"""You are the Validator Agent in an AI research pipeline.
Your job is to critically assess whether the gathered research data is adequate to 
comprehensively answer the user's question.

User's Question: {state['user_query']}
Research Attempts So Far: {state.get('research_attempts', 1)}

Gathered Research:
{research_summary[:3000] or "No research data available."}

Is this data sufficient to provide a helpful, accurate, and comprehensive answer?
Consider:
- Does it cover the key aspects the user asked about?
- Are there multiple credible sources?
- Is the data recent and relevant?

Respond in JSON:
{{"validation_result": "sufficient" or "insufficient", "reasoning": "brief explanation"}}"""

    response = llm.invoke([HumanMessage(content=validation_prompt)])

    try:
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        result = json.loads(raw)
        validation = result.get("validation_result", "sufficient")
    except Exception:
        validation = "sufficient"  # fail safe

    return {"validation_result": validation}


# ─────────────────────────────────────────────
# 4. SYNTHESIS AGENT
# ─────────────────────────────────────────────
def synthesis_node(state: AgentState) -> dict:
    """
    Reads all research data and conversation history to produce a
    well-structured, comprehensive company intelligence report.
    """
    llm = _get_llm(state, temperature=0.3)

    # Full conversation history for contextual awareness
    history_context = "\n".join([
        f"{m.type.upper()}: {m.content}"
        for m in state.get("messages", [])[-8:]
    ])

    research_text = "\n\n".join([
        f"[Source: {r.get('url', 'N/A')}]\n{r.get('content', '')}"
        for r in state.get("research_data", [])
        if not r.get("error") and r.get("content")
    ])

    synthesis_prompt = f"""You are the Synthesis Agent — the final stage of a multi-agent AI research system.
Your job is to produce a polished, comprehensive, and well-structured business intelligence report.

CONVERSATION HISTORY (for context awareness):
{history_context or "First query."}

USER'S CURRENT QUESTION: {state['user_query']}

RESEARCH DATA GATHERED:
{research_text[:5000] or "Limited data available. Provide best answer possible."}

INSTRUCTIONS:
1. Write a clear, professional, well-formatted response using markdown.
2. Structure with relevant sections (e.g., Overview, Key Financials, Leadership, Recent News, Competitors).
3. Only include sections relevant to what was asked — don't pad with irrelevant info.
4. For follow-up questions ("Tell me about competitors", "What about the CEO?"), focus ONLY on what was asked.
5. End with a brief **Research Confidence** note and the score {state.get('confidence_score', 7)}/10.
6. Be factual — clearly note when information is uncertain.

Write the report now:"""

    response = llm.invoke([HumanMessage(content=synthesis_prompt)])

    final_answer = response.content.strip()

    return {
        "final_response": final_answer,
        "messages": [AIMessage(content=final_answer)],
    }
