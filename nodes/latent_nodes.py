"""
fw-prompt-suite — latent nodes
LatentMuxer    : dynamic multi-input LATENT muxer
LatentDirector : labeled dropdown LATENT selector
"""
from .base import BaseMuxer, BaseSelector


class LatentMuxer(BaseMuxer):
    """
    Dynamically accepts up to 50 named LATENT inputs.
    Works with any latent type (SD1, SDXL, Flux, WAN, etc.) — a latent is a latent.
    Source node titles become dropdown labels.
    Slots never renumber — gaps are safe.
    Outputs LATENT_LIST for LatentDirector.
    """
    INPUT_TYPE  = "LATENT"
    OUTPUT_TYPE = "LATENT_LIST"
    CATEGORY    = "utils/latent"

    RETURN_TYPES = ("LATENT_LIST",)
    RETURN_NAMES = ("latent_list",)


class LatentDirector(BaseSelector):
    """
    Receives a LATENT_LIST from LatentMuxer.
    Outputs the selected LATENT — pure routing, no processing.
    Selection stored by label + slot_name for resilient workflow reload.
    """
    LIST_TYPE   = "LATENT_LIST"
    RETURN_TYPE = "LATENT"
    CATEGORY    = "utils/latent"
    EMPTY_VALUE = None

    RETURN_TYPES = ("LATENT",)
    RETURN_NAMES = ("latent",)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "data_list":     ("LATENT_LIST",),
                "selected_slot": ("STRING", {"default": "input_1"}),
            }
        }

    def select(self, data_list, selected_slot="input_1"):
        slots = data_list.get("slots", []) if data_list else []
        if not slots:
            raise ValueError("[LatentDirector] No latents connected to muxer.")

        for s in slots:
            if s["slot_name"] == selected_slot:
                return (s["value"],)

        print(f"[LatentDirector] WARNING: slot '{selected_slot}' not found, using first.")
        return (slots[0]["value"],)
