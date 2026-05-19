"""
Synapse AI - Search Tools
Wraps Tavily API for use by the Research Agent.
"""
from tavily import TavilyClient
from langchain_core.tools import tool


def get_tavily_tool(api_key: str):
    """
    Factory function that returns a LangChain tool bound to the
    provided Tavily API key. Supports runtime key injection.
    """
    client = TavilyClient(api_key=api_key)

    @tool
    def search_company_info(query: str) -> list[dict]:
        """
        Search the web for company information including news, financials,
        leadership, and recent developments. Returns a list of results.
        """
        try:
            results = client.search(
                query=query,
                search_depth="advanced",
                max_results=7,
                include_raw_content=False,
            )
            return results.get("results", [])
        except Exception as e:
            return [{"error": str(e), "content": "", "url": ""}]

    return search_company_info
