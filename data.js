/*
 * Nerve referral data model.
 *
 * Each entry is a "pain site" you can point to. The two fields that make this a
 * *referral* guide are:
 *   - originFrom: places the pain felt HERE may actually be coming FROM
 *                 (i.e. point at where it hurts -> find the referral nerve/source)
 *   - refersTo:   other places THIS site's nerve commonly projects pain to
 *
 * Hotspot coordinates are given per VIEW on a viewBox of 0 0 240 560:
 *   front / back  — facing diagrams
 *   left  / right — side (profile) diagrams, used by the rotate control
 * A site only renders on the views for which it has coordinates, so side views
 * can show a curated subset. Side-view positions are a hand-placed first pass —
 * tweak the numbers here to nudge any dot.
 *
 * `personal: true` marks issues documented in your own clinical picture; these are
 * highlighted in the UI and explained in `personalNote`.
 *
 * Side convention: anatomical side ("your left" = the patient's left).
 */

const NERVE_SITES = [
  /* ----------------------- Upper cervical / craniofacial ----------------------- */
  {
    id: "occiput",
    label: "Base of skull / occiput",
    region: "Head & neck",
    side: "left",
    back: { x: 120, y: 62 },
    left: { x: 134, y: 58 },
    roots: ["C2", "C3"],
    nerves: ["Greater occipital nerve", "Third occipital nerve", "C2/C3 medial branches"],
    cause: "C2/C3 facet joint irritation and suboccipital muscle spasm pulling on the occipital nerves.",
    description:
      "The hub of your upper-cervical pain. Damaged or inflamed C2/C3 facets drive spasm in the suboccipital muscles, which tug on the occipital nerves and feed a steady pain signal upward.",
    refersTo: ["scalp", "temple-eye", "jaw"],
    originFrom: [],
    personal: true,
    personalNote:
      "Target of your staged bilateral radiofrequency ablations (medial branch nerves). The left side is mid-treatment and stays volatile until fully ablated and healed."
  },
  {
    id: "scalp",
    label: "Scalp / back of head (cervicogenic headache)",
    region: "Head & neck",
    side: "left",
    back: { x: 120, y: 38 },
    left: { x: 128, y: 32 },
    roots: ["C2", "C3"],
    nerves: ["Greater occipital nerve", "Lesser occipital nerve"],
    cause: "Occipital nerve irritation referred up from the C2/C3 segment.",
    description:
      "Band-like or pulling tightness across the back and top of the head — a classic cervicogenic headache rather than a primary headache.",
    refersTo: [],
    originFrom: ["occiput"],
    personal: true,
    personalNote: "Your cervicogenic headaches map here, driven from the C2/C3 level below."
  },
  {
    id: "temple-eye",
    label: "Temple / behind the eye (migraine + vision loss)",
    region: "Head & neck",
    side: "left",
    front: { x: 138, y: 46 },
    left: { x: 100, y: 46 },
    roots: ["C2"],
    nerves: ["Trigeminal nerve V1 (via the trigeminocervical nucleus)"],
    cause:
      "Upper-cervical pain signals spilling into the trigeminal pathway at the trigeminocervical nucleus.",
    description:
      "When the left C2/C3 pathology flares hard, the signal crosses into the shared trigeminal pathway and the brain triggers a full neurovascular migraine — including the temporary vision loss.",
    refersTo: [],
    originFrom: ["occiput"],
    personal: true,
    personalNote:
      "Your migraines with ocular symptoms (vision loss) originate from upper-cervical spillover, not from the eye itself — a red-flag symptom worth tracking."
  },
  {
    id: "jaw",
    label: "Jaw / face",
    region: "Head & neck",
    side: "left",
    front: { x: 134, y: 72 },
    left: { x: 102, y: 70 },
    roots: ["C2", "C3"],
    nerves: ["Trigeminal nerve V3", "Upper cervical referral"],
    cause: "Referred tightness from upper-cervical muscle spasm and the trigeminocervical link.",
    description: "Referred jaw tightness that tracks with your neck flares rather than a true dental/TMJ source.",
    refersTo: [],
    originFrom: ["occiput"],
    personal: true,
    personalNote: "Jaw tightness here is referred from C2/C3 — it rises and falls with the upper-neck flare."
  },

  /* ----------------------- Lower cervical / brachial plexus ----------------------- */
  {
    id: "lower-cervical",
    label: "Lower neck (C5–C7)",
    region: "Head & neck",
    side: "central",
    front: { x: 120, y: 98 },
    back: { x: 120, y: 98 },
    left: { x: 126, y: 96 },
    right: { x: 114, y: 96 },
    roots: ["C5", "C6", "C7"],
    nerves: ["Cervical nerve roots", "Brachial plexus (origin)"],
    cause: "C5/C6 disc herniation and C6/C7 disc bulge compressing the exiting nerve roots.",
    description:
      "The downstream hub. These roots form the brachial plexus that supplies the shoulder, arm and hand, so irritation here radiates down the whole limb (cervical radiculopathy).",
    refersTo: ["shoulder-ant", "shoulder-post", "upper-arm", "elbow", "forearm", "thumb-index", "ring-pinky"],
    originFrom: [],
    personal: true,
    personalNote:
      "Your documented C5/C6 herniation and C6/C7 bulge. New left ring/pinky symptoms point lower (C8 — possible C7/T1 involvement)."
  },
  {
    id: "thoracic-outlet",
    label: "Thoracic outlet (supraclavicular)",
    region: "Shoulder & arm",
    side: "left",
    front: { x: 146, y: 108 },
    left: { x: 106, y: 108 },
    roots: ["C8", "T1"],
    nerves: ["Lower trunk of brachial plexus", "Subclavian vessels (in vascular TOS)"],
    cause:
      "Compression of the lower brachial plexus between the scalene muscles, the first rib, and the clavicle (thoracic outlet syndrome).",
    description:
      "A separate compression point between your neck and shoulder. Because it pinches the LOWER trunk (C8/T1), classic TOS produces ring/pinky symptoms — the same distribution as your new finding — plus a heavy, aching arm that worsens with overhead or carrying positions. Differential only, not a confirmed diagnosis: a C8/ulnar pattern can come from the neck (C7/T1 progression) OR from compression here, and it fits the postural double-crush picture (a hiked, forward-rolled shoulder narrows the outlet). A clinician can distinguish them with provocative tests and nerve studies.",
    refersTo: ["upper-arm", "forearm", "ring-pinky"],
    originFrom: ["lower-cervical"],
    personal: false
  },
  {
    id: "shoulder-ant",
    label: "Front shoulder (pec / armpit)",
    region: "Shoulder & arm",
    side: "left",
    front: { x: 156, y: 128 },
    left: { x: 104, y: 124 },
    roots: ["C5", "C6"],
    nerves: ["Long head of biceps tendon", "Superior labrum anchor", "Musculocutaneous nerve"],
    cause: "Post-SLAP labral/biceps pathology — plus C5/C6 radicular pain layered on top (double crush).",
    description:
      "Anterior pain between the pec and armpit outlines the superior labrum anchor and the biceps tendon — the structures repaired in your SLAP surgery.",
    refersTo: ["upper-arm"],
    originFrom: ["lower-cervical"],
    personal: true,
    personalNote:
      "Three years post-SLAP repair. Pain here plus clicking/grinding suggests recurrent labral/biceps pathology, amplified by the irritated C5/C6 root."
  },
  {
    id: "shoulder-post",
    label: "Back of shoulder / rotator cuff",
    region: "Shoulder & arm",
    side: "left",
    back: { x: 74, y: 116 },
    left: { x: 132, y: 120 },
    roots: ["C5", "C6"],
    nerves: ["Suprascapular nerve", "Axillary nerve"],
    cause: "Posterior labrum / rotator cuff strain plus referred C5/C6 radicular pain.",
    description:
      "Posterior pain behind the rotator cuff marks the back of the joint capsule and posterior labrum.",
    refersTo: ["upper-arm"],
    originFrom: ["lower-cervical"],
    personal: true,
    personalNote: "Pairs with the front-shoulder pain to outline the whole labral ring under load."
  },
  {
    id: "upper-arm",
    label: "Upper arm",
    region: "Shoulder & arm",
    side: "left",
    front: { x: 178, y: 170 },
    left: { x: 108, y: 172 },
    roots: ["C5", "C6"],
    nerves: ["Axillary nerve", "Musculocutaneous nerve"],
    cause: "Radicular pain from C5/C6 traveling down the arm; muscles lock up defensively.",
    description: "Aching/tight band down the upper arm as the irritated root refers along its length.",
    refersTo: ["elbow"],
    originFrom: ["lower-cervical", "shoulder-ant", "shoulder-post"],
    personal: true,
    personalNote: "Part of the radiating 'short-circuit' from your lower-cervical roots."
  },
  {
    id: "elbow",
    label: "Elbow (lateral)",
    region: "Shoulder & arm",
    side: "left",
    front: { x: 182, y: 210 },
    left: { x: 108, y: 214 },
    roots: ["C6", "C7"],
    nerves: ["Radial nerve", "Cervical radiculopathy referral"],
    cause: "Sharp pain shooting into the elbow as C6/C7 roots fire along the arm.",
    description: "The 'shooting into the elbow' pain you describe — a referred radicular signal, not a local joint problem.",
    refersTo: ["forearm"],
    originFrom: ["lower-cervical", "upper-arm"],
    personal: true,
    personalNote: "Sharp radiating elbow pain is a hallmark of your lower-cervical radiculopathy."
  },
  {
    id: "forearm",
    label: "Forearm",
    region: "Hand & forearm",
    side: "left",
    front: { x: 184, y: 244 },
    left: { x: 108, y: 246 },
    roots: ["C6", "C7", "C8"],
    nerves: ["Median nerve", "Ulnar nerve"],
    cause: "Radicular referral continuing toward the hand; possible second compression at the elbow/wrist.",
    description: "The 'creaking' that travels wrist-to-shoulder when you straighten the arm tracks this nerve corridor (biceps tendinopathy can add to it).",
    refersTo: ["thumb-index", "ring-pinky"],
    originFrom: ["lower-cervical", "elbow", "thoracic-outlet"],
    personal: true,
    personalNote: "Where the double-crush corridor (neck + shoulder) carries the signal toward the hand."
  },
  {
    id: "thumb-index",
    label: "Thumb & index finger",
    region: "Hand & forearm",
    side: "left",
    front: { x: 172, y: 290 },
    left: { x: 104, y: 288 },
    roots: ["C6"],
    nerves: ["Median nerve"],
    cause: "Classic C6 distribution.",
    description: "Thumb/index symptoms point to the C6 root — your older, 'expected' radicular pattern.",
    refersTo: [],
    originFrom: ["lower-cervical", "forearm"],
    personal: false
  },
  {
    id: "ring-pinky",
    label: "Ring & pinky finger",
    region: "Hand & forearm",
    side: "left",
    front: { x: 190, y: 292 },
    left: { x: 110, y: 288 },
    roots: ["C8"],
    nerves: ["Ulnar nerve"],
    cause: "C8 distribution — suggests the C6/C7 bulge has worsened or a new C7/T1 protrusion.",
    description:
      "Your new, prominent left ring/pinky symptoms map to C8 (ulnar), one level below your documented injuries.",
    refersTo: [],
    originFrom: ["lower-cervical", "forearm", "thoracic-outlet"],
    personal: true,
    personalNote:
      "NEW symptom worth flagging to your team: a C8 pattern implies progression below the known C5/C6 and C6/C7 levels (possible C7/T1) — or compression at the thoracic outlet. Both are differentials worth distinguishing."
  },

  /* ----------------------- General lower-body coverage ----------------------- */
  {
    id: "lumbar",
    label: "Lower back (lumbar)",
    region: "Back & hips",
    side: "central",
    back: { x: 120, y: 252 },
    left: { x: 134, y: 252 },
    right: { x: 106, y: 252 },
    roots: ["L4", "L5", "S1"],
    nerves: ["Lumbar nerve roots", "Sciatic nerve (origin)"],
    cause: "Lumbar disc or facet irritation compressing the L4–S1 roots.",
    description: "The lumbar mirror of your neck: roots here form the sciatic nerve and refer down the leg.",
    refersTo: ["buttock-hip", "post-thigh", "calf", "foot"],
    originFrom: []
  },
  {
    id: "buttock-hip",
    label: "Buttock / hip",
    region: "Back & hips",
    side: "left",
    back: { x: 92, y: 290 },
    left: { x: 138, y: 290 },
    right: { x: 102, y: 290 },
    roots: ["L5", "S1"],
    nerves: ["Sciatic nerve", "Piriformis entrapment"],
    cause: "Sciatic irritation at the spine or under the piriformis muscle.",
    description: "Deep buttock pain that can be lumbar-referred or a local piriformis entrapment of the sciatic nerve.",
    refersTo: ["post-thigh", "calf"],
    originFrom: ["lumbar"]
  },
  {
    id: "lateral-thigh",
    label: "Outer thigh (meralgia)",
    region: "Leg & foot",
    side: "left",
    front: { x: 92, y: 332 },
    left: { x: 132, y: 334 },
    right: { x: 108, y: 334 },
    roots: ["L2", "L3"],
    nerves: ["Lateral femoral cutaneous nerve"],
    cause: "Compression of the lateral femoral cutaneous nerve at the groin (meralgia paresthetica).",
    description: "Burning/numb patch on the outer thigh that is purely sensory — not a knee or hip joint problem.",
    refersTo: [],
    originFrom: []
  },
  {
    id: "ant-thigh",
    label: "Front thigh",
    region: "Leg & foot",
    side: "central",
    front: { x: 106, y: 342 },
    left: { x: 106, y: 342 },
    right: { x: 134, y: 342 },
    roots: ["L2", "L3", "L4"],
    nerves: ["Femoral nerve"],
    cause: "Upper-lumbar root or femoral nerve irritation.",
    description: "Anterior thigh pain/weakness following the femoral nerve distribution.",
    refersTo: [],
    originFrom: ["lumbar"]
  },
  {
    id: "post-thigh",
    label: "Back of thigh / hamstring",
    region: "Leg & foot",
    side: "left",
    back: { x: 96, y: 362 },
    left: { x: 134, y: 362 },
    right: { x: 106, y: 362 },
    roots: ["S1"],
    nerves: ["Sciatic nerve"],
    cause: "Sciatic referral from the lumbar spine or buttock.",
    description: "The classic sciatic radiation down the back of the thigh.",
    refersTo: ["calf"],
    originFrom: ["lumbar", "buttock-hip"]
  },
  {
    id: "calf",
    label: "Calf / lower leg",
    region: "Leg & foot",
    side: "left",
    back: { x: 100, y: 442 },
    left: { x: 126, y: 442 },
    right: { x: 114, y: 442 },
    roots: ["S1"],
    nerves: ["Tibial nerve", "Common peroneal nerve"],
    cause: "Sciatic continuation (tibial/peroneal branches) referred from above.",
    description: "Calf pain or cramping along the tibial/peroneal corridor — often the tail end of a sciatic pattern.",
    refersTo: ["foot"],
    originFrom: ["lumbar", "post-thigh"]
  },
  {
    id: "foot",
    label: "Foot / ankle",
    region: "Leg & foot",
    side: "left",
    front: { x: 106, y: 516 },
    back: { x: 106, y: 516 },
    left: { x: 96, y: 516 },
    right: { x: 144, y: 516 },
    roots: ["S1"],
    nerves: ["Tibial nerve (tarsal tunnel)", "Common peroneal nerve"],
    cause: "Tarsal tunnel entrapment (tibial) or peroneal involvement, or referral from above.",
    description: "Burning/numb foot that can be a local entrapment or the distal end of a lumbar/sciatic referral.",
    refersTo: [],
    originFrom: ["lumbar", "calf"]
  }
];

// Expose for non-module usage.
if (typeof window !== "undefined") {
  window.NERVE_SITES = NERVE_SITES;
}
