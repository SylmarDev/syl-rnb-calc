// Global-ish state for Range Compare
window.RangeCompare = {
    targetId: null, // e.g. "Charizard (Some Set)"
    targetSide: null, // 'PLAYER' | 'OPPONENT'
    // entries: {id, label, side, color, moveIdx, targetId, minPct, maxPct}
    moves: [],
    // Python parity inputs
    currentHP: null,
    maxHP: null,
    itemId: 0, // 0=None, 1=Oran, 2=Sitrus, 3=Leftovers
    rangeHPVal: 0,
    rangeComparator: "<="
};

// Ensure "+" buttons exist for all 8 moves and reflect Add Move Mode state
function ensureAddButtons() {
    function btnHtml(side, i) {
        var id = 'range' + side + i;
        return '<button class="addRangeBtn" id="' + id + '" title="Add to Range Compare" data-side="' + side + '" data-idx="' + i + '">+</button>';
    }
    for (var i = 1; i <= 4; i++) {
        // Left rows
        var $lRow = $('#resultMoveL' + i).closest('div');
        if ($lRow.length) {
            var $btnL = $lRow.find('.addRangeBtn');
            if ($btnL.length === 0) {
                $(btnHtml('L', i)).insertAfter($lRow.find('label.btn').first());
            } else {
                $btnL.attr({ 'data-side': 'L', 'data-idx': i, title: 'Add to Range Compare' }).text('+');
            }
        }
        // Right rows
        var $rRow = $('#resultMoveR' + i).closest('div');
        if ($rRow.length) {
            var $btnR = $rRow.find('.addRangeBtn');
            if ($btnR.length === 0) {
                $(btnHtml('R', i)).insertBefore($rRow.find('span.resultDamageR').first());
            } else {
                $btnR.attr({ 'data-side': 'R', 'data-idx': i, title: 'Add to Range Compare' }).text('+');
            }
        }
    }
    var show = $('#range-addMove').is(':checked');
    $('.addRangeBtn').css('display', show ? 'inline' : 'none').prop('disabled', !show);
}

// Ensure HP/item controls are present and prefilled
function ensureTargetControls() {
    var $t = $('#range-target');
    if ($t.find('.rc-hp-inputs').length === 0) {
        var hpHtml = [
            '<div class="rc-hp-inputs">',
            '  <input type="number" id="rc-currentHP" min="0" value="" style="width:70px;"/>',
            '  <span>/</span>',
            '  <input type="number" id="rc-maxHP" min="1" value="" style="width:70px;"/>',
            '  <select id="rc-item">',
            '    <option value="0">None</option>',
            '    <option value="1">Oran Berry</option>',
            '    <option value="2">Sitrus Berry</option>',
            '    <option value="3">Leftovers</option>',
            '  </select>',
            '  <button id="rc-calc" class="btn btn-small" title="Calc HP distribution">Calc</button>',
            '</div>'
        ].join('');
        $t.append(hpHtml);
    }

    // Prefill from RangeCompare state if available
    if (RangeCompare.maxHP != null) $('#rc-maxHP').val(RangeCompare.maxHP);
    if (RangeCompare.currentHP != null) $('#rc-currentHP').val(RangeCompare.currentHP);
    $('#rc-item').val(String(RangeCompare.itemId || 0));
}

// Prefill entry damage/crit rolls from calc engine outputs
function prefillEntryFromCalc(entry) {
    try {
        var attackerInfo = entry.side === 'L' ? $('#p1') : $('#p2');
        var attacker = createPokemon(attackerInfo);
        var field = createField();
        if (entry.side === 'R' && typeof field.clone === 'function') field = field.clone().swap();
        var defender = createPokemon(entry.targetId);
        var move = attacker.moves[entry.moveIdx];
        var result = calc.calculate(gen, attacker, defender, move, field);
        var rolls = normalizeDamageRolls(result.damage, move.hits || 1);
        entry.damageRolls = rolls;
        entry.critRolls = entry.damageRolls.map(function (n) { return Math.trunc(n * 1.5); });
        entry.critRate = 1 / 16;
        entry.damageRollsStr = entry.damageRolls.join(', ');
        entry.critRollsStr = entry.critRolls.join(', ');
        entry.critRateStr = '1/16';
    } catch (e) {
        entry.damageRolls = entry.damageRolls || [];
        entry.critRolls = entry.critRolls || [];
        entry.critRate = entry.critRate || (1/16);
    }
}

// Normalize different damage result shapes into an array of total damage values
function normalizeDamageRolls(dmg, hits) {
    if (typeof dmg === 'number') {
        var arr = new Array(16).fill(dmg);
        return arr.map(function (n) { return n * hits; });
    }
    if (Array.isArray(dmg)) {
        if (dmg.length && typeof dmg[0] === 'number') {
            return dmg.map(function (n) { return n * hits; });
        }
        if (Array.isArray(dmg[0])) {
            // Sum per-roll arrays (e.g. multi-hit like Parental Bond)
            var length = dmg[0].length;
            var summed = [];
            for (var i = 0; i < length; i++) {
                var s = 0;
                for (var j = 0; j < dmg.length; j++) s += (dmg[j][i] || 0);
                summed.push(s);
            }
            return summed;
        }
    }
    return [];
}

// ---------------- JS port of range-compare-py/logic.py ----------------
function rcListFromDamageRollString(str) {
    if (!str) return [];
    str = String(str).replace(/[()\s]/g, '');
    if (!str) return [];
    return str.split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return !isNaN(n); });
}

function rcGetFractionFloat(frac) {
    if (!frac) return 1/16;
    if (typeof frac === 'number') return frac;
    var parts = String(frac).split('/');
    var num = parseInt(parts[0], 10);
    var den = parseInt(parts[1], 10);
    if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    return 1/16;
}

function rcGetItemById(id, maxHP) {
    id = parseInt(id || 0, 10);
    if (id === 1) return { healthToRestore: 10, usable: true };
    if (id === 2) return { healthToRestore: Math.trunc(maxHP / 4), usable: true };
    if (id === 3) return { healthToRestore: Math.trunc(maxHP / 16), usable: false };
    return null;
}

function rcMoveDist(move) {
    var critRate = rcGetFractionFloat(move.critRateStr || move.critRate || 1/16);
    var damageRolls = (move.damageRolls && move.damageRolls.length) ? move.damageRolls.slice() : rcListFromDamageRollString(move.damageRollsStr);
    var critRolls = (move.critRolls && move.critRolls.length) ? move.critRolls.slice() : rcListFromDamageRollString(move.critRollsStr);
    var dist = {};
    var norm = (1 - critRate) / (damageRolls.length || 1);
    var crit = critRolls.length ? (critRate / critRolls.length) : 0;
    for (var i = 0; i < damageRolls.length; i++) dist[damageRolls[i]] = (dist[damageRolls[i]] || 0) + norm;
    for (var j = 0; j < critRolls.length; j++) dist[critRolls[j]] = (dist[critRolls[j]] || 0) + crit;
    return dist;
}

function rcCombineDists(d1, d2) {
    var out = {};
    for (var a in d1) {
        for (var b in d2) {
            var key = (parseInt(a, 10) + parseInt(b, 10));
            out[key] = (out[key] || 0) + d1[a] * d2[b];
        }
    }
    return out;
}

function rcCombineHealthDists(hd, md, healthToProc, item, maxHP) {
    var out = {};
    for (var key in hd) {
        var parts = key.split('|');
        var health = parseInt(parts[0], 10);
        var itemUsed = parts[1] === '1';
        var hpProb = hd[key];
        for (var dmg in md) {
            var prob = md[dmg];
            var newHealth = health - parseInt(dmg, 10);
            var newItemUsed = itemUsed;
            if (newHealth <= 0) {
                newHealth = 0;
            } else if (item && item.usable && !newItemUsed && newHealth <= healthToProc) {
                newHealth += item.healthToRestore;
                newItemUsed = true;
            } else if (item && !item.usable) {
                newHealth += item.healthToRestore;
            }
            newHealth = Math.min(newHealth, maxHP);
            var outKey = newHealth + '|' + (newItemUsed ? '1' : '0');
            out[outKey] = (out[outKey] || 0) + hpProb * prob;
        }
    }
    return out;
}

function rcTranslateToOnlyHealth(hd) {
    var r = {};
    for (var key in hd) {
        var h = parseInt(key.split('|')[0], 10);
        r[h] = (r[h] || 0) + hd[key];
    }
    return r;
}

function rcCalculateDistributions(moves, currentHP, maxHP, itemId, existingHealthDist) {
    var dmgDist = { 0: 1.0 };
    var healthDist = {};
    if (existingHealthDist) {
        for (var k in existingHealthDist) healthDist[k + '|0'] = existingHealthDist[k];
    } else {
        healthDist[currentHP + '|0'] = 1.0;
    }
    var item = rcGetItemById(itemId, maxHP);
    for (var i = 0; i < moves.length; i++) {
        var md = rcMoveDist(moves[i]);
        dmgDist = rcCombineDists(dmgDist, md);
        healthDist = rcCombineHealthDists(healthDist, md, Math.trunc(maxHP / 2), item, maxHP);
        // Cap at max HP
        var capped = {};
        for (var hk in healthDist) {
            var parts = hk.split('|');
            var h = Math.min(parseInt(parts[0], 10), maxHP);
            capped[h + '|' + parts[1]] = (capped[h + '|' + parts[1]] || 0) + healthDist[hk];
        }
        healthDist = capped;
    }
    return { damage: dmgDist, health: rcTranslateToOnlyHealth(healthDist) };
}

function rcRenderDistribution(healthDist, maxHP) {
    var $chart = $('#range-chart');
    $chart.empty();

    if (!healthDist || Object.keys(healthDist).length === 0) return;

    // Fill missing keys for nice display
    var keys = Object.keys(healthDist).map(function (k) { return parseInt(k, 10); });
    var min = Math.min.apply(null, keys);
    var max = Math.max.apply(null, keys);
    for (var i = min; i <= max; i++) if (healthDist[i] == null) healthDist[i] = 0;

    // Normalize to percentage and store for range comparator
    var total = 0; for (var k in healthDist) total += healthDist[k];
    RangeCompare.lastHealthDist = $.extend(true, {}, healthDist);
    RangeCompare.lastTotal = total;
    var $container = $('<div class="rc-dist"></div>');
    for (var h = min; h <= max; h++) {
        var p = (healthDist[h] || 0) / (total || 1);
        var bar = $('<div class="rc-bar" title="' + h + ' HP: ' + (p * 100).toFixed(3) + '%"></div>');
        bar.css({
            display: 'inline-block',
            width: '3px',
            height: Math.max(2, Math.round(p * 160)) + 'px',
            marginRight: '1px',
            background: '#66bb6a',
            verticalAlign: 'bottom'
        });
        $container.append(bar);
    }
    var $xlab = $('<div style="margin-top:4px; font-size:12px;">Health Remaining (' + min + ' to ' + max + ')</div>');
    $chart.append($container).append($xlab);
    ensureRangeCompareUI();
}

function ensureRangeCompareUI() {
    var $meters = $('#range-meters');
    if ($meters.find('.rc-range-ui').length) return;
    var html = [
        '<div class="rc-range-ui" style="margin-top:10px;">',
        '  <div><b>Compare HP Against</b></div>',
        '  <input id="rc-range-hp" type="number" style="width:80px;" value="' + (RangeCompare.rangeHPVal || 0) + '">',
        '  <select id="rc-range-op">',
        '    <option value="<="><=</option>',
        '    <option value=">=">>=</option>',
        '    <option value="<"><</option>',
        '    <option value=">">></option>',
        '    <option value="=">=</option>',
        '  </select>',
        '  <button id="rc-range-submit" class="btn btn-small">Submit</button>',
        '  <div id="rc-range-result" style="margin-top:6px;"></div>',
        '</div>'
    ].join('');
    $meters.append(html);
    $('#rc-range-op').val(RangeCompare.rangeComparator || '<=');
}

function rcComputeRangeProbability(dist, total, op, hp) {
    if (!dist || total == null) return 0;
    var sum = 0;
    for (var k in dist) {
        var h = parseInt(k, 10);
        if (op === '=') { if (h === hp) sum += dist[k]; }
        else if (op === '<') { if (h < hp) sum += dist[k]; }
        else if (op === '<=') { if (h <= hp) sum += dist[k]; }
        else if (op === '>') { if (h > hp) sum += dist[k]; }
        else if (op === '>=') { if (h >= hp) sum += dist[k]; }
    }
    return sum / (total || 1);
}

function rcRenderMeters(healthDist) {
    var $meters = $('#range-meters');
    if ($meters.find('.rc-range-ui').length === 0) $meters.empty(); else $meters.find('> :not(.rc-range-ui)').remove();
    if (!healthDist) return;
    var total = 0; for (var k in healthDist) total += healthDist[k];
    var kill = healthDist[0] || 0;
    var survival = 1 - (kill / (total || 1));
    var $sur = $('<div><b>Survival chance:</b> ' + (survival * 100).toFixed(3) + '%</div>');
    $meters.prepend($sur);
}
function endSelectingTarget() {
    $('body').removeClass('rc-selecting-target');
    $('.trainer-pok, .trainer-pok-opposing').removeClass('rc-selectable');
    $(document).off('click.rcTargetPick');
}

function startSelectingTarget() {
    $('body').addClass('rc-selecting-target');
    $('.trainer-pok, .trainer-pok-opposing').addClass('rc-selectable');
    // Delegate so it works for dynamically loaded sprites
    $(document).on('click.rcTargetPick', '.trainer-pok, .trainer-pok-opposing', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var $img = $(this);
        var id = $img.data('id');
        if (!id) {
            endSelectingTarget();
            return;
        }
        RangeCompare.targetId = id;
        RangeCompare.targetSide = $img.hasClass('left-side') ? 'PLAYER' : 'OPPONENT';
        $('#targetSpr').attr('src', $img.attr('src'));
        // Update side label (2nd label within #range-target)
        $('#range-target label').eq(1).text(RangeCompare.targetSide);
        updateRangeTargetInfo();
        // Prefill HP controls from target
        try {
            var def = createPokemon(RangeCompare.targetId);
            RangeCompare.maxHP = def.maxHP();
            RangeCompare.currentHP = def.maxHP();
            ensureTargetControls();
        } catch (e) {}
        endSelectingTarget();
    });
}

function addSelectedMoveToRange(side, moveIndex) {
    if (!RangeCompare.targetId) {
        // visual nudge to select a target first
        $('#range-target').addClass('rc-need-target');
        setTimeout(function () { $('#range-target').removeClass('rc-need-target'); }, 600);
        return;
    }

    var attackerInfo = side === 'L' ? $('#p1') : $('#p2');
    var attacker = createPokemon(attackerInfo);
    var move = attacker.moves[moveIndex];

    var entry = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        label: attacker.name + ' ' + move.name,
        side: side,
        color: side === 'L' ? '#4caf50' : '#ef5350',
        moveIdx: moveIndex,
        targetId: RangeCompare.targetId
    };

    // Prefill damage/crit rolls from calc engine and defaults
    prefillEntryFromCalc(entry);

    RangeCompare.moves = RangeCompare.moves || [];
    RangeCompare.moves.push(entry);
    renderRangeForm();
}

function recalcEntry(entry) {
    try {
        var attackerInfo = entry.side === 'L' ? $('#p1') : $('#p2');
        var attacker = createPokemon(attackerInfo);
        var field = createField();
        if (entry.side === 'R' && typeof field.clone === 'function') {
            field = field.clone().swap();
        }
        var move = attacker.moves[entry.moveIdx];
        var defender = createPokemon(entry.targetId);
        var result = calc.calculate(gen, attacker, defender, move, field);
        var hits = move.hits || 1;
        var minMax = result.range();
        var minDmg = minMax[0] * hits;
        var maxDmg = minMax[1] * hits;
        entry.minPct = Math.floor(minDmg * 1000 / defender.maxHP()) / 10;
        entry.maxPct = Math.floor(maxDmg * 1000 / defender.maxHP()) / 10;
        entry.label = attacker.name + ' ' + move.name;
    } catch (e) {
        // If anything fails, mark as 0
        entry.minPct = 0;
        entry.maxPct = 0;
    }
}

function recalcAllEntries() {
    if (!RangeCompare.moves || RangeCompare.moves.length === 0) return;
    RangeCompare.moves.forEach(function (m) { recalcEntry(m); });
}

function renderRangeChart() {
    var $list = $('#range-moves');
    var $chart = $('#range-chart');
    $list.empty();
    $chart.empty();

    if (!RangeCompare.moves || RangeCompare.moves.length === 0) return;

    RangeCompare.moves.forEach(function (m) {
        // Moves list pill
        var $pill = $('<div class="rc-move-pill"></div>')
            .attr('data-id', m.id)
            .append($('<span class="rc-pill-text"></span>').text(m.label))
            .append($('<span class="rc-x rc-remove" title="Remove">×</span>'));
        $list.append($pill);

        // Chart row with min-max segment
        var $row = $('<div class="rc-row"></div>')
        var $label = $('<div class="rc-label"></div>').text(m.label);
        var $track = $('<div class="rc-track"><div class="rc-segment"></div></div>');
        var left = Math.max(0, Math.min(100, m.minPct));
        var width = Math.max(0, Math.min(100, m.maxPct)) - left;
        $track.find('.rc-segment').css({
            left: left + '%',
            width: Math.max(1, width) + '%',
            background: m.color
        }).attr('title', m.minPct + '% - ' + m.maxPct + '%');
        var $pct = $('<div class="rc-pct"></div>').text(m.minPct + '% - ' + m.maxPct + '%');
        $row.append($label, $track, $pct);
        $chart.append($row);
    });
}

function updateRangeTargetInfo() {
    if (!RangeCompare.targetId) return;
    try {
        var def = createPokemon(RangeCompare.targetId);
        var hpInfo = 'HP: ' + def.maxHP();
        var itemInfo = def.item ? (' | Item: ' + def.item) : '';
        // Ensure info container exists
        var $info = $('#range-target .rc-target-info');
        if ($info.length === 0) {
            $info = $('<span class="rc-target-info"></span>')
            $('#range-target').append($info);
        }
        $info.text(hpInfo + itemInfo);
    } catch (e) {
        // noop
    }
}

// Initialize behaviors
$(function () {
    ensureAddButtons();
    ensureTargetControls();

    // Toggle target selection mode by clicking the target area
    $('#range-target').on('click', function () {
        if ($('body').hasClass('rc-selecting-target')) {
            endSelectingTarget();
        } else {
            startSelectingTarget();
        }
    });

    // React to Add Move Mode toggle
    $('#range-addMove').on('change click', function () {
        ensureAddButtons();
    });

    // Handle clicking on any + button to add move
    $(document).on('click', '.addRangeBtn', function (ev) {
        ev.preventDefault();
        if (!$('#range-addMove').is(':checked')) return;
        var side = $(this).data('side');
        var idx = parseInt($(this).data('idx'), 10);
        if (!side || isNaN(idx)) return;
        addSelectedMoveToRange(side, idx - 1);
    });

    // Remove a single move (from form row)
    $(document).on('click', '.rc-remove', function (ev) {
        ev.preventDefault();
        var id = $(this).closest('.rc-move-row').data('id');
        RangeCompare.moves = (RangeCompare.moves || []).filter(function (m) { return m.id !== id; });
        renderRangeForm();
    });
    // Remove via pill (min-max list) if shown
    $(document).on('click', '.rc-move-pill .rc-remove', function (ev) {
        ev.preventDefault();
        var id = $(this).closest('.rc-move-pill').data('id');
        RangeCompare.moves = (RangeCompare.moves || []).filter(function (m) { return m.id !== id; });
        renderRangeForm();
        renderRangeChart();
    });

    // Inject Clear All button if not present
    if ($('#range-move-options .rc-clear-all').length === 0) {
        $('#range-move-options').append('<button class="rc-clear-all" title="Clear all Range Compare entries">Clear</button>');
    }
    $(document).on('click', '.rc-clear-all', function () {
        RangeCompare.moves = [];
        renderRangeForm();
        $('#range-chart').empty();
        $('#range-meters').empty();
    });

    // Recalculate on calc-trigger changes
    $(document).on('change keyup', '.calc-trigger, .notation', function () {
        recalcAllEntries();
    });

    // Button: Calc -> simulate and render distribution
    $(document).on('click', '#rc-calc', function () {
        RangeCompare.currentHP = parseInt($('#rc-currentHP').val() || '0', 10);
        RangeCompare.maxHP = parseInt($('#rc-maxHP').val() || '1', 10);
        RangeCompare.itemId = parseInt($('#rc-item').val() || '0', 10);
        // Persist moves' editable strings to entries
        syncFormToEntries();
        var out = rcCalculateDistributions(RangeCompare.moves, RangeCompare.currentHP, RangeCompare.maxHP, RangeCompare.itemId, null);
        rcRenderDistribution(out.health, RangeCompare.maxHP);
        rcRenderMeters(out.health);
    });

    // Form events: update entries on change
    $(document).on('input change', '.rc-dmg-rolls, .rc-crit-rolls, .rc-crit-rate, .rc-crit-toggle', function () {
        syncFormToEntries();
    });

    // Range comparator submit
    $(document).on('click', '#rc-range-submit', function () {
        RangeCompare.rangeHPVal = parseInt($('#rc-range-hp').val() || '0', 10);
        RangeCompare.rangeComparator = $('#rc-range-op').val();
        var p = rcComputeRangeProbability(RangeCompare.lastHealthDist, RangeCompare.lastTotal, RangeCompare.rangeComparator, RangeCompare.rangeHPVal);
        $('#rc-range-result').html('<b>Chance:</b> ' + (p * 100).toFixed(3) + '%');
    });
});

function syncFormToEntries() {
    // Reads the form under #range-moves and writes back to RangeCompare.moves
    $('#range-moves .rc-move-row').each(function () {
        var id = $(this).data('id');
        var entry = (RangeCompare.moves || []).find(function (m) { return m.id === id; });
        if (!entry) return;
        var dmgStr = $(this).find('.rc-dmg-rolls').val();
        var critOn = $(this).find('.rc-crit-toggle').is(':checked');
        var critStr = $(this).find('.rc-crit-rolls').val();
        var rateStr = $(this).find('.rc-crit-rate').val();
        entry.damageRollsStr = dmgStr;
        entry.damageRolls = rcListFromDamageRollString(dmgStr);
        entry.critRollsStr = critOn ? critStr : '';
        entry.critRolls = critOn ? rcListFromDamageRollString(critStr) : [];
        entry.critRateStr = critOn ? rateStr : '';
        entry.critRate = critOn ? rcGetFractionFloat(rateStr) : 0;
    });
}