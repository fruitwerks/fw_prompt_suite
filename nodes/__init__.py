from .scene_nodes     import SceneMuxer, SceneDropdown
from .latent_nodes    import LatentMuxer, LatentDirector
from .prompt_director import PromptDirector

NODE_CLASS_MAPPINGS = {
    "SceneMuxer":      SceneMuxer,
    "SceneDropdown":   SceneDropdown,
    "LatentMuxer":     LatentMuxer,
    "LatentDirector":  LatentDirector,
    "PromptDirector":  PromptDirector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SceneMuxer":      "Scene Muxer",
    "SceneDropdown":   "Scene Dropdown",
    "LatentMuxer":     "Latent Muxer",
    "LatentDirector":  "Latent Director",
    "PromptDirector":  "Prompt Director",
}
