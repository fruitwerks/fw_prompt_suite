"""
fw-prompt-suite — base classes
Shared logic for all Muxer and Selector nodes.
"""
import re


class BaseMuxer:
    """
    Shared mux logic. Subclassed by SceneMuxer and LatentMuxer.
    Subclass must define:
        INPUT_TYPE  : str   e.g. "STRING" or "LATENT"
        OUTPUT_TYPE : str   e.g. "SCENE_LIST" or "LATENT_LIST"
        CATEGORY    : str
    """
    MAX_SLOTS   = 50
    INPUT_TYPE  = "STRING"
    OUTPUT_TYPE = "SCENE_LIST"
    CATEGORY    = "utils"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "input_1": (cls.INPUT_TYPE, {"forceInput": True}),
            }
        }

    FUNCTION = "mux"

    def mux(self, **kwargs):
        slots = []
        for i in range(1, self.MAX_SLOTS + 1):
            key = f"input_{i}"
            val = kwargs.get(key)
            if val is not None:
                slots.append({
                    "slot_name": key,
                    "value":     val,
                    "label":     key,  # enriched JS-side from source node title
                })
        return ({"slots": slots, "count": len(slots)},)


class BaseSelector:
    """
    Shared selector logic. Subclassed by SceneDropdown and LatentDirector.
    Subclass must define:
        LIST_TYPE   : str   e.g. "SCENE_LIST" or "LATENT_LIST"
        RETURN_TYPE : str   e.g. "STRING" or "LATENT"
        CATEGORY    : str
        EMPTY_VALUE : any   returned when nothing is connected
    """
    LIST_TYPE   = "SCENE_LIST"
    RETURN_TYPE = "STRING"
    CATEGORY    = "utils"
    EMPTY_VALUE = ""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "data_list":     (cls.LIST_TYPE,),
                "selected_slot": ("STRING", {"default": "input_1"}),
            }
        }

    FUNCTION = "select"

    def select(self, data_list, selected_slot="input_1"):
        slots = data_list.get("slots", []) if data_list else []
        if not slots:
            return (self.EMPTY_VALUE,)

        for s in slots:
            if s["slot_name"] == selected_slot:
                return (s["value"],)

        print(f"[{self.__class__.__name__}] WARNING: slot '{selected_slot}' not found, using first.")
        return (slots[0]["value"],)


class NormalizeMixin:
    """
    Shared text normalization utilities for PromptDirector.
    """

    @staticmethod
    def normalize_mux(text):
        """Trim, ensure exactly two trailing newlines."""
        t = text.strip()
        return t + "\n\n" if t else ""

    @staticmethod
    def normalize_subject(text):
        """Strip trailing newlines, add exactly two. Content otherwise untouched."""
        if not text:
            return ""
        return text.rstrip("\n") + "\n\n"

    @staticmethod
    def cleanup(text):
        """Collapse any run of newlines to exactly two, strip ends."""
        return re.sub(r'\n+', '\n\n', text).strip()

    @staticmethod
    def resolve(data_list, selected_slot, node_name="Node"):
        """Resolve a value from a mux list by slot name."""
        if not data_list:
            return ""
        slots = data_list.get("slots", [])
        for s in slots:
            if s["slot_name"] == selected_slot:
                return s["value"]
        if slots:
            print(f"[{node_name}] WARNING: slot '{selected_slot}' not found, using first.")
            return slots[0]["value"]
        return ""
