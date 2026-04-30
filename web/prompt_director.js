/**
 * fw-prompt-suite — Prompt Director JS
 * M pill (default on)  → routes slot to prompt pin
 * R pill (default off) → routes slot to refiner_prompt pin
 * Pills are separate button widgets below each dropdown — proven clickable pattern.
 */
import { app } from "../../scripts/app.js";
import { getMuxerSlotsViaInput, hideWidget, syncHidden } from "./fw_shared.js";

const DIRECTOR_TYPE    = "PromptDirector";
const DEFAULT_TEMPLATE = "{subject}{scene}{camera}{lighting}{aux_a}{aux_b}";

const HIDDEN_WIDGETS = [
    "sel_latent",
    "sel_scene", "sel_camera", "sel_lighting", "sel_aux_a", "sel_aux_b",
    "main_subject", "main_scene", "main_camera", "main_lighting", "main_aux_a", "main_aux_b",
    "ref_subject",  "ref_scene",  "ref_camera",  "ref_lighting",  "ref_aux_a",  "ref_aux_b",
    "mode", "template", "expert_prompt",
    "latent", "scene", "camera", "lighting", "aux_a", "aux_b",
];

const LATENT_SLOT = { name: "latent", label: "Latent", isLatent: true, noPills: true };
const SUBJECT_SLOT = { name: "subject", label: "Subject", noDropdown: true };
const SLOT_DEFS = [
    { name: "scene",    label: "Scene"    },
    { name: "camera",   label: "Camera"   },
    { name: "lighting", label: "Lighting" },
    { name: "aux_a",    label: "Aux A"    },
    { name: "aux_b",    label: "Aux B"    },
];
const ALL_SLOT_DEFS = [LATENT_SLOT, SUBJECT_SLOT, ...SLOT_DEFS];

const PILL = { w: 36, h: 14, r: 7 };
const M_PILL = { ...PILL, onColor: "#4a6e9e", offColor: "#3a3a3a", label: "M" };
const R_PILL = { ...PILL, onColor: "#4a9e5c", offColor: "#3a3a3a", label: "R" };

// ─────────────────────────────────────────────────────────────────────────────
app.registerExtension({
    name: "FruitWerks.PromptDirector",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== DIRECTOR_TYPE) return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origCreated?.apply(this, arguments);
            this._fw = {
                mode:         "easy",
                easyTemplate: DEFAULT_TEMPLATE,
                expertPrompt: "",
                selections:   {},
                main:    { subject: true,  scene: true,  camera: true,  lighting: true,  aux_a: true,  aux_b: true  },
                refiner: { subject: false, scene: false, camera: false, lighting: false, aux_a: false, aux_b: false },
            };
            this._hideBackendWidgets();
            this._buildUI();
        };

        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            origConfigure?.apply(this, arguments);
            if (!this._fw) this._fw = {
                mode: "easy", easyTemplate: DEFAULT_TEMPLATE,
                expertPrompt: "", selections: {},
                main:    { subject: true,  scene: true,  camera: true,  lighting: true,  aux_a: true,  aux_b: true  },
                refiner: { subject: false, scene: false, camera: false, lighting: false, aux_a: false, aux_b: false },
            };
            if (data.fw_mode          !== undefined) this._fw.mode         = data.fw_mode;
            if (data.fw_easy_template !== undefined) this._fw.easyTemplate = data.fw_easy_template;
            if (data.fw_expert_prompt !== undefined) this._fw.expertPrompt = data.fw_expert_prompt;
            if (data.fw_selections    !== undefined) this._fw.selections   = data.fw_selections;
            if (data.fw_main          !== undefined) {
                Object.assign(this._fw.main, data.fw_main);
                if (data.fw_main.subject === undefined) this._fw.main.subject = true;
            }
            if (data.fw_refiner       !== undefined) {
                Object.assign(this._fw.refiner, data.fw_refiner);
                if (data.fw_refiner.subject === undefined) this._fw.refiner.subject = false;
            }

            this._hideBackendWidgets();
            setTimeout(() => {
                this._buildUI();
                this._applyMode(this._fw.mode, true);
                this._refreshAllDropdowns(true);
            }, 250);
        };

        const origSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function (data) {
            origSerialize?.apply(this, arguments);
            if (!this._fw) return;
            if (this._fwTemplateWidget) this._fw.easyTemplate = this._fwTemplateWidget.value;
            if (this._fwExpertWidget)   this._fw.expertPrompt = this._fwExpertWidget.value;
            data.fw_mode          = this._fw.mode;
            data.fw_easy_template = this._fw.easyTemplate;
            data.fw_expert_prompt = this._fw.expertPrompt;
            data.fw_selections    = this._fw.selections;
            data.fw_main          = this._fw.main;
            data.fw_refiner       = this._fw.refiner;
        };

        const origConnChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (type, index, connected, link_info) {
            origConnChange?.apply(this, arguments);
            setTimeout(() => this._refreshAllDropdowns(false), 80);
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            const snap = ALL_SLOT_DEFS
                .map(d => getMuxerSlotsViaInput(this, d.name).map(s => s.label).join("|"))
                .join("||");
            if (snap !== this._lastSnap) {
                this._lastSnap = snap;
                this._refreshAllDropdowns(false);
            }
        };

        nodeType.prototype._hideBackendWidgets = function () {
            for (const name of HIDDEN_WIDGETS) hideWidget(this, name);
        };

        nodeType.prototype._buildUI = function () {
            if (this.widgets) this.widgets = this.widgets.filter(w => !w._fw);
            const self = this;

            this._fwDropdowns = {};
            this._fwPills     = {};

            const addPillsWidget = (name, isVisible) => {
                const pills = this.addWidget("custom", `_fw_pills_${name}`, null, () => {});
                pills._fw       = true;
                pills._slotName = name;
                pills.hidden    = !isVisible;
                pills.computeSize = function() { return [0, 20]; };

                pills.draw = function(ctx, node, width, y, height) {
                    this._last_y = y;
                    this._last_h = height;
                    const onM = self._fw.main[this._slotName];
                    const onR = self._fw.refiner[this._slotName];

                    const mX = width - M_PILL.w - 12 - R_PILL.w - 6;
                    const rX = width - R_PILL.w - 12;

                    const mY = y + (height - M_PILL.h) / 2;
                    const rY = y + (height - R_PILL.h) / 2;

                    ctx.save();
                    
                    // Draw M
                    ctx.beginPath();
                    ctx.roundRect(mX, mY, M_PILL.w, M_PILL.h, M_PILL.r);
                    ctx.fillStyle = onM ? M_PILL.onColor : M_PILL.offColor;
                    ctx.fill();
                    ctx.font = "bold 9px Arial";
                    ctx.fillStyle = onM ? "#fff" : "#666";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(M_PILL.label, mX + M_PILL.w / 2, mY + M_PILL.h / 2);

                    // Draw R
                    ctx.beginPath();
                    ctx.roundRect(rX, rY, R_PILL.w, R_PILL.h, R_PILL.r);
                    ctx.fillStyle = onR ? R_PILL.onColor : R_PILL.offColor;
                    ctx.fill();
                    ctx.fillStyle = onR ? "#fff" : "#666";
                    ctx.fillText(R_PILL.label, rX + R_PILL.w / 2, rY + R_PILL.h / 2);

                    ctx.restore();
                };

                pills.mouse = function(event, pos, node) {
                    if (event.type === "pointerdown") {
                        const [px, py] = pos;
                        if (this._last_y !== undefined && py >= this._last_y && py <= this._last_y + this._last_h) {
                            const w = node.size[0];
                            const mX = w - M_PILL.w - 12 - R_PILL.w - 6;
                            const rX = w - R_PILL.w - 12;
                            
                            if (px >= mX && px <= mX + M_PILL.w) {
                                self._fw.main[this._slotName] = !self._fw.main[this._slotName];
                                syncHidden(self, `main_${this._slotName}`, self._fw.main[this._slotName] ? "1" : "0");
                                self.setDirtyCanvas(true, true);
                                return true;
                            }
                            if (px >= rX && px <= rX + R_PILL.w) {
                                self._fw.refiner[this._slotName] = !self._fw.refiner[this._slotName];
                                syncHidden(self, `ref_${this._slotName}`, self._fw.refiner[this._slotName] ? "1" : "0");
                                self.setDirtyCanvas(true, true);
                                return true;
                            }
                        }
                    }
                    return false;
                };

                this._fwPills[name] = pills;
            };

            // Add subject pills right after subject box
            addPillsWidget("subject", true);

            // Mode
            const modeWidget = this.addWidget(
                "combo", "_fw_mode", this._fw.mode,
                (value) => self._handleModeSwitch(value),
                { values: ["easy", "expert"] }
            );
            modeWidget._fw = true; modeWidget.label = "Mode";
            this._fwModeWidget = modeWidget;

            // Template
            const templateWidget = this.addWidget(
                "text", "_fw_template", this._fw.easyTemplate,
                (value) => { self._fw.easyTemplate = value; syncHidden(self, "template", value); }
            );
            templateWidget._fw = true; templateWidget.label = "Template";
            this._fwTemplateWidget = templateWidget;

            // Expert
            const expertWidget = this.addWidget(
                "customtext", "_fw_expert", this._fw.expertPrompt,
                (value) => { self._fw.expertPrompt = value; syncHidden(self, "expert_prompt", value); }
            );
            expertWidget._fw = true; expertWidget.label = "Expert Prompt";
            this._fwExpertWidget = expertWidget;

            for (const slotDef of ALL_SLOT_DEFS) {
                const { name, label, noPills, noDropdown } = slotDef;

                if (!noDropdown) {
                    // Dropdown
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
                    dd._fw    = true;
                    dd.label  = label;
                    dd.hidden = true;
                    this._fwDropdowns[name] = dd;
                }

                if (noPills || noDropdown) continue;
                addPillsWidget(name, false);
            }

            this._applyMode(this._fw.mode, true);
        };

        nodeType.prototype._handleModeSwitch = function (newMode) {
            if (newMode === this._fw.mode) return;
            if (this._fwExpertWidget)   this._fw.expertPrompt = this._fwExpertWidget.value;
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
            if (this._fwExpertWidget)   this._fwExpertWidget.hidden   =  isEasy;
            syncHidden(this, "mode", mode);
            this.setDirtyCanvas(true, true);
        };

        nodeType.prototype._refreshAllDropdowns = function (restoreSelections) {
            if (!this._fwDropdowns) return;
            let anyVisible = false;

            for (const slotDef of ALL_SLOT_DEFS) {
                const { name, noPills, noDropdown } = slotDef;
                const pills = this._fwPills?.[name];

                if (noDropdown) {
                    if (pills) {
                        pills.hidden = false;
                        if (restoreSelections) {
                            syncHidden(this, `main_${name}`, this._fw.main[name] ? "1" : "0");
                            syncHidden(this, `ref_${name}`, this._fw.refiner[name] ? "1" : "0");
                        }
                    }
                    continue;
                }

                const dd = this._fwDropdowns[name];
                if (!dd) continue;

                const slots = getMuxerSlotsViaInput(this, name);
                if (!slots.length) {
                    dd.options.values = ["(not connected)"];
                    dd.value          = "(not connected)";
                    dd.hidden         = true;
                    if (pills) pills.hidden = true;
                    continue;
                }

                dd.hidden  = false;
                anyVisible = true;
                dd.options.values = slots.map(s => s.label);

                if (restoreSelections && this._fw.selections[name]) {
                    const saved = this._fw.selections[name];
                    let resolved = slots.find(s => s.label === saved.label);
                    if (!resolved) resolved = slots.find(s => s.slot_name === saved.slot_name);
                    if (!resolved) resolved = slots[0];
                    dd.value = resolved.label;
                    this._fw.selections[name] = { label: resolved.label, slot_name: resolved.slot_name };
                    syncHidden(this, `sel_${name}`, resolved.slot_name);
                } else if (!dd.options.values.includes(dd.value)) {
                    dd.value = slots[0].label;
                    this._fw.selections[name] = { label: slots[0].label, slot_name: slots[0].slot_name };
                    syncHidden(this, `sel_${name}`, slots[0].slot_name);
                }

                if (!noPills) {
                    if (pills) {
                        pills.hidden = false;
                        if (restoreSelections) {
                            syncHidden(this, `main_${name}`, this._fw.main[name] ? "1" : "0");
                            syncHidden(this, `ref_${name}`, this._fw.refiner[name] ? "1" : "0");
                        }
                    }
                }
            }

            this.setDirtyCanvas(true, true);
        };
    },
});
