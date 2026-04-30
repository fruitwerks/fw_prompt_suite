"""
fw-prompt-suite — float nodes
FloatMuxer : dynamic multi-input FLOAT muxer
FloatDropdown : standalone single-topic labeled selector for FLOAT type
"""
from .base import BaseMuxer, BaseSelector


class FloatMuxer(BaseMuxer):
    """
    Dynamically accepts up to 50 named FLOAT inputs.
    Source node titles become dropdown labels.
    Slots never renumber — gaps are safe.
    Outputs FLOAT_LIST for FloatDropdown.
    """
    INPUT_TYPE  = "FLOAT"
    OUTPUT_TYPE = "FLOAT_LIST"
    CATEGORY    = "utils/float"

    RETURN_TYPES  = ("FLOAT_LIST",)
    RETURN_NAMES  = ("float_list",)


class FloatDropdown(BaseSelector):
    """
    Standalone single-topic selector for FLOAT data.
    Connect a FloatMuxer → get a live labeled dropdown → FLOAT output.
    Selection stored by label + slot_name for resilient workflow reload.
    """
    LIST_TYPE   = "FLOAT_LIST"
    RETURN_TYPE = "FLOAT"
    CATEGORY    = "utils/float"
    EMPTY_VALUE = 0.0

    RETURN_TYPES = ("FLOAT",)
    RETURN_NAMES = ("float",)
