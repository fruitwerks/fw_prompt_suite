/**
 * fw-prompt-suite — scene nodes JS
 * SceneMuxer + SceneDropdown via shared factory functions.
 */
import { createMuxerExtension, createSelectorExtension } from "./fw_shared.js";

createMuxerExtension("SceneMuxer", "SceneDropdown", "STRING");
createSelectorExtension("SceneDropdown", "data_list", "Scene");
