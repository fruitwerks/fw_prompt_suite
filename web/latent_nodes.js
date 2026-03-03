/**
 * fw-prompt-suite — latent nodes JS
 * LatentMuxer + LatentDirector via shared factory functions.
 */
import { createMuxerExtension, createSelectorExtension } from "./fw_shared.js";

createMuxerExtension("LatentMuxer", "LatentDirector", "LATENT");
createSelectorExtension("LatentDirector", "data_list", "Latent");
