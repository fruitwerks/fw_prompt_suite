/**
 * fw-prompt-suite — shared JS utilities
 * Factory functions for Muxer and Selector/Director node extensions.
 * All node-specific JS files are thin wrappers around these.
 */

import { app } from "../../scripts/app.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared: get source node title from a connected input slot
// ─────────────────────────────────────────────────────────────────────────────
export function getSourceTitle(node, slotIndex) {
    const slot = node.inputs?.[slotIndex];
    if (!slot || slot.link == null) return null;
    const link = app.graph.links[slot.link];
    if (!link) return null;
    const srcNode = app.graph.getNodeById(link.origin_id);
    if (!srcNode) return null;
    return srcNode.title || srcNode.type || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: build label→slot map from a muxer node's connected inputs
// ─────────────────────────────────────────────────────────────────────────────
export function getMuxerSlots(muxerNode) {
    const slots = [];
    if (!muxerNode?.inputs) return slots;
    for (let i = 0; i < muxerNode.inputs.length; i++) {
        const inp = muxerNode.inputs[i];
        if (!inp.name.startsWith("input_")) continue;
        if (inp.link == null) continue;
        const title = getSourceTitle(muxerNode, i) || inp.name;
        slots.push({ label: title, slot_name: inp.name });
    }
    return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: resolve muxer slots from a director/dropdown node's named input
// (walks through the link to find the connected muxer node)
// ─────────────────────────────────────────────────────────────────────────────
export function getMuxerSlotsViaInput(node, inputName) {
    const slotIndex = node.inputs?.findIndex(i => i.name === inputName);
    if (slotIndex === undefined || slotIndex === -1) return [];
    const slot = node.inputs[slotIndex];
    if (slot.link == null) return [];
    const link = app.graph.links[slot.link];
    if (!link) return [];
    const srcNode = app.graph.getNodeById(link.origin_id);
    if (!srcNode) return [];
    return getMuxerSlots(srcNode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: hide a widget completely (zero height, invisible)
// ─────────────────────────────────────────────────────────────────────────────
export function hideWidget(node, name) {
    const w = node.widgets?.find(w => w.name === name);
    if (!w) return;
    w.hidden = true;
    w.computeSize = () => [0, -4];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: sync a hidden backend widget value
// ─────────────────────────────────────────────────────────────────────────────
export function syncHidden(node, name, value) {
    const w = node.widgets?.find(w => w.name === name);
    if (w) w.value = value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory: createMuxerExtension
// Registers a muxer node extension with dynamic slot management.
//
// nodeTypeName  : string  e.g. "SceneMuxer"
// notifyTypeName: string  e.g. "SceneDropdown" — connected nodes to notify
// inputType     : string  e.g. "STRING" or "LATENT"
// ─────────────────────────────────────────────────────────────────────────────
export function createMuxerExtension(nodeTypeName, notifyTypeName, inputType) {
    app.registerExtension({
        name: `FruitWerks.${nodeTypeName}`,

        async beforeRegisterNodeDef(nodeType, nodeData) {
            if (nodeData.name !== nodeTypeName) return;

            function notifyDownstream(muxerNode) {
                if (!muxerNode.outputs?.[0]?.links?.length) return;
                for (const linkId of muxerNode.outputs[0].links) {
                    const link = app.graph.links[linkId];
                    if (!link) continue;
                    const target = app.graph.getNodeById(link.target_id);
                    if (target?.type === notifyTypeName) {
                        target._fwRefresh?.();
                    }
                    // Also notify PromptDirector which accepts multiple mux inputs
                    if (target?.type === "PromptDirector") {
                        target._refreshAllDropdowns?.(false);
                    }
                }
            }

            const origCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                origCreated?.apply(this, arguments);
                this._slotCounter = 1;
                this._ensureOpenSlot();
            };

            const origConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function (data) {
                origConfigure?.apply(this, arguments);
                if (data.slot_counter !== undefined) this._slotCounter = data.slot_counter;
                setTimeout(() => this._ensureOpenSlot(), 100);
            };

            const origSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function (data) {
                origSerialize?.apply(this, arguments);
                data.slot_counter = this._slotCounter;
            };

            const origConnChange = nodeType.prototype.onConnectionsChange;
            nodeType.prototype.onConnectionsChange = function (type, index, connected, link_info) {
                origConnChange?.apply(this, arguments);
                setTimeout(() => {
                    this._ensureOpenSlot();
                    notifyDownstream(this);
                }, 50);
            };

            nodeType.prototype._ensureOpenSlot = function () {
                if (!this.inputs) this.inputs = [];
                const inputSlots = this.inputs.filter(i => i.name.startsWith("input_"));
                const lastSlot = inputSlots[inputSlots.length - 1];
                if (!lastSlot || lastSlot.link != null) {
                    this._slotCounter++;
                    this.addInput(`input_${this._slotCounter}`, inputType);
                }
                this._pruneEmptySlots();
            };

            nodeType.prototype._pruneEmptySlots = function () {
                if (!this.inputs) return;
                const inputSlots = this.inputs
                    .map((inp, i) => ({ inp, i }))
                    .filter(({ inp }) => inp.name.startsWith("input_"));

                let trailingEmpties = 0;
                for (let j = inputSlots.length - 1; j >= 0; j--) {
                    if (inputSlots[j].inp.link == null) trailingEmpties++;
                    else break;
                }
                while (trailingEmpties > 1) {
                    const target = inputSlots[inputSlots.length - 1 - (trailingEmpties - 1)];
                    this.removeInput(target.i);
                    trailingEmpties--;
                    inputSlots.splice(inputSlots.length - trailingEmpties - 1, 1);
                }
            };

            // Lightweight rename polling
            nodeType.prototype.onDrawForeground = function (ctx) {
                const snap = getMuxerSlots(this).map(s => s.label).join("|");
                if (snap !== this._lastSnap) {
                    this._lastSnap = snap;
                    notifyDownstream(this);
                }
            };
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory: createSelectorExtension
// Registers a selector/director node extension with labeled dropdown.
//
// nodeTypeName  : string  e.g. "SceneDropdown"
// listInputName : string  e.g. "data_list"
// widgetLabel   : string  e.g. "Latent"
// ─────────────────────────────────────────────────────────────────────────────
export function createSelectorExtension(nodeTypeName, listInputName, widgetLabel) {
    app.registerExtension({
        name: `FruitWerks.${nodeTypeName}`,

        async beforeRegisterNodeDef(nodeType, nodeData) {
            if (nodeData.name !== nodeTypeName) return;

            const origCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                origCreated?.apply(this, arguments);
                this._fw = { selectedLabel: null, selectedSlot: "input_1" };
                hideWidget(this, "selected_slot");
                this._buildDropdown();
            };

            const origConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function (data) {
                origConfigure?.apply(this, arguments);
                if (!this._fw) this._fw = { selectedLabel: null, selectedSlot: "input_1" };
                if (data.fw_label !== undefined) this._fw.selectedLabel = data.fw_label;
                if (data.fw_slot  !== undefined) this._fw.selectedSlot  = data.fw_slot;
                hideWidget(this, "selected_slot");
                setTimeout(() => {
                    this._buildDropdown();
                    this._fwRefresh(true);
                }, 200);
            };

            const origSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function (data) {
                origSerialize?.apply(this, arguments);
                data.fw_label = this._fw?.selectedLabel;
                data.fw_slot  = this._fw?.selectedSlot;
            };

            const origConnChange = nodeType.prototype.onConnectionsChange;
            nodeType.prototype.onConnectionsChange = function (type, index, connected, link_info) {
                origConnChange?.apply(this, arguments);
                setTimeout(() => this._fwRefresh(false), 80);
            };

            nodeType.prototype._buildDropdown = function () {
                // Remove existing fw dropdown to avoid duplication
                if (this.widgets) {
                    this.widgets = this.widgets.filter(w => !w._fwDropdown);
                }
                const self = this;
                const dd = this.addWidget(
                    "combo", `_fw_${nodeTypeName}`, "",
                    (value) => {
                        const slots = getMuxerSlotsViaInput(self, listInputName);
                        const match = slots.find(s => s.label === value);
                        if (match) {
                            self._fw.selectedLabel = match.label;
                            self._fw.selectedSlot  = match.slot_name;
                            syncHidden(self, "selected_slot", match.slot_name);
                        }
                    },
                    { values: [`(connect ${widgetLabel} Muxer)`] }
                );
                dd._fwDropdown = true;
                dd.label = widgetLabel;
                this._fwDropdownWidget = dd;
            };

            // Exposed for muxer to call directly
            nodeType.prototype._fwRefresh = function (restoreSelection = false) {
                if (!this._fwDropdownWidget) return;
                const slots = getMuxerSlotsViaInput(this, listInputName);

                if (!slots.length) {
                    this._fwDropdownWidget.options.values = [`(connect ${widgetLabel} Muxer)`];
                    this._fwDropdownWidget.value = `(connect ${widgetLabel} Muxer)`;
                    this.setDirtyCanvas(true, true);
                    return;
                }

                const labels = slots.map(s => s.label);
                this._fwDropdownWidget.options.values = labels;

                if (restoreSelection && this._fw?.selectedLabel) {
                    let resolved = slots.find(s => s.label === this._fw.selectedLabel);
                    if (!resolved) resolved = slots.find(s => s.slot_name === this._fw.selectedSlot);
                    if (!resolved) resolved = slots[0];
                    this._fw.selectedLabel = resolved.label;
                    this._fw.selectedSlot  = resolved.slot_name;
                    this._fwDropdownWidget.value = resolved.label;
                    syncHidden(this, "selected_slot", resolved.slot_name);
                } else if (!labels.includes(this._fwDropdownWidget.value)) {
                    this._fwDropdownWidget.value = labels[0];
                    this._fw.selectedLabel = slots[0].label;
                    this._fw.selectedSlot  = slots[0].slot_name;
                    syncHidden(this, "selected_slot", slots[0].slot_name);
                }

                this.setDirtyCanvas(true, true);
            };
        },
    });
}
