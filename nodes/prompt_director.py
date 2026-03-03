"""
fw-prompt-suite — Prompt Director
Composes a final prompt from subject + up to 5 SCENE_LIST muxer inputs.
Easy mode  : editable single-line template with {variable} substitution.
Expert mode: freeform multiline, {variable} substitution optional.
"""
import re
from .base import NormalizeMixin


class PromptDirector(NormalizeMixin):
    """
    Inputs:
        subject             — multiline textbox or piped STRING primitive
        scene/camera/
        lighting/aux_a/aux_b — SCENE_LIST from SceneMuxers (all optional)

    Easy mode:
        Single-line editable template. Missing slots silently skipped.
        Default: {subject}{scene}{camera}{lighting}{aux_a}{aux_b}

    Expert mode:
        Freeform multiline box. {variable} substitution works if used.
        If no {variables} found, subject is prepended automatically.

    Normalization:
        Muxed inputs  → trim + exactly two trailing newlines
        Subject box   → only add two trailing newlines if missing
        Final output  → collapse all newline runs to exactly two
    """

    DEFAULT_TEMPLATE = "{subject}{scene}{camera}{lighting}{aux_a}{aux_b}"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "subject":      ("STRING", {"multiline": True,  "default": ""}),
                "mode":         (["easy", "expert"],),
                "template":     ("STRING", {"multiline": False, "default": cls.DEFAULT_TEMPLATE}),
                "expert_prompt":("STRING", {"multiline": True,  "default": ""}),
                # Hidden sync widgets — JS writes selected slot names here
                "sel_scene":    ("STRING", {"default": "input_1"}),
                "sel_camera":   ("STRING", {"default": "input_1"}),
                "sel_lighting": ("STRING", {"default": "input_1"}),
                "sel_aux_a":    ("STRING", {"default": "input_1"}),
                "sel_aux_b":    ("STRING", {"default": "input_1"}),
            },
            "optional": {
                "scene":    ("SCENE_LIST",),
                "camera":   ("SCENE_LIST",),
                "lighting": ("SCENE_LIST",),
                "aux_a":    ("SCENE_LIST",),
                "aux_b":    ("SCENE_LIST",),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION     = "compose"
    CATEGORY     = "utils/scene"

    def compose(
        self,
        subject="",
        mode="easy",
        template=DEFAULT_TEMPLATE,
        expert_prompt="",
        sel_scene="input_1",
        sel_camera="input_1",
        sel_lighting="input_1",
        sel_aux_a="input_1",
        sel_aux_b="input_1",
        scene=None,
        camera=None,
        lighting=None,
        aux_a=None,
        aux_b=None,
    ):
        resolved = {
            "subject":  self.normalize_subject(subject),
            "scene":    self.normalize_mux(self.resolve(scene,    sel_scene,    "PromptDirector")),
            "camera":   self.normalize_mux(self.resolve(camera,   sel_camera,   "PromptDirector")),
            "lighting": self.normalize_mux(self.resolve(lighting, sel_lighting, "PromptDirector")),
            "aux_a":    self.normalize_mux(self.resolve(aux_a,    sel_aux_a,    "PromptDirector")),
            "aux_b":    self.normalize_mux(self.resolve(aux_b,    sel_aux_b,    "PromptDirector")),
        }

        if mode == "easy":
            result = template
            for key, val in resolved.items():
                result = result.replace(f"{{{key}}}", val)
            return (self.cleanup(result),)

        else:  # expert
            has_vars = bool(re.search(
                r'\{(subject|scene|camera|lighting|aux_a|aux_b)\}',
                expert_prompt
            ))
            if has_vars:
                result = expert_prompt
                for key, val in resolved.items():
                    result = result.replace(f"{{{key}}}", val)
            else:
                # No variables — prepend subject, append expert content
                result = resolved["subject"] + expert_prompt
            return (self.cleanup(result),)
