"""
fw-prompt-suite — any nodes
AnyMuxer : dynamic multi-input ANY muxer
AnyDropdown : standalone single-topic labeled selector for ANY type
"""
from .base import BaseMuxer, BaseSelector


class AnyMuxer(BaseMuxer):
    """
    Dynamically accepts up to 50 named ANY (*) inputs.
    Source node titles become dropdown labels.
    Slots never renumber — gaps are safe.
    Outputs ANY_LIST for AnyDropdown.
    """
    INPUT_TYPE  = "*"
    OUTPUT_TYPE = "ANY_LIST"
    CATEGORY    = "utils/any"

    RETURN_TYPES  = ("ANY_LIST",)
    RETURN_NAMES  = ("any_list",)


class AnyDropdown(BaseSelector):
    """
    Standalone single-topic selector for generically shaped data.
    Connect an AnyMuxer → get a live labeled dropdown → ANY (*) output.
    Selection stored by label + slot_name for resilient workflow reload.
    """
    LIST_TYPE   = "ANY_LIST"
    RETURN_TYPE = "*"
    CATEGORY    = "utils/any"
    EMPTY_VALUE = None

    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("any",)
