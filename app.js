/* Interactive nerve pain referral guide. Vanilla JS, no build step. */
(function () {
  "use strict";

  var sites = window.NERVE_SITES || [];
  var byId = {};
  sites.forEach(function (s) { byId[s.id] = s; });

  var SVG_NS = "http://www.w3.org/2000/svg";

  // Rotation order: turning the body Front -> Left -> Back -> Right -> (wrap).
  var VIEWS = [
    { key: "front", label: "Front",
      note: 'Front view — as if facing you, so <em>your left</em> is on the right of the diagram.' },
    { key: "left", label: "Left side",
      note: 'Left side — your left side faces you; the front of your body is to the left.' },
    { key: "back", label: "Back",
      note: 'Back view — <em>your left</em> is on the left of the diagram.' },
    { key: "right", label: "Right side",
      note: 'Right side — your right side faces you; the front of your body is to the right.' }
  ];

  var state = { rotation: 0, selectedId: null };

  var els = {
    map: document.getElementById("body-map"),
    rotLeft: document.getElementById("rotate-left"),
    rotRight: document.getElementById("rotate-right"),
    slider: document.getElementById("rotate-slider"),
    viewLabel: document.getElementById("view-label"),
    orientation: document.getElementById("orientation-note"),
    detail: document.getElementById("detail"),
    list: document.getElementById("site-list"),
    search: document.getElementById("search")
  };

  function currentView() { return VIEWS[state.rotation].key; }

  /* ---------- Body silhouettes ---------- */
  function humanoidShapes() {
    // Front/back schematic built from primitives.
    return [
      '<circle cx="120" cy="44" r="26"/>',
      '<rect x="111" y="66" width="18" height="18" rx="6"/>',
      '<path d="M86 92 Q120 80 154 92 L150 240 Q120 252 90 240 Z"/>',
      '<circle cx="86" cy="98" r="16"/>',
      '<circle cx="154" cy="98" r="16"/>',
      '<rect x="60" y="100" width="20" height="150" rx="10"/>',
      '<rect x="160" y="100" width="20" height="150" rx="10"/>',
      '<rect x="56" y="246" width="26" height="30" rx="8"/>',
      '<rect x="158" y="246" width="26" height="30" rx="8"/>',
      '<path d="M92 234 L148 234 L150 282 Q120 296 90 282 Z"/>',
      '<rect x="92" y="276" width="26" height="244" rx="11"/>',
      '<rect x="122" y="276" width="26" height="244" rx="11"/>',
      '<rect x="86" y="512" width="30" height="20" rx="7"/>',
      '<rect x="124" y="512" width="30" height="20" rx="7"/>'
    ].join("");
  }

  function profileShapes() {
    // Side profile facing the viewer's left (nose toward small x).
    return [
      '<circle cx="118" cy="44" r="23"/>',
      '<path d="M95 42 q-7 1 -7 6 q0 4 7 4 z"/>',                 // nose
      '<rect x="110" y="64" width="16" height="18" rx="6"/>',
      '<path d="M102 90 Q97 165 104 240 Q120 250 134 240 Q140 165 132 92 Q118 80 102 90 Z"/>',
      '<rect x="100" y="100" width="18" height="150" rx="9"/>',   // arm in front
      '<rect x="98" y="246" width="24" height="30" rx="8"/>',     // hand
      '<path d="M101 234 L135 234 Q140 270 120 288 Q103 282 101 250 Z"/>',
      '<rect x="106" y="276" width="32" height="244" rx="13"/>',  // legs (overlapping)
      '<rect x="84" y="512" width="50" height="20" rx="8"/>'      // foot pointing forward
    ].join("");
  }

  function silhouetteMarkup(viewKey) {
    if (viewKey === "left") {
      return '<g class="silhouette">' + profileShapes() + "</g>";
    }
    if (viewKey === "right") {
      // mirror the left profile across the vertical centre
      return '<g class="silhouette" transform="translate(240,0) scale(-1,1)">' + profileShapes() + "</g>";
    }
    return '<g class="silhouette">' + humanoidShapes() + "</g>";
  }

  /* ---------- Rendering ---------- */
  function renderMap() {
    var view = currentView();
    els.map.innerHTML = silhouetteMarkup(view);

    var selected = state.selectedId ? byId[state.selectedId] : null;
    var linked = {};
    if (selected) {
      (selected.refersTo || []).concat(selected.originFrom || []).forEach(function (id) {
        linked[id] = true;
      });
    }

    sites.forEach(function (s) {
      var coord = s[view];
      if (!coord) return; // not shown on this view

      var g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "hotspot");
      g.setAttribute("data-id", s.id);
      g.setAttribute("data-personal", s.personal ? "true" : "false");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", s.label + (s.personal ? " (your documented issue)" : ""));

      if (state.selectedId === s.id) g.classList.add("is-selected");
      else if (selected && linked[s.id]) g.classList.add("is-linked");
      else if (selected) g.classList.add("is-dim");

      var hit = document.createElementNS(SVG_NS, "circle");
      hit.setAttribute("class", "hit");
      hit.setAttribute("cx", coord.x);
      hit.setAttribute("cy", coord.y);
      hit.setAttribute("r", "8");
      g.appendChild(hit);

      var title = document.createElementNS(SVG_NS, "title");
      title.textContent = s.label;
      g.appendChild(title);

      g.addEventListener("click", function (e) { e.stopPropagation(); select(s.id); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(s.id); }
      });

      els.map.appendChild(g);
    });
  }

  function renderDetail() {
    var s = state.selectedId ? byId[state.selectedId] : null;
    if (!s) {
      els.detail.innerHTML =
        '<div class="detail-empty"><p>Select a point on the body, or pick from the list below.</p></div>';
      return;
    }

    var parts = [];
    parts.push('<h2 class="detail-title">' + esc(s.label));
    if (s.personal) parts.push('<span class="badge badge-personal">Your issue</span>');
    if (s.side && s.side !== "central") parts.push('<span class="badge badge-side">' + esc(s.side) + ' side</span>');
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

  /* ---------- List (with search) ---------- */
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

  /* ---------- Interaction ---------- */
  function select(id) {
    var s = byId[id];
    if (!s) return;
    state.selectedId = id;
    // rotate to a view that actually shows this site (prefer current)
    if (!s[currentView()]) {
      for (var i = 0; i < VIEWS.length; i++) {
        if (s[VIEWS[i].key]) { setRotation(i, true); break; }
      }
    }
    renderMap();
    renderDetail();
    renderList();
  }

  function setRotation(index, skipRender) {
    state.rotation = ((index % VIEWS.length) + VIEWS.length) % VIEWS.length;
    var v = VIEWS[state.rotation];
    els.slider.value = String(state.rotation);
    els.viewLabel.textContent = v.label;
    els.orientation.innerHTML = v.note;
    if (!skipRender) renderMap();
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- Rotation controls ---------- */
  els.rotLeft.addEventListener("click", function () { setRotation(state.rotation - 1); });
  els.rotRight.addEventListener("click", function () { setRotation(state.rotation + 1); });
  els.slider.addEventListener("input", function () { setRotation(parseInt(els.slider.value, 10)); });

  // Arrow keys rotate (when not typing in the search box).
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") { setRotation(state.rotation - 1); }
    else if (e.key === "ArrowRight") { setRotation(state.rotation + 1); }
  });

  // Drag to rotate.
  (function enableDrag() {
    var dragging = false, startX = 0, STEP = 44;
    els.map.addEventListener("pointerdown", function (e) {
      dragging = true; startX = e.clientX;
      els.map.setPointerCapture && els.map.setPointerCapture(e.pointerId);
    });
    els.map.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) >= STEP) {
        setRotation(state.rotation + (dx > 0 ? 1 : -1));
        startX = e.clientX;
      }
    });
    function end() { dragging = false; }
    els.map.addEventListener("pointerup", end);
    els.map.addEventListener("pointercancel", end);
  })();

  /* ---------- Init ---------- */
  els.search.addEventListener("input", renderList);

  setRotation(0, true);
  renderMap();
  renderDetail();
  renderList();
})();
