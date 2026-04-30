/**
 * fw-prompt-suite — float nodes
 */
import { createMuxerExtension, createSelectorExtension } from "./fw_shared.js";

createMuxerExtension("FloatMuxer", "FloatDropdown", "FLOAT");
createSelectorExtension("FloatDropdown", "data_list", "Float");
