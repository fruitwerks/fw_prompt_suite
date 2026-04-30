"""
fw-prompt-suite — Prompt Director
Composes a final prompt from subject + up to 5 SCENE_LIST muxer inputs.
Easy mode  : editable single-line template with {variable} substitution.
Expert mode: freeform multiline, {variable} substitution optional.
Main (M)   : per-slot opt-in to prompt pin, enabled by default.
Refiner (R): per-slot opt-in to refiner_prompt pin, disabled by default.
"""
import re
from .base import NormalizeMixin


class PromptDirector(NormalizeMixin):

    DEFAULT_TEMPLATE  = "{subject}{scene}{camera}{lighting}{aux_a}{aux_b}"
    REFINER_TEMPLATE  = "{subject}{scene}{camera}{lighting}{aux_a}{aux_b}"
    REFINER_SLOTS     = ["subject", "scene", "camera", "lighting", "aux_a", "aux_b"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "subject":        ("STRING", {"multiline": True,  "default": ""}),
                "mode":           (["easy", "expert"],),
                "template":       ("STRING", {"multiline": False, "default": cls.DEFAULT_TEMPLATE}),
                "expert_prompt":  ("STRING", {"multiline": True,  "default": ""}),
                # Hidden slot selection sync widgets
                "sel_latent":     ("STRING", {"default": "input_1"}),
                "sel_scene":      ("STRING", {"default": "input_1"}),
                "sel_camera":     ("STRING", {"default": "input_1"}),
                "sel_lighting":   ("STRING", {"default": "input_1"}),
                "sel_aux_a":      ("STRING", {"default": "input_1"}),
                "sel_aux_b":      ("STRING", {"default": "input_1"}),
                # Hidden main toggle sync widgets (JS writes "1" or "0", default on)
                "main_subject":   ("STRING", {"default": "1"}),
                "main_scene":     ("STRING", {"default": "1"}),
                "main_camera":    ("STRING", {"default": "1"}),
                "main_lighting":  ("STRING", {"default": "1"}),
                "main_aux_a":     ("STRING", {"default": "1"}),
                "main_aux_b":     ("STRING", {"default": "1"}),
                # Hidden refiner toggle sync widgets (JS writes "1" or "0")
                "ref_subject":    ("STRING", {"default": "0"}),
                "ref_scene":      ("STRING", {"default": "0"}),
                "ref_camera":     ("STRING", {"default": "0"}),
                "ref_lighting":   ("STRING", {"default": "0"}),
                "ref_aux_a":      ("STRING", {"default": "0"}),
                "ref_aux_b":      ("STRING", {"default": "0"}),
            },
            "optional": {
                "latent":   ("LATENT_LIST",),
                "scene":    ("SCENE_LIST",),
                "camera":   ("SCENE_LIST",),
                "lighting": ("SCENE_LIST",),
                "aux_a":    ("SCENE_LIST",),
                "aux_b":    ("SCENE_LIST",),
            }
        }

    RETURN_TYPES  = ("STRING", "STRING", "LATENT")
    RETURN_NAMES  = ("prompt", "refiner_prompt", "latent")
    FUNCTION      = "compose"
    CATEGORY      = "utils/scene"

    def compose(
        self,
        subject="",
        mode="easy",
        template=DEFAULT_TEMPLATE,
        expert_prompt="",
        sel_latent="input_1",
        sel_scene="input_1",
        sel_camera="input_1",
        sel_lighting="input_1",
        sel_aux_a="input_1",
        sel_aux_b="input_1",
        main_subject="1",
        main_scene="1",
        main_camera="1",
        main_lighting="1",
        main_aux_a="1",
        main_aux_b="1",
        ref_subject="0",
        ref_scene="0",
        ref_camera="0",
        ref_lighting="0",
        ref_aux_a="0",
        ref_aux_b="0",
        latent=None,
        scene=None,
        camera=None,
        lighting=None,
        aux_a=None,
        aux_b=None,
    ):
        # ── Latent passthrough ────────────────────────────────────────────
        resolved_latent = None
        if latent:
            slots = latent.get("slots", [])
            for s in slots:
                if s["slot_name"] == sel_latent:
                    resolved_latent = s["value"]
                    break
            if resolved_latent is None and slots:
                resolved_latent = slots[0]["value"]

        # ── Resolve text slots ────────────────────────────────────────────
        def resolve_slot(data_list, sel):
            if not data_list:
                return ""
            return self.resolve(data_list, sel, "PromptDirector")

        resolved = {
            "subject":  self.normalize_subject(subject),
            "scene":    self.normalize_mux(resolve_slot(scene,    sel_scene)),
            "camera":   self.normalize_mux(resolve_slot(camera,   sel_camera)),
            "lighting": self.normalize_mux(resolve_slot(lighting, sel_lighting)),
            "aux_a":    self.normalize_mux(resolve_slot(aux_a,    sel_aux_a)),
            "aux_b":    self.normalize_mux(resolve_slot(aux_b,    sel_aux_b)),
        }

        # ── Apply main toggles — gate each slot for main prompt ───────────
        main_toggles = {
            "subject":  main_subject  == "1",
            "scene":    main_scene    == "1",
            "camera":   main_camera   == "1",
            "lighting": main_lighting == "1",
            "aux_a":    main_aux_a    == "1",
            "aux_b":    main_aux_b    == "1",
        }
        main_resolved = dict(resolved)
        for key in main_toggles:
            if not main_toggles[key]:
                main_resolved[key] = ""

        # ── Main prompt ───────────────────────────────────────────────────
        if mode == "easy":
            result = template
            for key, val in main_resolved.items():
                result = result.replace(f"{{{key}}}", val)
            main_prompt = self.cleanup(result)
        else:
            has_vars = bool(re.search(
                r'\{(subject|scene|camera|lighting|aux_a|aux_b)\}',
                expert_prompt
            ))
            if has_vars:
                result = expert_prompt
                for key, val in main_resolved.items():
                    result = result.replace(f"{{{key}}}", val)
            else:
                result = main_resolved["subject"] + expert_prompt
            main_prompt = self.cleanup(result)

        # ── Refiner prompt — Easy template order, opt-in slots only ──────
        ref_toggles = {
            "subject":  ref_subject  == "1",
            "scene":    ref_scene    == "1",
            "camera":   ref_camera   == "1",
            "lighting": ref_lighting == "1",
            "aux_a":    ref_aux_a    == "1",
            "aux_b":    ref_aux_b    == "1",
        }
        # Build refiner resolved — only include slots toggled on
        refiner_resolved = {
            key: (resolved[key] if ref_toggles.get(key) else "")
            for key in self.REFINER_SLOTS
        }
        refiner_result = self.REFINER_TEMPLATE
        for key, val in refiner_resolved.items():
            refiner_result = refiner_result.replace(f"{{{key}}}", val)
        refiner_prompt = self.cleanup(refiner_result)

        return (main_prompt, refiner_prompt, resolved_latent)
