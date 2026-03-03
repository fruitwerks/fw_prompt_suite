# FW Prompt Suite
### by Fruitwerks

Natural language prompt composition and latent routing for ComfyUI.  
We are done with tag salad, or not! 

I designed this to help me create rich prompts for my workflows. Copy/pasting or digging for an image to find that one detail is tedious. Now you can have all your favorite things ready to go. Using my audio engineering experience I applied some fundamentals of signal flow to this node suite. I feel this fills a gap in the ComfyUI ecosystem and I hope you enjoy it. It is focused on natural language prompting, but you can use tags or combine it with other nodes that may fit your needs. 

This is my first public release. I wrote my first software in 1986 on a Commodore 64. 

Check the assets folder for example workflows. Add some string nodes to the muxers and wire those to the prompt director inputs. Name your string nodes accordingly, as this is the dropdown label. 

---

## Nodes

### Scene Muxer `utils/scene`
Dynamic multi-input STRING muxer. Connect named text/primitive nodes — their titles become dropdown labels automatically. Auto-expands, always keeps one open pin. Slots never renumber (gaps are safe). Outputs `SCENE_LIST`.

### Scene Dropdown `utils/scene`
Standalone single-topic labeled selector. Connect a Scene Muxer, get a live labeled dropdown, output the selected STRING. No Prompt Director needed — works anywhere a STRING is accepted. Selection survives workflow save/reload. This was an early legacy node I feel we can get some use out of it. 

### Latent Muxer `utils/latent`
Same as Scene Muxer but for LATENT inputs. Works with any latent type (SD1, SDXL, Flux, WAN, etc.) — a latent is a latent. Outputs `LATENT_LIST`.
You will need to manage your batch sizes manually per latent. 

### Latent Director `utils/latent`
Same as Scene Dropdown but for LATENTs. Pure routing — no processing. Select which latent to pass downstream via labeled dropdown.

### Prompt Director `utils/scene`
Composes a final prompt from a subject input and up to 5 Scene Muxers (scene, camera, lighting, aux_a, aux_b).

**Easy mode** — single-line editable template:
```
{subject}{scene}{camera}{lighting}{aux_a}{aux_b}
```
Unconnected slots are silently skipped. Template is editable — reorder slots freely.

**Expert mode** — full freeform multiline prompt. `{variable}` substitution works if used. If no variables found, subject is prepended automatically.

**Mode switching is safe** — both states are preserved. Switching to Easy warns before hiding Expert content. Switching back restores it.

**Normalization:** Every muxed segment ends with exactly two newlines. Subject box is untouched except for ensuring two trailing newlines for readibility. Final output collapses all newline runs to exactly two. Wire to a preview node to see the result.

---

## Installation

Copy `fw_prompt_suite/` into `ComfyUI/custom_nodes/` and restart.

---

## Typical Setup

```
[Wooded area]  ──┐
[Urban street] ──┤── Scene Muxer ──┐
[Interior]     ──┘                 │
                                   ▼
[Wide angle]   ──┐             Prompt Director ──► CLIP
[Close up]     ──┤── Camera Muxer ──┘
                                    ▲
[Golden hour]  ──┐                  │
[Overcast]     ──┤── Lighting Muxer─┘

[1024x1024] ──┐
[768x1344]  ──┤── Latent Muxer ──► Latent Director ──► KSampler
[1344x768]  ──┘
```

---

## License
GNU GENERAL PUBLIC LICENSE V3
