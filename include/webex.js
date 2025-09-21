<script>

(function () {
  'use strict';

  function update_total_correct() {
    console.log('webex: update total_correct');

    var t = document.getElementsByClassName('webex-total_correct');
    for (var i = 0; i < t.length; i++) {
      var section = t[i].parentElement;

      // question count for the existing "X of N correct"
      var units = section.querySelectorAll('.webex-solveme, .webex-select, .webex-radiogroup');
      var correctUnits = section.getElementsByClassName('webex-correct').length;

      // NEW: points – sum selected, and show max (max per question)
      var groups = section.querySelectorAll('.webex-radiogroup');
      var earned = 0, possible = 0;

      for (var g = 0; g < groups.length; g++) {
        var grp = groups[g];
        var inputs = grp.querySelectorAll('input[type="radio"]');
        var grpMax = 0;

        for (var j = 0; j < inputs.length; j++) {
          var v = Number(inputs[j].dataset.points || 0);
          if (v > grpMax) grpMax = v;
        }
        possible += grpMax;

        var checked = grp.querySelector('input[type="radio"]:checked');
        if (checked) earned += Number(checked.dataset.points || 0);
      }

      t[i].textContent =
        correctUnits + ' of ' + units.length + ' answered' +
        ' • ' + earned + ' of ' + possible + ' pts';
    }
  }

  function b_func() {
    console.log('webex: toggle hide');
    var cl = this.parentElement.classList;
    if (cl.contains('open')) cl.remove('open'); else cl.add('open');
  }

  function reset_section(section) {
    console.log('webex: reset section');

    var solveme = section.querySelectorAll('.webex-solveme');
    for (var i = 0; i < solveme.length; i++) {
      solveme[i].value = '';
      solveme[i].classList.remove('webex-correct');
      solveme[i].classList.remove('webex-incorrect');
    }

    var selects = section.querySelectorAll('.webex-select');
    for (var s = 0; s < selects.length; s++) {
      selects[s].selectedIndex = 0;
      selects[s].classList.remove('webex-correct');
      selects[s].classList.remove('webex-incorrect');
    }

    var radiogroups = section.querySelectorAll('.webex-radiogroup');
    for (var r = 0; r < radiogroups.length; r++) {
      var radios = radiogroups[r].querySelectorAll('input[type="radio"]');
      for (var j = 0; j < radios.length; j++) radios[j].checked = false;

      var labels = radiogroups[r].querySelectorAll('label');
      for (var k = 0; k < labels.length; k++) {
        labels[k].classList.remove('webex-correct');
        labels[k].classList.remove('webex-incorrect');
      }
    }

    update_total_correct();
  }

  function check_func() {
    console.log('webex: check answers');
    var section = this.parentElement;
    var cl = section.classList;
    if (cl.contains('unchecked')) {
      cl.remove('unchecked');
      this.textContent = 'Clear Result';
    } else {
      cl.add('unchecked');
      reset_section(section);
      this.textContent = 'Show Result';
    }
  }

  function solveme_func() {
    console.log('webex: check solveme');

    var real_answers;
    try { real_answers = JSON.parse(this.dataset.answer || '[]'); } catch (_) { real_answers = []; }

    var my_answer = this.value;
    var cl = this.classList;

    if (cl.contains('ignorecase')) my_answer = my_answer.toLowerCase();
    if (cl.contains('nospaces')) my_answer = my_answer.replace(/ /g, '');

    if (my_answer === '') {
      cl.remove('webex-correct'); cl.remove('webex-incorrect');
    } else if (real_answers.includes(my_answer)) {
      cl.add('webex-correct'); cl.remove('webex-incorrect');
    } else {
      cl.add('webex-incorrect'); cl.remove('webex-correct');
    }

    // numeric tolerance
    var tolAttr = this.dataset.tol;
    if (tolAttr && Number(tolAttr) > 0) {
      var tol = Number(tolAttr);
      var myNum = Number(my_answer);
      var anyMatch = real_answers
        .map(function (x) { return Number(x); })
        .filter(function (x) { return !Number.isNaN(x) && !Number.isNaN(myNum); })
        .some(function (x) { return Math.abs(x - myNum) < tol; });
      if (anyMatch) cl.add('webex-correct'); else cl.remove('webex-correct');
    }

    // regex support
    if (cl.contains('regex')) {
      var answer_regex;
      try {
        answer_regex = new RegExp(real_answers.join('|'));
        if (answer_regex.test(my_answer)) cl.add('webex-correct');
      } catch (_) { /* ignore invalid regex */ }
    }

    update_total_correct();
  }

  function select_func() {
    console.log('webex: check select: modified');
    var cl = this.classList;
    // cl.remove('webex-incorrect'); cl.remove('webex-correct');
    // if (this.value === 'answer') cl.add('webex-correct');
    // else if (this.value !== 'blank') cl.add('webex-incorrect');
    update_total_correct();
  }

  function radiogroups_func() {
    console.log('webex: check radiogroups');
    var checked_button = document.querySelector('input[name="' + this.id + '"]:checked');
    if (!checked_button) return;

    var cl = checked_button.parentElement.classList;
    var labels = checked_button.parentElement.parentElement.children;

    for (var i = 0; i < labels.length; i++) {
      labels[i].classList.remove('webex-incorrect');
      labels[i].classList.remove('webex-correct');
    }

    if (checked_button.value === 'answer') cl.add('webex-correct'); else cl.add('webex-incorrect');
    update_total_correct();
  }

  window.onload = function () {
    console.log('webex onload');

    // solution buttons
    var buttons = document.getElementsByTagName('button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].parentElement && buttons[i].parentElement.classList.contains('webex-solution')) {
        buttons[i].onclick = b_func;
      }
    }

    // check sections
    var check_sections = document.getElementsByClassName('webex-check');
    console.log('check:', check_sections.length);
    for (var j = 0; j < check_sections.length; j++) {
      check_sections[j].classList.add('unchecked');

      var btn = document.createElement('button');
      btn.textContent = 'Show Answers';
      btn.classList.add('webex-check-button');
      btn.onclick = check_func;
      check_sections[j].appendChild(btn);

      var spn = document.createElement('span');
      spn.classList.add('webex-total_correct');
      check_sections[j].appendChild(spn);
    }

    // solveme inputs
    var solveme = document.getElementsByClassName('webex-solveme');
    for (var k = 0; k < solveme.length; k++) {
      solveme[k].setAttribute('autocomplete', 'off');
      solveme[k].setAttribute('autocorrect', 'off');
      solveme[k].setAttribute('autocapitalize', 'off');
      solveme[k].setAttribute('spellcheck', 'false');
      solveme[k].value = '';

      var cl = solveme[k].classList;
      var parsed = [];
      try { parsed = JSON.parse(solveme[k].dataset.answer || '[]'); } catch (_) { parsed = []; }
      if (cl.contains('ignorecase')) parsed = parsed.map(function (a) { return String(a).toLowerCase(); });
      if (cl.contains('nospaces')) parsed = parsed.map(function (a) { return String(a).replace(/ /g, ''); });
      solveme[k].dataset.answer = JSON.stringify(parsed);

      solveme[k].onkeyup = solveme_func;
      solveme[k].onchange = solveme_func;

      solveme[k].insertAdjacentHTML('afterend', " <span class='webex-icon'></span>");
    }

    // radiogroups
    var radiogroups = document.getElementsByClassName('webex-radiogroup');
    for (var r = 0; r < radiogroups.length; r++) {
      radiogroups[r].onchange = radiogroups_func;
    }

    // selects
    var selects = document.getElementsByClassName('webex-select');
    for (var s = 0; s < selects.length; s++) {
      selects[s].onchange = select_func;
      selects[s].insertAdjacentHTML('afterend', " <span class='webex-icon'></span>");
    }

    update_total_correct();
  };
})();

</script>