/* Interactive nerve pain referral guide — 3D nerve map.
 *
 * Data lives in data.js (window.NERVE_SITES). There is no build step: Three.js
 * is pulled from a CDN via the <script type="importmap"> in index.html, and
 * this file is loaded as a module.
 *
 * 3D positions are DERIVED from the existing 2D view coordinates so data.js
 * stays the single source of truth:
 *   - front/back (x,y) on the 0..240 x 0..560 viewBox -> world X/Y
 *   - back-only sites have their X mirrored (the back view is left-right
 *     flipped) so a "your left" landmark lands on the same side as in front
 *   - depth (Z) comes from whether the site is drawn on the front or back
 * Each site's first nerve root (C2, C6, L4, S1, ...) maps to a height on the
 * spine; a nerve is routed from that spinal level, out through the limb, to the
 * pain site so the path traces anatomically rather than going straight.
 *
 * Selecting a site lights up its nerve and walks the referral graph upstream
 * (originFrom) to draw glowing connectors that show where the pain is coming
 * FROM, with pulses flowing along them toward the selected site.
 */

var sites = (typeof window !== "undefined" && window.NERVE_SITES) || [];
var byId = {};
sites.forEach(function (s) { byId[s.id] = s; });

var els = {
  scene: document.getElementById("scene"),
  detail: document.getElementById("detail"),
  list: document.getElementById("site-list"),
  search: document.getElementById("search")
};

var state = { selectedId: null };
var highlight3D = null; // assigned once the scene is ready; null before/if 3D fails

/* ===================== Detail / list / search (no 3D dependency) ===================== */

function select(id) {
  var s = byId[id];
  if (!s) return;
  state.selectedId = id;
  if (highlight3D) highlight3D(id);
  renderDetail();
  renderList();
}

function renderDetail() {
  var s = state.selectedId ? byId[state.selectedId] : null;
  if (!s) {
    els.detail.innerHTML =
      '<div class="detail-empty"><p>Select a node on the body, or pick from the list below.</p></div>';
    return;
  }

  var parts = [];
  parts.push('<h2 class="detail-title">' + esc(s.label));
  if (s.personal) parts.push('<span class="badge badge-personal">Your issue</span>');
  if (s.side && s.side !== "central") parts.push('<span class="badge badge-side">' + esc(s.side) + " side</span>");
  parts.push("</h2>");

  parts.push('<p class="detail-sub">' + esc(s.region) + "</p>");

  parts.push('<div class="chip-row">');
  (s.roots || []).forEach(function (r) { parts.push('<span class="chip chip-root">' + esc(r) + "</span>"); });
  (s.nerves || []).forEach(function (n) { parts.push('<span class="chip">' + esc(n) + "</span>"); });
  parts.push("</div>");

  parts.push(field("What's happening", s.description));
  parts.push(field("Common cause", s.cause));

  if (s.personal && s.personalNote) {
    parts.push('<div class="detail-field"><h3>Your documented picture</h3>' +
      '<p class="personal-note">' + esc(s.personalNote) + "</p></div>");
  }

  parts.push(linkField("This pain may originate from", s.originFrom, "source"));
  parts.push(linkField("This nerve can also refer pain to", s.refersTo, "refer"));

  els.detail.innerHTML = parts.join("");

  Array.prototype.forEach.call(els.detail.querySelectorAll(".link-btn"), function (btn) {
    btn.addEventListener("click", function () { select(btn.getAttribute("data-target")); });
  });
}

function field(title, body) {
  if (!body) return "";
  return '<div class="detail-field"><h3>' + esc(title) + "</h3><p>" + esc(body) + "</p></div>";
}

function linkField(title, ids, variant) {
  if (!ids || !ids.length) return "";
  var cls = variant ? " link-" + variant : "";
  var items = ids.map(function (id) {
    var t = byId[id];
    if (!t) return "";
    var meta = (t.roots || []).join(", ");
    return '<li><button class="link-btn' + cls + '" data-target="' + esc(id) + '">' +
      '<span class="arrow">&rarr;</span><span>' + esc(t.label) +
      (meta ? ' <span style="color:var(--muted)">(' + esc(meta) + ")</span>" : "") +
      "</span></button></li>";
  }).join("");
  return '<div class="detail-field"><h3>' + esc(title) + '</h3><ul class="link-list">' + items + "</ul></div>";
}

function renderList() {
  var q = (els.search.value || "").trim().toLowerCase();
  var matches = sites.filter(function (s) { return matchesQuery(s, q); });

  if (!matches.length) {
    els.list.innerHTML = '<li class="list-empty">No sites match “' + esc(q) + '”.</li>';
    return;
  }

  var order = [];
  var groups = {};
  matches.forEach(function (s) {
    if (!groups[s.region]) { groups[s.region] = []; order.push(s.region); }
    groups[s.region].push(s);
  });

  var html = [];
  order.forEach(function (region) {
    html.push('<li class="group-label">' + esc(region) + "</li>");
    groups[region].forEach(function (s) {
      var sel = state.selectedId === s.id ? " is-selected" : "";
      var dot = s.personal ? "personal" : "general";
      var meta = (s.roots || []).join(", ");
      html.push(
        '<li><button class="list-item' + sel + '" data-id="' + esc(s.id) + '">' +
        '<span class="li-dot ' + dot + '"></span>' +
        '<span class="li-main"><span class="li-title">' + esc(s.label) + "</span>" +
        (meta ? '<br><span class="li-meta">' + esc(meta) + "</span>" : "") +
        "</span></button></li>"
      );
    });
  });
  els.list.innerHTML = html.join("");

  Array.prototype.forEach.call(els.list.querySelectorAll(".list-item"), function (btn) {
    btn.addEventListener("click", function () { select(btn.getAttribute("data-id")); });
  });
}

function matchesQuery(s, q) {
  if (!q) return true;
  var hay = [s.label, s.region, s.side, s.cause, s.description]
    .concat(s.roots || [], s.nerves || [])
    .join(" ")
    .toLowerCase();
  return hay.indexOf(q) !== -1;
}

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showSceneError(msg) {
  els.scene.innerHTML =
    '<div class="scene-error"><p><strong>3D view unavailable.</strong></p><p>' + esc(msg) +
    "</p><p>The search and details panel still work.</p></div>";
}

// Wire up the panels immediately — they don't depend on the 3D scene.
els.search.addEventListener("input", renderList);
renderDetail();
renderList();

/* ===================== Referral graph (shared by panel + 3D) ===================== */

// Walk a directed referral chain by following `key` (originFrom / refersTo)
// transitively, with a cycle guard. Returns a set { id: true } not including the start.
function walkChain(startId, key) {
  var out = {};
  var stack = [startId];
  while (stack.length) {
    var cur = stack.pop();
    var node = byId[cur];
    if (!node) continue;
    (node[key] || []).forEach(function (nid) {
      if (!out[nid] && nid !== startId && byId[nid]) {
        out[nid] = true;
        stack.push(nid);
      }
    });
  }
  return out;
}

/* ===================== 3D scene ===================== */

(async function initScene() {
  var THREE, OrbitControls;
  try {
    THREE = await import("three");
    OrbitControls = (await import("three/addons/controls/OrbitControls.js")).OrbitControls;
  } catch (err) {
    showSceneError("The 3D library could not be loaded.");
    return;
  }
  try {
    buildScene(THREE, OrbitControls);
  } catch (err) {
    if (typeof console !== "undefined") console.error(err);
    showSceneError("WebGL is not available in this browser.");
  }
})();

function buildScene(THREE, OrbitControls) {
  /* ---- coordinate mapping (viewBox units -> world units) ---- */
  var SCALE = 50, CX = 120, CY = 280;
  function wx(px) { return (px - CX) / SCALE; }
  function wy(py) { return (CY - py) / SCALE; }

  var COL = {
    personal: 0xff6b6b, general: 0x6fb1a0, refer: 0xffd166, source: 0x5cd6ff,
    spine: 0xaebccb, dim: 0x33414d, body: 0x2f5d86, sel: 0xffffff
  };

  // Approximate vertebral level -> viewBox Y, used to anchor each nerve on the spine.
  var ROOT_PY = {
    C1: 56, C2: 62, C3: 70, C4: 80, C5: 90, C6: 99, C7: 108, C8: 117,
    T1: 126, T2: 137, T3: 148, T4: 159, T5: 170, T6: 181, T7: 192,
    T8: 203, T9: 214, T10: 225, T11: 236, T12: 247,
    L1: 256, L2: 266, L3: 276, L4: 286, L5: 296,
    S1: 304, S2: 312, S3: 320, S4: 328, S5: 336
  };
  function rootPy(root) { return ROOT_PY[root] != null ? ROOT_PY[root] : 200; }

  // Natural front/back curve of the spine (world Z) at a given viewBox height,
  // so the column has a gentle S instead of being a straight rod.
  var SPINE_CTRL = [
    { py: 48, z: -0.34 }, { py: 90, z: -0.46 }, { py: 140, z: -0.60 },
    { py: 185, z: -0.62 }, { py: 230, z: -0.46 }, { py: 262, z: -0.34 },
    { py: 300, z: -0.42 }, { py: 338, z: -0.56 }
  ];
  function spineZ(py) {
    var a = SPINE_CTRL;
    if (py <= a[0].py) return a[0].z;
    if (py >= a[a.length - 1].py) return a[a.length - 1].z;
    for (var i = 0; i < a.length - 1; i++) {
      if (py >= a[i].py && py <= a[i + 1].py) {
        var t = (py - a[i].py) / (a[i + 1].py - a[i].py);
        return a[i].z + (a[i + 1].z - a[i].z) * t;
      }
    }
    return -0.45;
  }
  function spinePoint(py) { return new THREE.Vector3(0, wy(py), spineZ(py)); }

  function sitePos(s) {
    var useBack = false, c = null;
    if (s.front && s.back) { c = s.front; }
    else if (s.front) { c = s.front; }
    else if (s.back) { c = s.back; useBack = true; }
    else { c = s.left || s.right; }
    if (!c) return null;
    var x = useBack ? -(c.x - CX) / SCALE : (c.x - CX) / SCALE;
    var y = wy(c.y);
    var z = (s.front && s.back) ? 0 : (s.front ? 0.62 : (s.back ? -0.62 : 0));
    return new THREE.Vector3(x, y, z);
  }

  /* ---- renderer / scene / camera ---- */
  var width = els.scene.clientWidth || 360;
  var height = els.scene.clientHeight || 480;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  els.scene.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c1118, 0.022);

  var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(5.2, 1.4, 15.5);

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 30;
  controls.target.set(0, 0.1, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  // Pause the idle spin while the user is interacting, resume after a beat.
  var idleTimer = null;
  controls.addEventListener("start", function () {
    controls.autoRotate = false;
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  });
  controls.addEventListener("end", function () {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { controls.autoRotate = true; }, 4000);
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(6, 11, 9); scene.add(key);
  var fill = new THREE.DirectionalLight(0x88bbff, 0.45); fill.position.set(-7, 2, 6); scene.add(fill);
  var rim = new THREE.DirectionalLight(0x4f7fff, 0.5); rim.position.set(-4, -2, -9); scene.add(rim);

  var glowTex = makeGlowTexture(THREE);

  scene.add(buildBody(THREE, wx, wy, COL));
  scene.add(buildSpine(THREE, wy, ROOT_PY, spinePoint, COL));
  scene.add(buildGroundShadow(THREE, wy));

  /* ---- nerves + node markers ---- */
  var nerveObjs = {};
  var pickables = [];

  sites.forEach(function (s) {
    var pos = sitePos(s);
    if (!pos) return;

    var root = (s.roots && s.roots[0]) || null;
    var start = spinePoint(root ? rootPy(root) : 200);
    var curve = routeNerve(THREE, s, start, pos, wy);
    var len = curve.getLength();
    var tubular = Math.max(28, Math.min(140, Math.round(len * 16)));

    var baseCol = s.personal ? COL.personal : COL.general;

    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubular, 0.05, 10, false),
      new THREE.MeshStandardMaterial({
        color: baseCol, emissive: baseCol, emissiveIntensity: 0.25,
        roughness: 0.45, metalness: 0.0, transparent: true, opacity: 0.8
      })
    );
    tube.userData.id = s.id;
    scene.add(tube);
    pickables.push(tube);

    var mark = new THREE.Mesh(
      new THREE.SphereGeometry(s.personal ? 0.2 : 0.16, 24, 24),
      new THREE.MeshStandardMaterial({
        color: baseCol, emissive: baseCol, emissiveIntensity: 0.4,
        roughness: 0.35, transparent: true, opacity: 1
      })
    );
    mark.position.copy(pos);
    mark.userData.id = s.id;
    scene.add(mark);
    pickables.push(mark);

    var halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: baseCol, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    halo.scale.setScalar(0.7);
    halo.position.copy(pos);
    scene.add(halo);

    nerveObjs[s.id] = { tube: tube, mark: mark, halo: halo, curve: curve, baseCol: baseCol };
  });

  /* ---- active referral overlay (connectors + flowing pulses) ---- */
  var activeGroup = new THREE.Group();
  scene.add(activeGroup);
  var activePulses = [];
  var pulseGeo = new THREE.SphereGeometry(0.07, 12, 12);

  function clearActive() {
    activePulses.length = 0;
    while (activeGroup.children.length) {
      var c = activeGroup.children.pop();
      if (c.material) c.material.dispose();
      if (c.geometry && c.userData.disposeGeo) c.geometry.dispose();
      activeGroup.remove(c);
    }
  }

  function addPulse(curve, hex, speed) {
    var m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({
      color: hex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    activeGroup.add(m);
    activePulses.push({ curve: curve, mesh: m, speed: speed, offset: Math.random() });
  }

  // Connector arc between two sites, bowed forward so it reads as a path
  // through the body. Runs from the source (referral origin) to the target.
  function connectorCurve(fromId, toId) {
    var a = nerveObjs[fromId].mark.position;
    var b = nerveObjs[toId].mark.position;
    var mid = a.clone().add(b).multiplyScalar(0.5);
    mid.z += 0.6 + a.distanceTo(b) * 0.12;
    return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  }

  function buildActiveLinks(id, upstream) {
    clearActive();
    if (!id) return;

    // Set of nodes on the upstream side, including the selection itself.
    var set = {}; set[id] = true;
    Object.keys(upstream).forEach(function (k) { set[k] = true; });

    // Draw a connector for every originFrom edge that stays within the set,
    // so the whole "where it comes from" corridor lights up as one path.
    Object.keys(set).forEach(function (nodeId) {
      var node = byId[nodeId];
      if (!node || !nerveObjs[nodeId]) return;
      (node.originFrom || []).forEach(function (srcId) {
        if (!set[srcId] || !nerveObjs[srcId]) return;
        var curve = connectorCurve(srcId, nodeId);
        var tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 32, 0.03, 8, false),
          new THREE.MeshBasicMaterial({
            color: COL.source, transparent: true, opacity: 0.5,
            blending: THREE.AdditiveBlending, depthWrite: false
          })
        );
        tube.userData.disposeGeo = true;
        activeGroup.add(tube);
        addPulse(curve, COL.source, 0.5);            // flows source -> target
      });
    });

    // A bright pulse arriving along the selected nerve, plus a feed pulse on
    // each upstream nerve, so you can see the signal converging on the site.
    if (nerveObjs[id]) addPulse(nerveObjs[id].curve, 0xffffff, 0.32);
    Object.keys(upstream).forEach(function (k) {
      if (nerveObjs[k]) addPulse(nerveObjs[k].curve, COL.source, 0.4);
    });
  }

  /* ---- highlighting ---- */
  function setMesh(mat, hex, emi, op) {
    mat.color.setHex(hex); mat.emissive.setHex(hex);
    mat.emissiveIntensity = emi; mat.opacity = op;
  }
  function setHalo(o, hex, op, scl) {
    o.halo.material.color.setHex(hex); o.halo.material.opacity = op; o.halo.scale.setScalar(scl);
  }
  function applyRole(o, role) {
    if (role === "sel") {
      setMesh(o.tube.material, o.baseCol, 0.95, 1.0); setMesh(o.mark.material, COL.sel, 0.7, 1.0);
      o.mark.scale.setScalar(1.6); setHalo(o, COL.sel, 0.9, 1.5);
    } else if (role === "source") {
      setMesh(o.tube.material, COL.source, 0.7, 0.95); setMesh(o.mark.material, COL.source, 0.55, 1.0);
      o.mark.scale.setScalar(1.25); setHalo(o, COL.source, 0.65, 1.05);
    } else if (role === "refer") {
      setMesh(o.tube.material, COL.refer, 0.6, 0.9); setMesh(o.mark.material, COL.refer, 0.5, 1.0);
      o.mark.scale.setScalar(1.15); setHalo(o, COL.refer, 0.5, 0.95);
    } else if (role === "dim") {
      setMesh(o.tube.material, COL.dim, 0.04, 0.12); setMesh(o.mark.material, COL.dim, 0.1, 0.32);
      o.mark.scale.setScalar(0.85); setHalo(o, COL.dim, 0.05, 0.5);
    } else { // base
      setMesh(o.tube.material, o.baseCol, 0.25, 0.8); setMesh(o.mark.material, o.baseCol, 0.4, 1.0);
      o.mark.scale.setScalar(1.0); setHalo(o, o.baseCol, 0.35, 0.7);
    }
  }

  var selectedObj = null;
  highlight3D = function (id) {
    var sel = id ? byId[id] : null;
    var upstream = sel ? walkChain(id, "originFrom") : {};
    var downstream = sel ? walkChain(id, "refersTo") : {};
    selectedObj = id ? nerveObjs[id] : null;

    Object.keys(nerveObjs).forEach(function (sid) {
      var role;
      if (!sel) role = "base";
      else if (sid === id) role = "sel";
      else if (upstream[sid]) role = "source";
      else if (downstream[sid]) role = "refer";
      else role = "dim";
      applyRole(nerveObjs[sid], role);
    });

    buildActiveLinks(id, upstream);
  };
  highlight3D(state.selectedId);

  /* ---- pointer: hover cursor + click-to-pick (without hijacking orbit drags) ---- */
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var down = null;

  function pickAt(clientX, clientY) {
    var rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(pickables, false);
    return hits.length ? hits[0].object.userData.id : null;
  }

  renderer.domElement.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointermove", function (e) {
    if (down) return; // mid-drag: leave the grab cursor alone
    renderer.domElement.style.cursor = pickAt(e.clientX, e.clientY) ? "pointer" : "grab";
  });
  renderer.domElement.addEventListener("pointerup", function (e) {
    if (!down) return;
    var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down = null;
    if (moved > 6) return; // it was a drag, not a click
    var id = pickAt(e.clientX, e.clientY);
    if (id) select(id);
  });

  /* ---- resize ---- */
  function resize() {
    var w = els.scene.clientWidth, h = els.scene.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(els.scene);
  window.addEventListener("resize", resize);

  /* ---- render loop ---- */
  var clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    // Slide each pulse along its curve; brightest in the middle of the run.
    for (var i = 0; i < activePulses.length; i++) {
      var p = activePulses[i];
      var u = (t * p.speed + p.offset) % 1;
      p.curve.getPointAt(u, p.mesh.position);
      p.mesh.material.opacity = 0.25 + 0.75 * Math.sin(u * Math.PI);
    }

    // Gentle breathing on the selected marker so the focus reads as "live".
    if (selectedObj) selectedObj.mark.scale.setScalar(1.6 + 0.12 * Math.sin(t * 3.2));

    controls.update();
    renderer.render(scene, camera);
  })();
}

/* ===================== Geometry builders ===================== */

/* Route a nerve from its spinal root, out through the relevant limb, to the
 * pain site — so it traces the body instead of cutting a straight line. */
function routeNerve(THREE, s, start, end, wy) {
  var pts = [start.clone()];
  var sign = end.x >= 0 ? 1 : -1;
  var region = s.region;
  // Limb hubs (lower-cervical, lumbar) sit near the spine — keep them off the
  // limb routes so the nerve doesn't loop out and back.
  var arm = region === "Shoulder & arm" || region === "Hand & forearm";
  var leg = region === "Leg & foot" || (region === "Back & hips" && s.side !== "central");
  var head = region === "Head & neck" && end.y > wy(96);

  if (arm) {
    if (Math.abs(end.x) < 0.85 && end.y > wy(140)) {
      // Proximal plexus / thoracic-outlet points sit right by the neck — route
      // them with a short bow instead of looping all the way out to the shoulder.
      var pm = start.clone().add(end).multiplyScalar(0.5);
      pm.x += sign * 0.12; pm.z += 0.2;
      pts.push(pm);
    } else {
      pts.push(new THREE.Vector3(sign * 0.25, wy(118), -0.05)); // exit the cervical spine
      pts.push(new THREE.Vector3(sign * 1.1, wy(134), 0.18));   // over the shoulder girdle
      if (end.y < wy(205)) pts.push(new THREE.Vector3(sign * 1.6, wy(214), 0.28)); // past the elbow
    }
  } else if (leg) {
    pts.push(new THREE.Vector3(sign * 0.12, wy(258), -0.05)); // exit the lumbar spine
    pts.push(new THREE.Vector3(sign * 0.5, wy(294), 0.12));   // through the hip / buttock
    if (end.y < wy(430)) pts.push(new THREE.Vector3(sign * 0.55, wy(432), 0.22)); // past the knee
  } else if (region === "Chest & ribs" && Math.abs(end.x) > 0.2) {
    // intercostal nerve wraps from the spine, around the rib, to the chest wall
    var sx = end.x >= 0 ? 1 : -1;
    pts.push(new THREE.Vector3(sx * (Math.abs(end.x) + 0.45), (start.y + end.y) / 2, 0.05));
  } else if (head) {
    pts.push(new THREE.Vector3(sign * 0.18, wy(72), end.z * 0.3)); // up toward the occiput / face
  } else {
    var mid = start.clone().add(end).multiplyScalar(0.5);     // torso: bow gently forward
    mid.z += 0.35;
    pts.push(mid);
  }

  pts.push(end.clone());
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

/* A view-aligned fresnel rim, giving each body part a glowing "scan" edge. */
function makeRimMaterial(THREE, hex, power, intensity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hex) },
      uPower: { value: power },
      uIntensity: { value: intensity }
    },
    vertexShader: [
      "varying vec3 vN; varying vec3 vV;",
      "void main() {",
      "  vec4 wp = modelMatrix * vec4(position, 1.0);",
      "  vN = normalize(mat3(modelMatrix) * normal);",
      "  vV = normalize(cameraPosition - wp.xyz);",
      "  gl_Position = projectionMatrix * viewMatrix * wp;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform vec3 uColor; uniform float uPower; uniform float uIntensity;",
      "varying vec3 vN; varying vec3 vV;",
      "void main() {",
      "  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);",
      "  gl_FragColor = vec4(uColor * uIntensity, f);",
      "}"
    ].join("\n"),
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
}

/* Schematic, translucent body: a soft inner skin plus a fresnel rim shell, with
 * the cross-section flattened front-to-back so it reads as a torso, not a tube. */
function buildBody(THREE, wx, wy, COL) {
  var g = new THREE.Group();
  var skin = new THREE.MeshStandardMaterial({
    color: COL.body, transparent: true, opacity: 0.1,
    roughness: 1.0, metalness: 0.0, depthWrite: false, side: THREE.DoubleSide
  });
  var rim = makeRimMaterial(THREE, 0x6fc0ff, 2.3, 1.05);

  function part(geo, x, y, z, rx) {
    [skin, rim].forEach(function (mat) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      g.add(m);
    });
  }

  part(new THREE.SphereGeometry(0.46, 32, 32), 0, wy(46), 0.06);            // head
  part(new THREE.CapsuleGeometry(0.2, 0.26, 8, 16), 0, wy(80), 0.04);       // neck
  part(new THREE.CapsuleGeometry(0.6, 2.25, 12, 24), 0, wy(172), 0);        // torso
  part(new THREE.SphereGeometry(0.33, 24, 24), wx(150), wy(126), 0.05);     // left shoulder (+X)
  part(new THREE.SphereGeometry(0.33, 24, 24), -wx(150), wy(126), 0.05);    // right shoulder
  part(new THREE.CapsuleGeometry(0.5, 0.5, 10, 20), 0, wy(264), 0);         // pelvis
  part(new THREE.CapsuleGeometry(0.16, 2.85, 8, 16), wx(178), wy(190), 0.1);  // left arm
  part(new THREE.CapsuleGeometry(0.16, 2.85, 8, 16), -wx(178), wy(190), 0.1); // right arm
  part(new THREE.SphereGeometry(0.16, 16, 16), wx(182), wy(298), 0);        // left hand
  part(new THREE.SphereGeometry(0.16, 16, 16), -wx(182), wy(298), 0);       // right hand
  part(new THREE.CapsuleGeometry(0.26, 3.6, 10, 18), 0.5, wy(398), 0);      // left leg
  part(new THREE.CapsuleGeometry(0.26, 3.6, 10, 18), -0.5, wy(398), 0);     // right leg
  part(new THREE.SphereGeometry(0.2, 16, 16), 0.55, wy(522), 0);           // left foot
  part(new THREE.SphereGeometry(0.2, 16, 16), -0.55, wy(522), 0);          // right foot

  g.scale.z = 0.62; // flatten front-to-back
  return g;
}

/* Spine column following the natural S-curve, with disc-like vertebra nubs. */
function buildSpine(THREE, wy, ROOT_PY, spinePoint, COL) {
  var g = new THREE.Group();
  var pts = [56, 90, 130, 180, 230, 266, 300, 332].map(spinePoint);
  var curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.1, 10, false),
    new THREE.MeshStandardMaterial({ color: COL.spine, emissive: COL.spine, emissiveIntensity: 0.15, roughness: 0.6 })
  ));

  var vmat = new THREE.MeshStandardMaterial({ color: COL.spine, roughness: 0.5 });
  Object.keys(ROOT_PY).forEach(function (r) {
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 14), vmat);
    var p = spinePoint(ROOT_PY[r]);
    disc.position.copy(p);
    disc.rotation.x = Math.PI / 2; // lay the disc flat across the column
    g.add(disc);
  });
  return g;
}

/* Soft radial contact shadow under the figure to ground it. */
function buildGroundShadow(THREE, wy) {
  var c = document.createElement("canvas");
  c.width = c.height = 128;
  var ctx = c.getContext("2d");
  var grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.5)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);

  var tex = new THREE.CanvasTexture(c);
  var plane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, wy(556), 0);
  return plane;
}

/* Round white glow sprite used behind node markers. */
function makeGlowTexture(THREE) {
  var c = document.createElement("canvas");
  c.width = c.height = 64;
  var ctx = c.getContext("2d");
  var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
