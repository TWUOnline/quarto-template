
/* webex exercises runtime (points-aware) */
(function () {
  'use strict';

  // ---------- Utilities ----------
  function toNumber(x, fallback) {
    var n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch (_) { return fallback; }
  }

  function text(el) {
    return el && ('textContent' in el) ? el.textContent : '';
  }

  function bySelector(root, sel) {
    return root.querySelectorAll(sel);
  }

  function on(el, evt, handler, opts) {
    el.addEventListener(evt, handler, opts || false);
  }

  // ---------- Correctness + Scoring ----------
  function markSolveme(inputEl) {
    var answers = parseJSON(inputEl.dataset.answer || '[]', []);
    var val = inputEl.value;
    var cl = inputEl.classList;

    if (cl.contains('ignorecase')) val = val.toLowerCase();
    if (cl.contains('nospaces')) val = val.replace(/ /g, '');

    // base state
    cl.remove('webex-correct');
    cl.remove('webex-incorrect');

    if (val === '') return; // unanswered

    var isHit = answers.includes(val);

    // numeric tolerance (optional)
    var tol = toNumber(inputEl.dataset.tol, NaN);
    if (!Number.isNaN(tol)) {
      var valNum = toNumber(val, NaN);
      if (!Number.isNaN(valNum)) {
        // if any numeric answer within tolerance, treat as correct
        isHit = answers
          .map(function (a) { return toNumber(a, NaN); })
          .some(function (a) { return Number.isFinite(a) && Math.abs(a - valNum) < tol; }) || isHit;
      }
    }

    // regex mode (optional)
    if (cl.contains('regex') && answers.length) {
      try {
        var re = new RegExp(answers.join('|'));
        if (re.test(val)) isHit = true;
      } catch (_) { /* ignore bad regex */ }
    }

    cl.add(isHit ? 'webex-correct' : 'webex-incorrect');
  }

  function markSelect(selectEl) {
    var cl = selectEl.classList;
    cl.remove('webex-incorrect');
    cl.remove('webex-correct');
    if (selectEl.value === 'answer') cl.add('webex-correct');
    else if (selectEl.value !== 'blank') cl.add('webex-incorrect');
  }

  function markRadiogroup(groupEl, changedInput) {
    // Clear previous label marks
    var labels = groupEl.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      labels[i].classList.remove('webex-incorrect');
      labels[i].classList.remove('webex-correct');
    }

    // Get current checked
    var name = groupEl.id;
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    if (!checked) return;

    var lbl = checked.closest('label');
    if (!lbl) return;

    // Apply visual correctness by value (package emits value="answer" on correct)
    if (checked.value === 'answer') lbl.classList.add('webex-correct');
    else lbl.classList.add('webex-incorrect');

    // Store selected points on the container for convenience (optional)
    groupEl.dataset.selectedPoints = String(toNumber(checked.dataset.points, 0));
  }

  function countCorrectUnits(sectionEl) {
    // solveme + select correctness is on the control; radiogroup correctness is on the chosen label
    var correct = 0;

    // solveme
    var solvemes = bySelector(sectionEl, '.webex-solveme');
    for (var i = 0; i < solvemes.length; i++) {
      if (solvemes[i].classList.contains('webex-correct')) correct++;
    }

    // selects
    var selects = bySelector(sectionEl, '.webex-select');
    for (var j = 0; j < selects.length; j++) {
      if (selects[j].classList.contains('webex-correct')) correct++;
    }

    // radiogroups
    var groups = bySelector(sectionEl, '.webex-radiogroup');
    for (var g = 0; g < groups.length; g++) {
      var name = groups[g].id;
      var checked = name && document.querySelector('input[name="' + name + '"]:checked');
      if (checked && checked.value === 'answer') correct++;
    }

    return correct;
  }

  function countTotalUnits(sectionEl) {
    // Each solveme/select counts as 1. Each radiogroup counts as 1.
    var a = bySelector(sectionEl, '.webex-solveme').length;
    var b = bySelector(sectionEl, '.webex-select').length;
    var c = bySelector(sectionEl, '.webex-radiogroup').length;
    return a + b + c;
  }

  function computePoints(sectionEl) {
    // Points default: radiogroups via input[data-points].
    // You can also optionally set data-points on solveme/select controls; if present, we include them.
    var earned = 0;
    var possible = 0;

    // radiogroups (max is highest option per group)
    var groups = bySelector(sectionEl, '.webex-radiogroup');
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      var inputs = grp.querySelectorAll('input[type="radio"]');

      var grpMax = 0;
      for (var i = 0; i < inputs.length; i++) {
        var v = toNumber(inputs[i].dataset.points, 0);
        if (v > grpMax) grpMax = v;
      }
      possible += grpMax;

      var name = grp.id;
      var checked = name && document.querySelector('input[name="' + name + '"]:checked');
      if (checked) earned += toNumber(checked.dataset.points, 0);
    }

    // solveme (optional points via data-points on the input)
    var solvemes = bySelector(sectionEl, '.webex-solveme');
    for (var s = 0; s < solvemes.length; s++) {
      var pts = toNumber(solvemes[s].dataset.points, NaN);
      if (!Number.isNaN(pts)) {
        possible += pts;
        if (solvemes[s].classList.contains('webex-correct')) earned += pts;
      }
    }

    // selects (optional points via data-points on the select)
    var selects = bySelector(sectionEl, '.webex-select');
    for (var k = 0; k < selects.length; k++) {
      var pts2 = toNumber(selects[k].dataset.points, NaN);
      if (!Number.isNaN(pts2)) {
        possible += pts2;
        if (selects[k].classList.contains('webex-correct')) earned += pts2;
      }
    }

    return { earned: earned, possible: possible };
  }

  function updateTotalCorrect() {
    var totals = document.getElementsByClassName('webex-total_correct');
    for (var i = 0; i < totals.length; i++) {
      var section = totals[i].parentElement;
      var totalUnits = countTotalUnits(section);
      var correctUnits = countCorrectUnits(section);
      var pts = computePoints(section);

      var msg = correctUnits + ' of ' + totalUnits + ' correct';
      if (pts.possible > 0) {
        msg += ' • ' + pts.earned + ' of ' + pts.possible + ' pts';
      }
      totals[i].textContent = msg;
      totals[i].setAttribute('aria-live', 'polite');
      totals[i].setAttribute('role', 'status');
    }
  }

  // ---------- Bootstrapping ----------
  function setupSolutions() {
    var sections = document.getElementsByClassName('webex-check');
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      sec.classList.add('unchecked');

      // Add toggle button if missing
      if (!sec.querySelector('.webex-check-button')) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'webex-check-button';
        btn.textContent = 'Show Answers';
        on(btn, 'click', function () {
          var parent = this.parentElement;
          var cl = parent.classList;
          if (cl.contains('unchecked')) {
            cl.remove('unchecked');
            this.textContent = 'Hide Answers';
          } else {
            cl.add('unchecked');
            this.textContent = 'Show Answers';
          }
        });
        sec.appendChild(btn);
      }

      // Add totals element if missing
      if (!sec.querySelector('.webex-total_correct')) {
        var spn = document.createElement('span');
        spn.className = 'webex-total_correct';
        sec.appendChild(spn);
      }
    }
  }

  function setupSolveme() {
    var inputs = document.getElementsByClassName('webex-solveme');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];

      // turn off browser “help”
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');

      // normalize stored answers for ignorecase / nospaces
      var cl = el.classList;
      var ans = parseJSON(el.dataset.answer || '[]', []);
      if (cl.contains('ignorecase')) ans = ans.map(function (a) { return String(a).toLowerCase(); });
      if (cl.contains('nospaces')) ans = ans.map(function (a) { return String(a).replace(/ /g, ''); });
      el.dataset.answer = JSON.stringify(ans);

      // attach
      on(el, 'keyup', function () { markSolveme(this); updateTotalCorrect(); });
      on(el, 'change', function () { markSolveme(this); updateTotalCorrect(); });

      // icon placeholder (optional)
      if (!el.nextElementSibling || !el.nextElementSibling.classList || !el.nextElementSibling.classList.contains('webex-icon')) {
        el.insertAdjacentHTML('afterend', " <span class='webex-icon'></span>");
      }
    }
  }

  function setupSelects() {
    var selects = document.getElementsByClassName('webex-select');
    for (var i = 0; i < selects.length; i++) {
      var el = selects[i];
      on(el, 'change', function () { markSelect(this); updateTotalCorrect(); });
      if (!el.nextElementSibling || !el.nextElementSibling.classList || !el.nextElementSibling.classList.contains('webex-icon')) {
        el.insertAdjacentHTML('afterend', " <span class='webex-icon'></span>");
      }
    }
  }

  function setupRadiogroups() {
    var groups = document.getElementsByClassName('webex-radiogroup');
    for (var i = 0; i < groups.length; i++) {
      (function (grp) {
        // single listener per group via event delegation
        on(grp, 'change', function (e) {
          var target = e.target;
          if (target && target.matches && target.matches('input[type="radio"]')) {
            markRadiogroup(grp, target);
            updateTotalCorrect();
          }
        });
      })(groups[i]);
    }
  }

  function setupSolutionButtons() {
    // For legacy ".webex-solution" show/hide areas
    var buttons = document.getElementsByTagName('button');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.parentElement && btn.parentElement.classList.contains('webex-solution')) {
        on(btn, 'click', function () {
          var cl = this.parentElement.classList;
          if (cl.contains('open')) cl.remove('open'); else cl.add('open');
        });
      }
    }
  }

  function initAll() {
    setupSolutions();
    setupSolutionButtons();
    setupSolveme();
    setupSelects();
    setupRadiogroups();
    updateTotalCorrect();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Optional: observe dynamically added widgets (e.g., after AJAX)
  var obs;
  try {
    obs = new MutationObserver(function (mut) {
      var needsUpdate = false;
      for (var i = 0; i < mut.length; i++) {
        var m = mut[i];
        if (m.addedNodes && m.addedNodes.length) needsUpdate = true;
      }
      if (needsUpdate) initAll();
    });
    obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (_) { /* MutationObserver not supported */ }

})();

