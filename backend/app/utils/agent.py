"""
MiniMax planning agent utilities for AssistMe.

Provides a cached LangChain ReAct agent that can call MiniMax M2 and invoke
tooling like GitHub issue creation. The module is designed to degrade
gracefully when optional dependencies or credentials are not configured.
"""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional

try:  # LangChain optional dependency
    from langchain.agents import AgentExecutor, create_react_agent
    from langchain.tools import Tool
    from langchain_core.prompts import PromptTemplate
    from langchain_openai import ChatOpenAI
except ImportError as exc:  # pragma: no cover - optional dependency
    AgentExecutor = None  # type: ignore[assignment]
    Tool = None  # type: ignore[assignment]
    PromptTemplate = None  # type: ignore[assignment]
    ChatOpenAI = None  # type: ignore[assignment]
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

try:  # PyGithub optional dependency
    from github import Github
    from github.GithubException import GithubException
except ImportError:  # pragma: no cover - optional dependency
    Github = None  # type: ignore[assignment]
    GithubException = Exception  # type: ignore[assignment]


class MiniMaxAgentNotConfigured(RuntimeError):
    """Raised when the MiniMax agent cannot be constructed."""


DEFAULT_AGENT_MODEL = os.getenv("MINIMAX_AGENT_MODEL", "minimax/minimax-m2")
DEFAULT_MINIMAX_BASE_URL = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.chat/v1")
DEFAULT_PERSONA = (
    "You are AssistMe's planner for Mangesh. Operate in 'Mangesh-mode': concise, "
    "code-forward, enumerate action items, surface assumptions, and confirm next steps."
)

ADDITIONAL_TOOLS: List[Any] = []


def register_additional_tool(tool: Any) -> None:
    """
    Register a tool to be included in subsequent MiniMax agent executions.

    Clearing the cache ensures future calls rebuild the executor with the new tool.
    """
    ADDITIONAL_TOOLS.append(tool)
    get_minimax_agent_executor.cache_clear()


try:
    from ..rag.engine import create_rag_tool
except Exception as exc:  # pragma: no cover - optional dependency
    logging.debug("RAG tool unavailable: %s", exc)
    create_rag_tool = None  # type: ignore[assignment]
else:
    rag_tool = create_rag_tool()
    if rag_tool:
        register_additional_tool(rag_tool)


def _require_dependencies() -> None:
    if _IMPORT_ERROR is not None or ChatOpenAI is None or AgentExecutor is None:
        raise MiniMaxAgentNotConfigured(
            "LangChain and langchain-openai are required for MiniMax agent support. "
            f"Import error: {_IMPORT_ERROR}"
        )


def _build_prompt() -> PromptTemplate:
    template = (
        "You are AssistMe's autonomous planner agent helping Mangesh accomplish tasks. "
        "Always think step-by-step, decide whether to call a tool, and produce an "
        "actionable plan. Use tools when they can automate work. Avoid redundant steps.\n\n"
        "Context for this user:\n{context}\n\n"
        "Task metadata (JSON):\n{metadata}\n\n"
        "You can call these tools:\n{tools}\n\n"
        "When you use a tool, follow the ReAct pattern: Thought -> Action -> Observation.\n"
        "If you lack the required data, ask follow-up questions.\n"
        "Finish with a numbered plan plus any assumptions.\n\n"
        "Question: {input}\n\n"
        "{agent_scratchpad}"
    )
    return PromptTemplate.from_template(template)


def _build_llm() -> ChatOpenAI:
    api_key = os.getenv("MINIMAX_API_KEY")
    if not api_key:
        raise MiniMaxAgentNotConfigured("MINIMAX_API_KEY is not configured.")

    timeout = float(os.getenv("MINIMAX_AGENT_TIMEOUT", "60"))
    temperature = float(os.getenv("MINIMAX_AGENT_TEMPERATURE", "0.1"))

    return ChatOpenAI(
        model=DEFAULT_AGENT_MODEL,
        api_key=api_key,
        base_url=DEFAULT_MINIMAX_BASE_URL.rstrip("/"),
        temperature=temperature,
        timeout=timeout,
        max_tokens=int(os.getenv("MINIMAX_AGENT_MAX_TOKENS", "2048")),
    )


def _safe_json_parse(payload: str) -> Dict[str, Any]:
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        raise ValueError(
            "Invalid payload. Provide JSON like "
            '{"repo": "owner/name", "title": "...", "body": "..."}'
        ) from None


def _github_issue_tool_factory() -> Optional[Tool]:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    default_repo = os.getenv("GITHUB_DEFAULT_REPO", "").strip()

    if Github is None:
        logging.debug("PyGithub not installed; GitHub issue tool disabled.")
        return None

    if not token:
        logging.info("GITHUB_TOKEN not provided; GitHub tool will only simulate output.")

    def _create_issue(payload: str) -> str:
        data = _safe_json_parse(payload)
        repo_name = data.get("repo") or default_repo
        title = data.get("title")
        body = data.get("body") or "Generated by AssistMe MiniMax agent."

        if not repo_name:
            raise ValueError("Repository is required. Set GITHUB_DEFAULT_REPO or include 'repo' in payload.")
        if not title:
            raise ValueError("Issue title missing in payload.")

        if not token:
            # Simulate for dry-run mode
            return json.dumps(
                {
                    "status": "simulated",
                    "repo": repo_name,
                    "title": title,
                    "body": body,
                    "message": "GitHub token not configured; returning dry-run payload.",
                }
            )

        try:
            gh = Github(token)
            repo = gh.get_repo(repo_name)
            issue = repo.create_issue(title=title, body=body)
            return json.dumps(
                {
                    "status": "created",
                    "repo": repo_name,
                    "issue_number": issue.number,
                    "url": issue.html_url,
                }
            )
        except GithubException as exc:  # pragma: no cover - network errors
            logging.error("Failed to create GitHub issue: %s", exc)
            raise RuntimeError(f"GitHub issue creation failed: {exc}") from exc

    description = (
        "Use this tool to create GitHub issues. "
        "Input must be JSON with keys: repo (optional if default configured), title, body."
    )
    return Tool(name="create_github_issue", func=_create_issue, description=description)


def _collect_tools() -> Iterable[Any]:
    base_tools: List[Any] = []

    github_tool = _github_issue_tool_factory()
    if github_tool:
        base_tools.append(github_tool)

    if ADDITIONAL_TOOLS:
        base_tools.extend(ADDITIONAL_TOOLS)

    if not base_tools:
        # Provide a fallback no-op tool so the agent can respond gracefully.
        def _noop(_: str) -> str:
            return "No automation tools available. Proceed with manual plan."

        base_tools.append(
            Tool(
                name="no_op",
                func=_noop,
                description="Fallback tool when no integrations are configured.",
            )
        )

    return base_tools


@lru_cache(maxsize=1)
def get_minimax_agent_executor() -> AgentExecutor:
    """
    Return a cached AgentExecutor wired to the MiniMax M2 model.
    """
    _require_dependencies()
    llm = _build_llm()
    tools = list(_collect_tools())
    prompt = _build_prompt()

    agent = create_react_agent(llm, tools, prompt=prompt)
    verbose = os.getenv("MINIMAX_AGENT_VERBOSE", "false").lower() == "true"
    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=verbose,
        handle_parsing_errors=True,
        max_iterations=int(os.getenv("MINIMAX_AGENT_MAX_STEPS", "6")),
    )


def run_planner(
    question: str,
    *,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Invoke the MiniMax planning agent synchronously and return the LangChain response.
    """
    persona = context or os.getenv("MINIMAX_AGENT_PERSONA", DEFAULT_PERSONA)
    executor = get_minimax_agent_executor()
    metadata_text = json.dumps(metadata or {}, ensure_ascii=False)
    inputs: Dict[str, Any] = {"input": question, "context": persona, "metadata": metadata_text}
    if extra:
        inputs.update(extra)
    return executor.invoke(inputs)
