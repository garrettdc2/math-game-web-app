"""LangGraph state machine — defines the pipeline DAG."""

from langgraph.graph import StateGraph, END

from orchestrator.state import FactoryState
from orchestrator.nodes import (
    pm_agent,
    architect_agent,
    decompose,
    dev_parallel,
    review_agent,
    test_agent,
    gate_1,
    gate_2,
    gate_3,
    deploy_agent,
    done_handler,
    blocked_handler,
)


def should_block(state: FactoryState) -> str:
    if state.get("error") or state.get("current_state") == "Blocked":
        return "blocked_handler"
    return "continue"


def qa_fanout(state: FactoryState) -> list[str]:
    """Fan out to both QA agents or block."""
    if state.get("error") or state.get("current_state") == "Blocked":
        return ["blocked_handler"]
    return ["review_agent", "test_agent"]



# Nodes that exist in the graph — used to validate resume targets
_VALID_NODES = {
    "pm_agent", "architect_agent", "decompose", "dev_parallel",
    "review_agent", "test_agent", "deploy_agent", "qa_entry",
}


def entry_route(state: FactoryState) -> str:
    """Route to the correct starting node based on current_state.

    Used both for new pipelines and rework runs so execution can begin
    at any stage.
    """
    target = STATE_MAP.get(state.get("current_state", ""), "pm_agent")
    return target if target in _VALID_NODES else "pm_agent"


def blocked_resume_router(state: FactoryState) -> str:
    """Route from blocked_handler back to the correct agent node on resume."""
    previous = state.get("previous_state", "")
    target = STATE_MAP.get(previous, "")
    if target in _VALID_NODES:
        return target
    return "__end__"


_ROUTE_MAP = {
    "pm_agent": "pm_agent",
    "architect_agent": "architect_agent",
    "decompose": "decompose",
    "dev_parallel": "dev_parallel",
    "review_agent": "review_agent",
    "test_agent": "test_agent",
    "deploy_agent": "deploy_agent",
    "qa_entry": "qa_entry",
    "__end__": END,
}


def build_graph() -> StateGraph:
    """Construct the pipeline graph (uncompiled — caller adds checkpointer)."""
    builder = StateGraph(FactoryState)

    # Entry router — allows starting from any stage (new pipeline or rework)
    builder.add_node("entry_router", lambda state: state)

    # QA entry — pass-through for rework into QA (fans out like dev_parallel exit)
    builder.add_node("qa_entry", lambda state: state)

    # Agent and gate nodes
    builder.add_node("pm_agent", pm_agent)
    builder.add_node("gate_1", gate_1)
    builder.add_node("architect_agent", architect_agent)
    builder.add_node("gate_2", gate_2)
    builder.add_node("decompose", decompose)
    builder.add_node("dev_parallel", dev_parallel)
    builder.add_node("review_agent", review_agent)
    builder.add_node("test_agent", test_agent)
    builder.add_node("gate_3", gate_3)
    builder.add_node("deploy_agent", deploy_agent)
    builder.add_node("done_handler", done_handler)
    builder.add_node("blocked_handler", blocked_handler)

    # Entry point routes to the correct starting node
    builder.set_entry_point("entry_router")
    builder.add_conditional_edges("entry_router", entry_route, _ROUTE_MAP)

    # Normal pipeline edges
    builder.add_conditional_edges(
        "pm_agent", should_block, {"blocked_handler": "blocked_handler", "continue": "gate_1"}
    )
    builder.add_edge("gate_1", "architect_agent")
    builder.add_conditional_edges(
        "architect_agent", should_block, {"blocked_handler": "blocked_handler", "continue": "gate_2"}
    )
    builder.add_edge("gate_2", "decompose")
    builder.add_edge("decompose", "dev_parallel")

    # Fan-out: dev_parallel -> review + test in parallel (or block)
    builder.add_conditional_edges("dev_parallel", qa_fanout)

    # QA entry fan-out (same routing as dev_parallel exit, for rework into QA)
    builder.add_conditional_edges("qa_entry", qa_fanout)

    # Fan-in: both QA agents -> gate_3
    builder.add_edge("review_agent", "gate_3")
    builder.add_edge("test_agent", "gate_3")

    builder.add_edge("gate_3", "deploy_agent")
    builder.add_conditional_edges(
        "deploy_agent", should_block, {"blocked_handler": "blocked_handler", "continue": "done_handler"}
    )
    builder.add_edge("done_handler", END)

    # Blocked handler routes back to the correct agent node on resume
    builder.add_conditional_edges("blocked_handler", blocked_resume_router, _ROUTE_MAP)

    return builder
