/**
 * fw-prompt-suite — Prompt Director JS
 * Easy/Expert mode, live dropdowns, cached state, hidden backend widgets.
 */
import { app } from "../../scripts/app.js";
import { getMuxerSlotsViaInput, hideWidget, syncHidden } from "./fw_shared.js";

const DIRECTOR_TYPE = "PromptDirector";
const DEFAULT_TEMPLATE = "{subject}{scene}{camera}{lighting}{aux_a}{aux_b}";

const HIDDEN_WIDGETS = [
    "sel_scene", "sel_camera", "sel_lighting", "sel_aux_a", "sel_aux_b",
    "mode", "template", "expert_prompt",
    "scene", "camera", "lighting", "aux_a", "aux_b",
];

const SLOT_DEFS = [
    { name: "scene", label: "Scene" },
    { name: "camera", label: "Camera" },
    { name: "lighting", label: "Lighting" },
    { name: "aux_a", label: "Aux A" },
    { name: "aux_b", label: "Aux B" },
];

// ─────────────────────────────────────────────────────────────────────────────
app.registerExtension({
    name: "FruitWerks.PromptDirector",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== DIRECTOR_TYPE) return;

        // ── onNodeCreated ─────────────────────────────────────────────────
        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origCreated?.apply(this, arguments);
            this._fw = {
                mode: "easy",
                easyTemplate: DEFAULT_TEMPLATE,
                expertPrompt: "",
                selections: {},
            };
            this._hideBackendWidgets();
            this._buildUI();
        };

        // ── onConfigure ───────────────────────────────────────────────────
        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            origConfigure?.apply(this, arguments);
            if (!this._fw) this._fw = {
                mode: "easy", easyTemplate: DEFAULT_TEMPLATE,
                expertPrompt: "", selections: {}
            };
            if (data.fw_mode !== undefined) this._fw.mode = data.fw_mode;
            if (data.fw_easy_template !== undefined) this._fw.easyTemplate = data.fw_easy_template;
            if (data.fw_expert_prompt !== undefined) this._fw.expertPrompt = data.fw_expert_prompt;
            if (data.fw_selections !== undefined) this._fw.selections = data.fw_selections;

            this._hideBackendWidgets();
            setTimeout(() => {
                this._buildUI();
                this._applyMode(this._fw.mode, true);
                this._refreshAllDropdowns(true);
            }, 250);
        };

        // ── onSerialize ───────────────────────────────────────────────────
        const origSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (data) {
            origSerialize?.apply(this, arguments);
            if (!this._fw) return;
            // Snapshot live values
            if (this._fwTemplateWidget) this._fw.easyTemplate = this._fwTemplateWidget.value;
            if (this._fwExpertWidget) this._fw.expertPrompt = this._fwExpertWidget.value;
            data.fw_mode = this._fw.mode;
            data.fw_easy_template = this._fw.easyTemplate;
            data.fw_expert_prompt = this._fw.expertPrompt;
            data.fw_selections = this._fw.selections;
        };

        // ── onConnectionsChange ───────────────────────────────────────────
        const origConnChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (type, index, connected, link_info) {
            origConnChange?.apply(this, arguments);
            setTimeout(() => this._refreshAllDropdowns(false), 80);
        };

        // ── onDrawForeground — rename polling ─────────────────────────────
        nodeType.prototype.onDrawForeground = function (ctx) {
            const snap = SLOT_DEFS
                .map(d => getMuxerSlotsViaInput(this, d.name).map(s => s.label).join("|"))
                .join("||");
            if (snap !== this._lastSnap) {
                this._lastSnap = snap;
                this._refreshAllDropdowns(false);
            }
        };

        // ── _hideBackendWidgets ───────────────────────────────────────────
        nodeType.prototype._hideBackendWidgets = function () {
            for (const name of HIDDEN_WIDGETS) hideWidget(this, name);
        };

        // ── _buildUI ──────────────────────────────────────────────────────
        nodeType.prototype._buildUI = function () {
            if (this.widgets) this.widgets = this.widgets.filter(w => !w._fw);
            const self = this;

            // Mode selector
            const modeWidget = this.addWidget(
                "combo", "_fw_mode", this._fw.mode,
                (value) => self._handleModeSwitch(value),
                { values: ["easy", "expert"] }
            );
            modeWidget._fw = true;
            modeWidget.label = "Mode";
            this._fwModeWidget = modeWidget;

            // Easy template
            const templateWidget = this.addWidget(
                "text", "_fw_template", this._fw.easyTemplate,
                (value) => {
                    self._fw.easyTemplate = value;
                    syncHidden(self, "template", value);
                }
            );
            templateWidget._fw = true;
            templateWidget.label = "Template";
            this._fwTemplateWidget = templateWidget;

            // Expert prompt
            const expertWidget = this.addWidget(
                "customtext", "_fw_expert", this._fw.expertPrompt,
                (value) => {
                    self._fw.expertPrompt = value;
                    syncHidden(self, "expert_prompt", value);
                }
            );
            expertWidget._fw = true;
            expertWidget.label = "Expert Prompt";
            this._fwExpertWidget = expertWidget;

            // Per-slot dropdowns
            this._fwDropdowns = {};
            for (const { name, label } of SLOT_DEFS) {
                const dd = this.addWidget(
                    "combo", `_fw_dd_${name}`, "",
                    (value) => {
                        const slots = getMuxerSlotsViaInput(self, name);
                        const match = slots.find(s => s.label === value);
                        if (match) {
                            self._fw.selections[name] = { label: match.label, slot_name: match.slot_name };
                            syncHidden(self, `sel_${name}`, match.slot_name);
                        }
                    },
                    { values: ["(not connected)"] }
                );
                dd._fw = true;
                dd.label = label;
                dd.hidden = true;
                this._fwDropdowns[name] = dd;
            }

            this._applyMode(this._fw.mode, true);
        };

        // ── _handleModeSwitch ─────────────────────────────────────────────
        nodeType.prototype._handleModeSwitch = function (newMode) {
            if (newMode === this._fw.mode) return;
            // Snapshot before switching
            if (this._fwExpertWidget) this._fw.expertPrompt = this._fwExpertWidget.value;
            if (this._fwTemplateWidget) this._fw.easyTemplate = this._fwTemplateWidget.value;

            if (newMode === "easy" && this._fw.expertPrompt.trim().length > 0) {
                const ok = confirm(
                    "Switching to Easy mode will hide your Expert prompt.\n" +
                    "It will be saved and restored if you switch back.\n\nContinue?"
                );
                if (!ok) {
                    if (this._fwModeWidget) this._fwModeWidget.value = "expert";
                    return;
                }
            }
            this._fw.mode = newMode;
            syncHidden(this, "mode", newMode);
            this._applyMode(newMode, true);
        };

        // ── _applyMode ────────────────────────────────────────────────────
        nodeType.prototype._applyMode = function (mode, restoreValues) {
            const isEasy = mode === "easy";
            if (this._fwModeWidget) this._fwModeWidget.value = mode;

            if (restoreValues) {
                if (this._fwTemplateWidget) {
                    this._fwTemplateWidget.value = this._fw.easyTemplate;
                    syncHidden(this, "template", this._fw.easyTemplate);
                }
                if (this._fwExpertWidget) {
                    this._fwExpertWidget.value = this._fw.expertPrompt;
                    syncHidden(this, "expert_prompt", this._fw.expertPrompt);
                }
            }

            if (this._fwTemplateWidget) this._fwTemplateWidget.hidden = !isEasy;
            if (this._fwExpertWidget) this._fwExpertWidget.hidden = isEasy;
            syncHidden(this, "mode", mode);
            this.setDirtyCanvas(true, true);
        };

        // ── _refreshAllDropdowns ──────────────────────────────────────────
        nodeType.prototype._refreshAllDropdowns = function (restoreSelections) {
            if (!this._fwDropdowns) return;

            for (const { name } of SLOT_DEFS) {
                const dd = this._fwDropdowns[name];
                if (!dd) continue;

                const slots = getMuxerSlotsViaInput(this, name);
                if (!slots.length) {
                    dd.options.values = ["(not connected)"];
                    dd.value = "(not connected)";
                    dd.hidden = true;
                    continue;
                }

                dd.hidden = false;
                const labels = slots.map(s => s.label);
                dd.options.values = labels;

                if (restoreSelections && this._fw.selections[name]) {
                    const saved = this._fw.selections[name];
                    let resolved = slots.find(s => s.label === saved.label);
                    if (!resolved) {
                        resolved = slots.find(s => s.slot_name === saved.slot_name);
                        if (resolved) console.warn(`[PromptDirector] ${name}: label changed, fell back to slot_name`);
                    }
                    if (!resolved) {
                        resolved = slots[0];
                        console.warn(`[PromptDirector] ${name}: could not restore, using first`);
                    }
                    dd.value = resolved.label;
                    this._fw.selections[name] = { label: resolved.label, slot_name: resolved.slot_name };
                    syncHidden(this, `sel_${name}`, resolved.slot_name);
                } else if (!labels.includes(dd.value)) {
                    dd.value = labels[0];
                    this._fw.selections[name] = { label: slots[0].label, slot_name: slots[0].slot_name };
                    syncHidden(this, `sel_${name}`, slots[0].slot_name);
                }
            }
            this.setDirtyCanvas(true, true);
        };
    },
});
