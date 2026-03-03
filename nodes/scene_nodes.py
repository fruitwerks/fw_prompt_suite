"""
fw-prompt-suite — scene nodes
SceneMuxer : dynamic multi-input STRING muxer
SceneDropdown : standalone single-topic labeled selector
"""
from .base import BaseMuxer, BaseSelector


class SceneMuxer(BaseMuxer):
    """
    Dynamically accepts up to 50 named STRING inputs.
    Source node titles become dropdown labels.
    Slots never renumber — gaps are safe.
    Outputs SCENE_LIST for SceneDropdown or PromptDirector.
    """
    INPUT_TYPE  = "STRING"
    OUTPUT_TYPE = "SCENE_LIST"
    CATEGORY    = "utils/scene"

    RETURN_TYPES  = ("SCENE_LIST",)
    RETURN_NAMES  = ("scene_list",)


class SceneDropdown(BaseSelector):
    """
    Standalone single-topic selector.
    Connect a SceneMuxer → get a live labeled dropdown → STRING output.
    No PromptDirector needed — works anywhere a STRING is accepted.
    Selection stored by label + slot_name for resilient workflow reload.
    """
    LIST_TYPE   = "SCENE_LIST"
    RETURN_TYPE = "STRING"
    CATEGORY    = "utils/scene"
    EMPTY_VALUE = ""

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("string",)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "data_list":     ("SCENE_LIST",),
                "selected_slot": ("STRING", {"default": "input_1"}),
            }
        }
