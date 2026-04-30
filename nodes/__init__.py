from .scene_nodes     import SceneMuxer, SceneDropdown
from .latent_nodes    import LatentMuxer, LatentDirector
from .prompt_director import PromptDirector
from .any_nodes       import AnyMuxer, AnyDropdown
from .float_nodes     import FloatMuxer, FloatDropdown

NODE_CLASS_MAPPINGS = {
    "SceneMuxer":      SceneMuxer,
    "SceneDropdown":   SceneDropdown,
    "LatentMuxer":     LatentMuxer,
    "LatentDirector":  LatentDirector,
    "PromptDirector":  PromptDirector,
    "AnyMuxer":        AnyMuxer,
    "AnyDropdown":     AnyDropdown,
    "FloatMuxer":      FloatMuxer,
    "FloatDropdown":   FloatDropdown,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SceneMuxer":      "Scene Muxer",
    "SceneDropdown":   "Scene Dropdown",
    "LatentMuxer":     "Latent Muxer",
    "LatentDirector":  "Latent Director",
    "PromptDirector":  "Prompt Director",
    "AnyMuxer":        "Any Muxer",
    "AnyDropdown":     "Any Dropdown",
    "FloatMuxer":      "Float Muxer",
    "FloatDropdown":   "Float Dropdown",
}
