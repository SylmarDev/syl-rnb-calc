var HALF_HEAL_MOVES = [
	'Recover', 'Roost', 'Slack Off', 'Soft-Boiled', 'Milk Drink', 'Heal Order',
	'Shore Up', 'Lunar Blessing', 'Life Dew', 'Take Heart',
	'Moonlight', 'Morning Sun', 'Synthesis'
];

var toxicState = {
	p1: { key: null, n: 0 },
	p2: { key: null, n: 0 }
};

function getHpActionAmount(max, numerator, denominator) {
	var amount = Math.floor(max * Math.abs(numerator) / denominator);
	if (amount < 1 && max > 0) {
		amount = 1;
	}
	return numerator < 0 ? -amount : amount;
}

function getSlotMovesets(side) {
	var moveNames = [];
	$("#" + side + " div.move-selector a.select2-choice span.select2-chosen").each(function () {
		moveNames.push($(this).text());
	});
	return moveNames;
}

// Max HP of a set ("Name (Setname)") resolved from setdex
function setdexMaxHP(dataId) {
	var name = dataId.substring(0, dataId.indexOf(" ("));
	var setName = dataId.substring(dataId.indexOf("(") + 1, dataId.lastIndexOf(")"));
	var set = name in setdex ? setdex[name][setName] : undefined;
	if (!set || set.moves.indexOf('Wish') === -1) {
		return null;
	}
	var base = pokedex[name] && pokedex[name].bs.hp;
	if (!base) {
		return null;
	}
	var ivs = set.ivs && typeof set.ivs.hp !== 'undefined' ? set.ivs.hp : 31;
	var evs = set.evs && set.evs.hp ? set.evs.hp : 0;
	return calc.calcStat(gen, 'hp', base, ivs, evs, set.level || 100);
}

// Teammates on the slot's own side with Wish -> truncated 1/2 of their max HP
// L-side sees left team + box lists, R-side opposing roster only.
function wishTeammateMaxHP(side) {
	var maxes = [];
	if (side === 'p1') {
		$('#team-poke-list img, #box-poke-list img, #box-poke-list2 img').each(function () {
			var hp = setdexMaxHP($(this).attr("data-id") || "");
			if (hp) {
				maxes.push(hp);
			}
		});
	} else {
		$('#opp-trainer-mons img.trainer-pok.right-side').each(function () {
			var hp = setdexMaxHP($(this).attr("data-id") || "");
			if (hp) {
				maxes.push(hp);
			}
		});
	}
	return maxes.length ? Math.max.apply(null, maxes) : null;
}

function healSource(side) {
	var moves = getSlotMovesets(side);
	for (var i = 0; i < moves.length; i++) {
		if (HALF_HEAL_MOVES.indexOf(moves[i]) >= 0) {
			return { kind: 'move', moveName: moves[i] };
		}
	}
	var wishMax = wishTeammateMaxHP(side);
	if (wishMax) {
		return { kind: 'wish', wishMax: wishMax };
	}
	return null;
}

function monKey(side) {
	return ($("#" + side + " input.set-selector").val() || "") + "|" + ($("#" + side + " .forme").val() || "");
}

function getToxicTick(side) {
	var t = toxicState[side];
	var key = monKey(side);
	if (t.key !== key) {
		t.key = key;
		t.n = 0;
	}
	return t.n;
}

function labelMode() {
	var mode = $("input[name='hpActionLabelMode']:checked").val();
	return mode === undefined ? 'images' : mode;
}

function buildActionButtons(side) {
	var max = Number($("#" + side + " .max-hp").text());
	var mode = labelMode();
	var box = [];

	var heal = healSource(side);
	if (heal) {
		var healAmount = heal.kind === 'move'
			? getHpActionAmount(max, 1, 2)
			: getHpActionAmount(heal.wishMax, 1, 2);
		var healName = heal.kind === 'move' ? heal.moveName : 'Wish';
		var healLabel = mode === 'images' ? '+' + healAmount : (mode === 'numbers' ? '+1/2' : healName);
		box.push('<button type="button" class="hp-action hp-heal" data-kind="heal" title="' + healName + ' (+' + healAmount + ' HP)">'
			+ healLabel + '</button>');
	}

	var ITEMS = [
		{ kind: 'sitrus', num: 1, den: 4, text: 'Sitrus', numbers: '+1/4', img: 'img/sitrus_berry.png' },
		{ kind: 'leftovers', num: 1, den: 16, text: 'Leftovers', numbers: '+1/16', img: 'img/leftovers.png' },
		{ kind: 'brn', num: -1, den: 16, text: 'Burn', numbers: '-1/16', img: '', crop: 'brn' },
		{ kind: 'psn', num: -1, den: 8, text: 'Poison', numbers: '-1/8', img: '', crop: 'psn' }
	];
	for (var i = 0; i < ITEMS.length; i++) {
		var d = ITEMS[i];
		var amount = getHpActionAmount(max, d.num, d.den);
		var sign = amount < 0 ? '' : '+';
		var inner;
		if (mode === 'images') {
			inner = d.img
				? '<img src="' + d.img + '" width="12" height="12" alt="" />'
				: '<i class="status-icon ' + d.crop + '" title="' + d.text + ' (-' + Math.abs(amount) + ' HP)"></i>';
		} else {
			inner = mode === 'numbers' ? d.numbers : d.text;
		}
		box.push('<button type="button" class="hp-action ' + (d.num < 0 ? 'hp-dmg' : 'hp-heal') + '"'
			+ ' data-num="' + d.num + '" data-den="' + d.den + '" data-kind="' + d.kind + '"'
			+ ' title="' + d.text + ' (' + sign + amount + ' HP)">' + inner + '</button>');
	}

	// Toxic — escalating ×n
	var tick = getToxicTick(side);
	var next = Math.min(tick + 1, 15);
	var toxAmount = getHpActionAmount(max, -next, 16);
	var toxLabel = mode === 'images' ? 'Toxic' : 'Toxic ' + next + '/16';
	var toxInner = mode === 'images'
		? '<i class="status-icon tox"></i>'
		: 'Toxic ' + next + '/16';
	box.push('<button type="button" class="hp-action hp-dmg" data-kind="toxic" title="' + toxLabel + ' (' + toxAmount + ' HP, ' + next + '/16 max HP)">'
		+ toxInner + '</button>');

	return box;
}

function drawHpActions() {
	$('#p1, #p2').each(function () {
		var fieldset = $(this);
		var side = fieldset.prop("id");
		var target = fieldset.find(".percent-hp").first();
		var box = fieldset.find(".hp-actions").first();
		if (!box.length) {
			box = $('<div class="hp-actions" aria-label="Apply HP tick or heal"></div>');
			target.after(box);
		}
		box.html(buildActionButtons(side));
	});
}

var refreshTimer = null;
function scheduleHpActions() {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
	}
	refreshTimer = setTimeout(function () {
		refreshTimer = null;
		drawHpActions();
	}, 0);
}

$(function () {
	if (!$("#p1").length) {
		return;
	}
	drawHpActions();

	// rerender on any calc-trigger change in either slot (moves, set, forme, level, evs, item)
	$(document).on('change', '#p1, #p2', scheduleHpActions);
	// team/box membership changes affect Wish gating
	$(document).on('click', '.trainer-pok', scheduleHpActions);
	$(document).on('drop', '.box-poke', scheduleHpActions);

	// display toggle (bottom of page)
	$('#enableHpActions, input[name="hpActionLabelMode"]').on('change', function () {
		var enabled = $('#enableHpActions').is(':checked');
		$('body').toggleClass('hide-hp-actions', !enabled);
		$('#hpActionModeGroup').toggle(enabled);
		drawHpActions();
	});
	$('#hpActionModeGroup').toggle($('#enableHpActions').is(':checked'));
});

$(document).on('click', '.hp-action', function () {
	var fieldset = $(this).closest(".poke-info");
	var side = fieldset.prop("id");
	var max = Number(fieldset.find(".max-hp").text());
	var currentHP = fieldset.find(".current-hp");

	if (!max || !currentHP.length) {
		return;
	}

	var kind = $(this).attr("data-kind");
	var amount;
	if (kind === 'toxic') {
		var tick = Math.min(getToxicTick(side) + 1, 15);
		amount = getHpActionAmount(max, -tick, 16);
		toxicState[side].n = tick;
	} else if (kind === 'heal') {
		var source = healSource(side);
		if (!source) {
			return;
		}
		amount = source.kind === 'move'
			? getHpActionAmount(max, 1, 2)
			: getHpActionAmount(source.wishMax, 1, 2);
	} else {
		amount = getHpActionAmount(max, Number($(this).attr("data-num")), Number($(this).attr("data-den")));
	}

	currentHP.val(Math.min(max, Math.max(0, Number(currentHP.val()) + amount)));
	currentHP.keyup();
});
