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
 * spine; a tube is drawn from that spinal level out to the pain site.
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

  parts.push(linkField("This pain may originate from", s.originFrom));
  parts.push(linkField("This nerve can also refer pain to", s.refersTo));

  els.detail.innerHTML = parts.join("");

  Array.prototype.forEach.call(els.detail.querySelectorAll(".link-btn"), function (btn) {
    btn.addEventListener("click", function () { select(btn.getAttribute("data-target")); });
  });
}

function field(title, body) {
  if (!body) return "";
  return '<div class="detail-field"><h3>' + esc(title) + "</h3><p>" + esc(body) + "</p></div>";
}

function linkField(title, ids) {
  if (!ids || !ids.length) return "";
  var items = ids.map(function (id) {
    var t = byId[id];
    if (!t) return "";
    var meta = (t.roots || []).join(", ");
    return '<li><button class="link-btn" data-target="' + esc(id) + '">' +
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

/* ===================== 3D scene ===================== */

(async function initScene() {
  var THREE, OrbitControls;
  try {
    THREE = await import("three");
    OrbitControls = (await import("three/addons/controls/OrbitControls.js")).OrbitControls;
  } catch (err) {
    showSceneError("The 3D library could not be loaded (it needs network access).");
    return;
  }
  try {
    buildScene(THREE, OrbitControls);
  } catch (err) {
    showSceneError("WebGL is not available in this browser.");
  }
})();

function buildScene(THREE, OrbitControls) {
  /* ---- coordinate mapping (viewBox units -> world units) ---- */
  var SCALE = 50, CX = 120, CY = 280;
  function wx(px) { return (px - CX) / SCALE; }
  function wy(py) { return (CY - py) / SCALE; }

  var COL = {
    personal: 0xff6b6b, general: 0x6fb1a0, linked: 0xffd166,
    spine: 0x8a99a8, dim: 0x39454f, body: 0x2a3744, sel: 0xffffff
  };

  // Approximate vertebral level -> viewBox Y, used to anchor each nerve on the spine.
  var ROOT_PY = {
    C1: 56, C2: 62, C3: 70, C4: 80, C5: 90, C6: 99, C7: 108, C8: 117,
    T1: 126, T2: 137, T3: 148, T4: 159, T5: 170, T6: 181, T7: 192,
    T8: 203, T9: 214, T10: 225, T11: 236, T12: 247,
    L1: 256, L2: 266, L3: 276, L4: 286, L5: 296,
    S1: 304, S2: 312, S3: 320, S4: 328, S5: 336
  };
  function spineY(root) { return wy(ROOT_PY[root] != null ? ROOT_PY[root] : 200); }

  function sitePos(s) {
    var useBack = false, c = null;
    if (s.front && s.back) { c = s.front; }
    else if (s.front) { c = s.front; }
    else if (s.back) { c = s.back; useBack = true; }
    else { c = s.left || s.right; }
    if (!c) return null;
    var x = useBack ? -(c.x - CX) / SCALE : (c.x - CX) / SCALE;
    var y = wy(c.y);
    var z = (s.front && s.back) ? 0 : (s.front ? 1.4 : (s.back ? -1.4 : 0));
    return new THREE.Vector3(x, y, z);
  }

  /* ---- renderer / scene / camera ---- */
  var width = els.scene.clientWidth || 360;
  var height = els.scene.clientHeight || 480;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  els.scene.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(4.5, 1.5, 16);

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 32;
  controls.target.set(0, 0.2, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  var key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(5, 10, 8); scene.add(key);
  var rim = new THREE.DirectionalLight(0x88aaff, 0.35); rim.position.set(-6, -3, -8); scene.add(rim);

  scene.add(buildBody(THREE, wx, wy, COL));
  scene.add(buildSpine(THREE, wy, ROOT_PY, COL));

  /* ---- nerves + node markers ---- */
  var nerveObjs = {};
  var markerMeshes = [];

  sites.forEach(function (s) {
    var pos = sitePos(s);
    if (!pos) return;

    var root = (s.roots && s.roots[0]) || null;
    var spineP = new THREE.Vector3(0, root ? spineY(root) : pos.y, -0.7);
    var mid = spineP.clone().add(pos).multiplyScalar(0.5);
    var zbow = (pos.z >= 0 ? 1 : -1) * 0.8;
    var control = new THREE.Vector3(mid.x, mid.y, mid.z + zbow);
    var curve = new THREE.QuadraticBezierCurve3(spineP, control, pos);

    var baseCol = s.personal ? COL.personal : COL.general;

    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 44, 0.045, 8, false),
      new THREE.MeshStandardMaterial({
        color: baseCol, emissive: baseCol, emissiveIntensity: 0.25,
        roughness: 0.5, transparent: true, opacity: 0.8
      })
    );
    scene.add(tube);

    var mark = new THREE.Mesh(
      new THREE.SphereGeometry(s.personal ? 0.2 : 0.16, 24, 24),
      new THREE.MeshStandardMaterial({
        color: baseCol, emissive: baseCol, emissiveIntensity: 0.35,
        roughness: 0.4, transparent: true, opacity: 1
      })
    );
    mark.position.copy(pos);
    mark.userData.id = s.id;
    scene.add(mark);
    markerMeshes.push(mark);

    nerveObjs[s.id] = { tube: tube, mark: mark, baseCol: baseCol };
  });

  /* ---- highlighting ---- */
  function setMat(mat, hex, emi, op) {
    mat.color.setHex(hex); mat.emissive.setHex(hex);
    mat.emissiveIntensity = emi; mat.opacity = op;
  }
  function applyRole(o, role) {
    if (role === "sel") {
      setMat(o.tube.material, o.baseCol, 0.9, 1.0); setMat(o.mark.material, COL.sel, 0.6, 1.0);
      o.mark.scale.setScalar(1.5);
    } else if (role === "linked") {
      setMat(o.tube.material, COL.linked, 0.6, 0.95); setMat(o.mark.material, COL.linked, 0.5, 1.0);
      o.mark.scale.setScalar(1.15);
    } else if (role === "dim") {
      setMat(o.tube.material, COL.dim, 0.05, 0.16); setMat(o.mark.material, COL.dim, 0.1, 0.35);
      o.mark.scale.setScalar(0.85);
    } else { // base
      setMat(o.tube.material, o.baseCol, 0.25, 0.8); setMat(o.mark.material, o.baseCol, 0.35, 1.0);
      o.mark.scale.setScalar(1.0);
    }
  }

  highlight3D = function (id) {
    var sel = id ? byId[id] : null;
    var linked = {};
    if (sel) (sel.refersTo || []).concat(sel.originFrom || []).forEach(function (x) { linked[x] = true; });
    Object.keys(nerveObjs).forEach(function (sid) {
      var role = !sel ? "base" : (sid === id ? "sel" : (linked[sid] ? "linked" : "dim"));
      applyRole(nerveObjs[sid], role);
    });
  };
  highlight3D(state.selectedId);

  /* ---- click-to-pick (without hijacking orbit drags) ---- */
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var down = null;
  renderer.domElement.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointerup", function (e) {
    if (!down) return;
    var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down = null;
    if (moved > 6) return; // it was a drag, not a click
    var rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(markerMeshes, false);
    if (hits.length) select(hits[0].object.userData.id);
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
  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

/* ---- schematic, semi-transparent body so the nerves read clearly inside it ---- */
function buildBody(THREE, wx, wy, COL) {
  var g = new THREE.Group();
  var mat = new THREE.MeshStandardMaterial({
    color: COL.body, transparent: true, opacity: 0.16,
    roughness: 0.9, depthWrite: false, side: THREE.DoubleSide
  });
  function cap(r, len, x, y, z) {
    var m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat);
    m.position.set(x, y, z); g.add(m);
  }
  function sph(r, x, y, z) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), mat);
    m.position.set(x, y, z); g.add(m);
  }
  sph(0.5, 0, wy(44), 0);            // head
  cap(0.22, 0.3, 0, wy(78), 0);      // neck
  cap(0.62, 2.6, 0, wy(176), 0);     // torso
  cap(0.5, 0.5, 0, wy(266), 0);      // pelvis
  cap(0.17, 3.0, wx(178), wy(186), 0.1);   // left arm (patient left = +X)
  cap(0.17, 3.0, -wx(178), wy(186), 0.1);  // right arm
  cap(0.27, 3.9, 0.5, wy(394), 0);   // left leg
  cap(0.27, 3.9, -0.5, wy(394), 0);  // right leg
  return g;
}

/* ---- spine column with vertebra nubs at each level ---- */
function buildSpine(THREE, wy, ROOT_PY, COL) {
  var g = new THREE.Group();
  var pts = [56, 90, 130, 180, 230, 266, 300, 332].map(function (py) {
    return new THREE.Vector3(0, wy(py), -0.7);
  });
  var curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(
    new THREE.TubeGeometry(curve, 60, 0.1, 8, false),
    new THREE.MeshStandardMaterial({ color: COL.spine, emissive: COL.spine, emissiveIntensity: 0.15, roughness: 0.6 })
  ));
  var vmat = new THREE.MeshStandardMaterial({ color: COL.spine, roughness: 0.5 });
  Object.keys(ROOT_PY).forEach(function (r) {
    var nub = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), vmat);
    nub.position.set(0, wy(ROOT_PY[r]), -0.7);
    g.add(nub);
  });
  return g;
}
