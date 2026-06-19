# Nerve Pain Referral Guide

An interactive, personal reference for chronic nerve pain. Point to where it hurts on a
body diagram (or search by site, nerve, or root) and the tool shows the likely **referral
nerves** — where that pain may actually be coming from, and where the same nerve tends to
project pain to.

It's a single static page: no build step, no dependencies, no data leaves your browser.

## Use it

Open `index.html` in any browser. To serve locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

To host for free, push to GitHub and enable **GitHub Pages** (Settings → Pages → deploy
from branch).

## How it works

- **Rotate the body** through four angles — Front → Left side → Back → Right side — with the
  ◄ ► buttons, the slider, **arrow keys**, or by **dragging** the figure (pseudo-3D: hand-drawn
  SVG frames, no 3D engine, fully offline). Each highlighted point is a pain site.
  - 🔴 red = an issue from your own documented clinical picture
  - 🟢 green = a general reference site
  - Side views show a curated subset; a site only appears on the angles where it's visible.
- **Click a point** (or a list item) to open its detail card:
  - involved **nerve roots** and **peripheral nerves**
  - what's happening and the common structural cause
  - **"This pain may originate from"** → upstream referral sources
  - **"This nerve can also refer pain to"** → downstream targets
  - selecting a site also highlights its related sites (🟡) on the diagram
- **Search** filters by site name, nerve, or root (e.g. `C8`, `ulnar`, `sciatic`,
  `trigeminal`).

### Side orientation

Sites use **anatomical** sides ("your left" = your actual left). On the **front** diagram
your left appears on the right of the image; on the **back** diagram your left is on the
left. The note under the diagram reminds you which view you're in.

## Editing the data

All content lives in [`data.js`](data.js) as a plain array — no code knowledge needed to
extend it. Each entry looks like:

```js
{
  id: "ring-pinky",
  label: "Ring & pinky finger",
  region: "Hand & forearm",
  side: "left",
  front: { x: 190, y: 292 },   // hotspot per view (viewBox 0 0 240 560)
  left:  { x: 110, y: 288 },   // also shown on the left-side view
  // back / right: { x, y },   // optional: add coords for any other angle
  roots: ["C8"],
  nerves: ["Ulnar nerve"],
  cause: "…",
  description: "…",
  refersTo: [],                // ids this nerve projects pain to
  originFrom: ["lower-cervical", "forearm"], // ids the pain may come from
  personal: true,              // highlight as your own documented issue
  personalNote: "…"            // shown in a highlighted box
}
```

`refersTo` and `originFrom` reference other entries by `id`; the links are drawn
automatically. To add a brand-new pain site, append an object and give it `front` and/or
`back` coordinates.

## What's covered in v1

Built around your documented picture, then extended for general reference:

- **Upper cervical (C2/C3):** occiput, cervicogenic headache, trigeminocervical migraine
  with vision loss, referred jaw pain — including the radiofrequency ablation context.
- **Lower cervical (C5–C7):** the C5/C6 herniation and C6/C7 bulge, radiating into the
  shoulder, arm, elbow, forearm, and the new C8/ulnar ring-and-pinky pattern.
- **Thoracic outlet (differential):** the supraclavicular compression point that can
  produce the same C8/T1 ring-and-pinky pattern — included as a differential, not a
  confirmed diagnosis.
- **Left shoulder:** post-SLAP anterior (pec/armpit) and posterior pain, with the
  double-crush link back to the cervical roots.
- **Lower body (general):** lumbar, sciatic/piriformis, meralgia, femoral, and
  tibial/peroneal patterns down to the foot.

## ⚠️ Not medical advice

This is a personal educational tool for tracking patterns you and your care team have
already discussed. It does **not** diagnose and does not replace clinical judgment. If
symptoms change or escalate — new or worsening vision loss, progressive weakness, numbness
in a new distribution, or any loss of bladder/bowel control — contact a clinician promptly.
