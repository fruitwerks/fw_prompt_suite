/**
 * fw-prompt-suite — any nodes
 */
import { createMuxerExtension, createSelectorExtension } from "./fw_shared.js";

createMuxerExtension("AnyMuxer", "AnyDropdown", "*");
createSelectorExtension("AnyDropdown", "data_list", "Any");
