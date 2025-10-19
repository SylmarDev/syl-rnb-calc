/* eslint-disable no-undef */
/* eslint-disable radix */
// Global state for Range Compare
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
	rangeComparator: "<=",
    chart: null
};

LINEBREAK_REGEX = '(\r\n|\r|\n)';


var highCritRatioMoveNames = [
	"Aeroblast", "Air Cutter", "Attack Order",
	"Blaze Kick", "Crabhammer", "Cross Chop", "Cross Poison", "Drill Run",
	"Karate Chop", "Leaf Blade", "Night Slash", "Poison Tail", "Psycho Cut",
	"Razor Leaf", "Razor Wind", "Shadow Claw", "Sky Attack", "Slash",
	"Spacial Rend", "Stone Edge"
];

var critBlockingAbilities = [
	"Shell Armor", "Battle Armor", "Magma Armor"
]

var highCritRatioItems = [
	"Razor Claw", "Scope Lens"
]

function strMatch(s, ...matches) {
	var match = false;
	matches.forEach(function(m) {
		if (s == m) { match = true; }
	});
	return match;
}

function getCritRate(attacker, defender, aField, dField, moveIndex) {
	if (strMatch(defender.ability, ...critBlockingAbilities) ||
		(dField.isLuckyChant ?? false)) { console.log("returning 0"); return 0; }

	stages = [0.0625, 0.125, 0.5, 1];

	boosts = 0;

	if (strMatch(attacker.moves[moveIndex].originalName, ...highCritRatioMoveNames)) {
		boosts++;
	}

	if (strMatch(attacker.item, ...highCritRatioItems)) { boosts++; }
	if (strMatch(attacker.ability, "Super Luck")) { boosts++; }
	if (attacker.name.includes("fetch'd") && 
		(attacker.item == "Leek" || attacker.item == "Stick")) { boosts += 2; }
	if (attacker.name == "Chansey" && attacker.item == "Lucky Punch") { boosts += 2; }
	if (aField.isFocusEnergy) { boosts += 2; }

	boosts = Math.min(boosts, stages.length-1);
	
	// console.log(`returning ${stages[boosts]}`);
	return stages[boosts];
}


function removeAllOccurrences(str, substring) {
	if (!substring) return str;
	return str.split(substring).join('');
  }

// Ensure "+" buttons exist for all 8 moves and reflect Add Move Mode state
function ensureAddButtons() {
	function btnHtml(side, i) {
		var id = 'range' + side + i;
		return removeAllOccurrences(`
		<button type="button" class="btn-range-add" id='${id}' data-side='${side}' data-idx='${i}' title="Add to Range Compare">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16" style="--darkreader-inline-fill: currentColor;" data-darkreader-inline-fill="">
				<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"></path>
			</svg>
        </button>
		`, LINEBREAK_REGEX);
	}
	for (var i = 1; i <= 4; i++) {
		// left
		var $lRow = $('#resultMoveL' + i).closest('div');
		if ($lRow.length) {
			var $btnL = $lRow.find('.btn-range-add');
			
			if ($btnL.length === 0) {
				$(btnHtml('L', i)).insertAfter($lRow.find('label.btn').last());
			} else {
				$btnL.replaceWith(btnHtml('L', i));
			}
		}
		// right
		var $rRow = $('#resultMoveR' + i).closest('div');
		if ($rRow.length) {
			var $btnR = $rRow.find('.btn-range-add');
			if ($btnR.length === 0) {
				$(btnHtml('R', i)).insertBefore($rRow.find('span.resultDamageR').first());
			} else {
				$btnR.replaceWith(btnHtml('R', i));
			}
		}
	}
	var show = $('#range-addMove').is(':checked');
	$('.btn-range-add').css('display', show ? 'inline-flex' : 'none');
	if (!show) {
		$('.btn-range-add').addClass('disabled');
	} else {
		$('.btn-range-add').removeClass('disabled');
	}
}

// Ensure HP/item controls are present and prefilled
function ensureTargetControls() {
	var $t = $('#range-target');
	if ($t.find('.rc-hp-inputs').length === 0) {
		var hpHtml = [
			'<div class="rc-hp-inputs">',
			'  <input type="number" class="numbersOnly" id="rc-currentHP" min="0" value="""/>',
			'  <span>/</span>',
			'  <input type="number" id="rc-maxHP" class="numbersOnly" min="1" value=""" readonly/>',
			'  <select id="rc-item">',
			'    <option value="0">None</option>',
			'    <option value="1">Oran Berry</option>',
			'    <option value="2">Sitrus Berry</option>',
			'    <option value="3">Leftovers</option>',
			'  </select>',
			'  <button id="rc-calc" class="btn-range-compare-body" title="Calc HP distribution">Calc</button>',
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
		entry.critRate = entry.critRate || (1 / 16);
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
		// probably pointless
		if (Array.isArray(dmg[0])) {
			console.log("per roll array entered"); // I don't think this ever gets hit...
			// Sum per-roll arrays (e.g.)
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

function rcListFromDamageRollString(str) {
	if (!str) return [];
	str = String(str).replace(/[()\s]/g, '');
	if (!str) return [];
	return str.split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return !isNaN(n); });
}

// can probably be refactored away
function rcGetFractionFloat(frac) {
	if (!frac) return 1 / 16;
	if (typeof frac === 'number') return frac;
	var parts = String(frac).split('/');
	var num = parseInt(parts[0], 10);
	var den = parseInt(parts[1], 10);
	if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
	return 1 / 16;
}

function rcGetItemById(id, maxHP) {
	id = parseInt(id || 0, 10);
	if (id === 1) return {healthToRestore: 10, usable: true};
	if (id === 2) return {healthToRestore: Math.trunc(maxHP / 4), usable: true};
	if (id === 3) return {healthToRestore: Math.trunc(maxHP / 16), usable: false};
	return null;
}

function rcMoveDist(move) {
	var critRate = move.critRate ?? 0.0625;
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
	var dmgDist = {0: 1.0};
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
	return {damage: dmgDist, health: rcTranslateToOnlyHealth(healthDist)};
}

function rcRenderDistribution(healthDist, maxHP) {
	var $chart = $('#range-chart');
	$chart.empty();

	if (!healthDist || Object.keys(healthDist).length === 0) return;

	// Fill missing keys
	var keys = Object.keys(healthDist).map(function (k) { return parseInt(k, 10); });
	var min = Math.min.apply(null, keys);
	var max = Math.max.apply(null, keys);
	for (var i = min; i <= max; i++) if (healthDist[i] == null) healthDist[i] = 0;

	// Normalize to percentage and store for range comparator
	var total = 0; for (var k in healthDist) total += healthDist[k];
	RangeCompare.lastHealthDist = $.extend(true, {}, healthDist);
	RangeCompare.lastTotal = total;

	// TODO: make this print on debug logging?
	// console.log(healthDist);

	var ctx = document.getElementById('range-chart');
    if (RangeCompare.chart != null) {
        RangeCompare.chart.destroy();
    }

    var delayed;

	RangeCompare.chart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: Object.keys(healthDist),
			datasets: [{
				label: "%",
				data: Object.values(healthDist).map(n => n * 100),
				borderWidth: 1
			}]
		},
		options: {
			scales: {
				y: {
					beginAtZero: true
				}
			},
		}
	});

	ensureRangeCompareUI();
}

function ensureRangeCompareUI() {
	var $meters = $('#range-meters');
	if ($meters.find('.rc-range-ui').length) return;
	var html = [
		'<div class="rc-range-ui" style="margin-top:10px;">',
		'  <div><b>Compare HP Against</b></div>',
		'  <input id="rc-range-hp" class="numbersOnly" type="number" style="width:80px;" value="' + (RangeCompare.rangeHPVal || 0) + '">',
		'  <select id="rc-range-op">',
		'    <option value="<="><=</option>',
		'    <option value=">=">>=</option>',
		'    <option value="<"><</option>',
		'    <option value=">">></option>',
		'    <option value="=">=</option>',
		'  </select>',
		'  <button id="rc-range-submit" class="btn-range-compare-body">Submit</button>',
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

	// targets name
	var targetStr = RangeCompare.targetId && RangeCompare.targetId.split("(")[0] ?
		 RangeCompare.targetId.split("(")[0] :
		 "";

	var $sur = $(`<div><b>${targetStr}Survival Chance:</b> ${(survival * 100).toFixed(3)}%</div>`);
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
		// Prefill HP controls from target
		try {
			var def = createPokemon(RangeCompare.targetId);
			RangeCompare.maxHP = def.maxHP();
			RangeCompare.currentHP = def.maxHP();
			ensureTargetControls();
		} catch (e) {}
		endSelectingTarget();
		refreshMoveDisplays();
	});
}

var damageResults;
function addSelectedMoveToRange(side, moveIndex) {
	if (!RangeCompare.targetId) {
		// visual nudge to select a target first
		$('#range-target').addClass('rc-need-target');
		setTimeout(function () { $('#range-target').removeClass('rc-need-target'); }, 600);
		return;
	}

	var p1info = $("#p1");
	var p2info = $("#p2");
	var p1 = createPokemon(p1info);
	var p2 = createPokemon(p2info);
	var p1field = createField();
	var p2field = p1field.clone().swap();

	var isP1 = side === 'L' ? 0 : 1;

	damageResults = calculateAllMoves(gen, p1, p1field, p2, p2field);

	console.log(damageResults[isP1][moveIndex]);

	var entry = {
		id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
		side: side,
		color: side === 'L' ? '#4caf50' : '#ef5350',
		moveIdx: moveIndex,
		targetId: RangeCompare.targetId,
		move: damageResults[isP1][moveIndex],
		attacker: damageResults[isP1][moveIndex].attacker.name ?? "",
		moveName: damageResults[isP1][moveIndex].move.originalName ?? "",
		field: isP1 === 0 ? p1field : p2field
	};

	// console.log(entry); // TEMP

	// Prefill damage/crit rolls from calc engine and defaults
	prefillEntryFromCalc(entry);

	RangeCompare.moves = RangeCompare.moves || [];
	RangeCompare.moves.push(entry);
	createMoveDisplays();
}

function recalcEntry(entry) {
	try {
		// console.log(entry);
		var isP1 = entry.side === 'L' ? 0 : 1;
		var field = entry.field;
		var p2field = field.clone().swap();

		var attacker = entry.move.attacker;
		var defender = createPokemon(RangeCompare.targetId);

		var result = calculateAllMoves(gen, 
			attacker,
			field,
			defender, 
			p2field);

		entry.label = attacker.name + ' ' + move.name;
		
		entry.damageRolls = result[0][entry.moveIdx].damage;
		entry.critRolls = entry.damageRolls.map(function (n) {
			// additional multiplication for sniper
			if (attacker.ability === "Sniper") { n = Math.trunc(n * 1.5); }
			return Math.trunc(n * 1.5);
		});
		entry.critRate = getCritRate(attacker, defender, field, p2field, entry.moveIdx);
		console.log(entry);
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

function createMoveDisplays() {
	$("#range-moves").empty();

	var html = [];
	for (var i = 0; i < RangeCompare.moves.length; i++) {
		var move = RangeCompare.moves[i];
		var id = move.id;

		var attackerName = move.attacker  ?? "";
		var moveName = move.moveName.split(" ").map(x => x[0]).join("") ?? "";

		console.log(move);

		var minRoll = Math.min(...move.damageRolls);
		var maxRoll = Math.max(...move.damageRolls);
		var critMinRoll = Math.min(...move.critRolls);
		var critMaxRoll = Math.max(...move.critRolls);

		var moveHtml = `
			<div id="${id}" class="range-move" data-move-id="${id}">
				<div class="range-move-controls">
					<button id="copy${id}" class="range-copy-move btn-range-compare-body" title="Copy move">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
							<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
							<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
						</svg>
					</button>
					<button id="delete${id}" class="range-delete-move btn-range-compare-body" title="Delete move">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
							<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
						</svg>
					</button>
				</div>
				<div class="range-move-content">
					<span class="range-move-name">${attackerName} ${moveName}</span>
					<span class="range-move-damage">${minRoll}-${maxRoll}</span>
					<span class="range-move-crit critBold">${critMinRoll}-${critMaxRoll}</span>
				</div>
				<div class="range-move-navigation">
					<button id="left${id}" class="range-move-left btn-range-compare-body" title="Move left">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-chevron-left" viewBox="0 0 16 16">
							<path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
						</svg>
					</button>
					<button id="right${id}" class="range-move-right btn-range-compare-body" title="Move right">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16">
							<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
						</svg>
					</button>
				</div>
			</div>
		`
		html.push(removeAllOccurrences(moveHtml, LINEBREAK_REGEX))
	}

	$("#range-moves").append(html.join('\n'));
}

function refreshMoveDisplays() {
	recalcAllEntries();
	createMoveDisplays();
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
	$(document).on('click', '.btn-range-add', function (ev) {
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
	});

	// Remove a single move (from range-move display)
	$(document).on('click', '.range-delete-move', function (ev) {
		ev.preventDefault();
		var id = $(this).attr('id').replace('delete', '');
		RangeCompare.moves = (RangeCompare.moves || []).filter(function (m) { return m.id !== id; });
		createMoveDisplays();
	});

	// Copy a move
	$(document).on('click', '.range-copy-move', function (ev) {
		ev.preventDefault();
		var id = $(this).attr('id').replace('copy', '');
		var originalMove = RangeCompare.moves.find(function (m) { return m.id === id; });
		if (originalMove) {
			// Create a copy with a new ID
			var copiedMove = JSON.parse(JSON.stringify(originalMove));
			copiedMove.id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
			
			// Find the index of the original move and insert the copy after it
			var originalIndex = RangeCompare.moves.findIndex(function (m) { return m.id === id; });
			if (originalIndex !== -1) {
				// Insert the copy right after the original move
				RangeCompare.moves.splice(originalIndex + 1, 0, copiedMove);
				createMoveDisplays();
			}
		}
	});

	// Move left
	$(document).on('click', '.range-move-left', function (ev) {
		ev.preventDefault();
		var id = $(this).attr('id').replace('left', '');
		var currentIndex = RangeCompare.moves.findIndex(function (m) { return m.id === id; });
		if (currentIndex > 0) {
			// Swap with the previous move
			var temp = RangeCompare.moves[currentIndex];
			RangeCompare.moves[currentIndex] = RangeCompare.moves[currentIndex - 1];
			RangeCompare.moves[currentIndex - 1] = temp;
			createMoveDisplays();
		}
	});

	// Move right
	$(document).on('click', '.range-move-right', function (ev) {
		ev.preventDefault();
		var id = $(this).attr('id').replace('right', '');
		var currentIndex = RangeCompare.moves.findIndex(function (m) { return m.id === id; });
		if (currentIndex < RangeCompare.moves.length - 1) {
			// Swap with the next move
			var temp = RangeCompare.moves[currentIndex];
			RangeCompare.moves[currentIndex] = RangeCompare.moves[currentIndex + 1];
			RangeCompare.moves[currentIndex + 1] = temp;
			createMoveDisplays();
		}
	});

	// Inject Clear All button if not present
	if ($('#range-move-options .rc-clear-all').length === 0) {
		$('#range-move-options').append('<button class="rc-clear-all btn-range-compare-body" title="Clear all Range Compare entries">Clear</button>');
	}
	$(document).on('click', '.rc-clear-all', function () {
		RangeCompare.moves = [];
		$('#range-chart').empty();
		$('#range-meters').empty();
	});

	// Recalculate on calc-trigger changes
	$(document).on('change keyup', '.calc-trigger, .notation', function () {
		// recalcAllEntries();
	});

	// Button: Calc -> simulate and render distribution
	$(document).on('click', '#rc-calc', function () {
		RangeCompare.currentHP = parseInt($('#rc-currentHP').val() || '0', 10);
		RangeCompare.maxHP = parseInt($('#rc-maxHP').val() || '1', 10);
		RangeCompare.itemId = parseInt($('#rc-item').val() || '0', 10);
		// Persist moves' editable strings to entries
		syncFormToEntries();
		recalcAllEntries();

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

$('.numbersOnly').on('input', function() { 
    this.value = this.value.replace(/[^0-9]/g, '');
});