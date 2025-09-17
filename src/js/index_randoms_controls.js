$("#p2 .ability").bind("keyup change", function () {
	autosetWeather($(this).val(), 1);
	autosetTerrain($(this).val(), 1);
});

$("#p2 .item").bind("keyup change", function () {
	autosetStatus("#p2", $(this).val());
});

lastManualStatus["#p2"] = "Healthy";
lastAutoStatus["#p1"] = "Healthy";

var resultLocations = [[], []];
for (var i = 0; i < 4; i++) {
	resultLocations[0].push({
		"move": "#resultMoveL" + (i + 1),
		"damage": "#resultDamageL" + (i + 1),
		"moveRate": null
	});
	resultLocations[1].push({
		"move": "#resultMoveR" + (i + 1),
		"damage": "#resultDamageR" + (i + 1),
		"moveRate": "#resultMoveRateR" + (i + 1)
	});
}

// create object for all ai options
function createAiOptionsDict() {
	var dict = {};
	$("#aiOptions :input").each(function () {
		var id = $(this).attr('id');
		if (id) {
			dict[id] = $(this).is(":checked");
		}
	});

	// Include any checkboxes in the credits section of index.template.html
	$(".credits input[type='checkbox']").each(function () {
		var id = $(this).attr('id');
		if (id) {
			dict[id] = $(this).is(":checked");
		}
	});
	
	// console.log(dict); // DEBUG
	return dict;
}

// AI Options persistence helpers
var AI_OPTIONS_STORAGE_KEY = 'aiOptionsDict';

function saveAiOptionsToStorage() {
	try {
		localStorage.setItem(AI_OPTIONS_STORAGE_KEY, JSON.stringify(createAiOptionsDict()));
	} catch (e) {
		// localStorage may be unavailable (privacy mode) – ignore persist errors
	}
}

function loadAiOptionsFromStorage() {
	try {
		var raw = localStorage.getItem(AI_OPTIONS_STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (e) {
		return null;
	}
}

function applyAiOptionsDict(dict, triggerChange) {
	if (!dict) return;
	var prevNoCalc = window.NO_CALC;
	window.NO_CALC = true;
	$("#aiOptions :input").each(function () {
		var id = $(this).attr('id');
		if (dict.hasOwnProperty(id)) {
			$(this).prop('checked', !!dict[id]);
			if (triggerChange) $(this).change();
		}
	});
	// Apply any checkboxes in the credits section of index.template.html
	$(".credits input[type='checkbox']").each(function () {
		var id = $(this).attr('id');
		if (id && dict.hasOwnProperty(id)) {
			$(this).prop('checked', !!dict[id]);
			if (triggerChange) $(this).change();
		}
	});
	window.NO_CALC = prevNoCalc;
}

function initAiOptionsPersistence() {
	var stored = loadAiOptionsFromStorage();
	if (stored) {
		applyAiOptionsDict(stored, false);
	} else {
		// Persist the current defaults so we have an initial value
		saveAiOptionsToStorage();
	}

	// Keep storage in sync on any checkbox change within AI options or in the credits section (index.template.html)
	$("#aiOptions :input, .credits input[type='checkbox']").on('change', function () {
		saveAiOptionsToStorage();
	});
}

function showAIPercentages() {
	// show percentages
	$(".resultMoveRateR").each(function () {
		$(this).show();
	});

	// return widths to 60-40%
	$("#move-result-subgroupL").attr("class", "move-result-subgroupL");
	$("#move-result-subgroupR").attr("class", "move-result-subgroupR");
}

function hideAiPercentages() {
	// hide percentages
	$(".resultMoveRateR").each(function () {
		$(this).hide();
	});

	// return widths to 50%
	$("#move-result-subgroupL").attr("class", "move-result-subgroup-aiPercentageless");
	$("#move-result-subgroupR").attr("class", "move-result-subgroup-aiPercentageless");
}

var damageResults;
function performCalculations() {
	// console.log("perform calcs called"); // DEBUG
	var p1info = $("#p1");
	var p2info = $("#p2");
	var p1 = createPokemon(p1info);
	var p2 = createPokemon(p2info);
	var p1field = createField();
	var p2field = p1field.clone().swap();

	damageResults = calculateAllMoves(gen, p1, p1field, p2, p2field);
	p1 = damageResults[0][0].attacker;
	p2 = damageResults[1][0].attacker;
	var battling = [p1, p2];
	p1.maxDamages = [];
	p2.maxDamages = [];
	p1info.find(".sp .totalMod").text(p1.stats.spe);
	p2info.find(".sp .totalMod").text(p2.stats.spe);
	var fastestSide = p1.stats.spe > p2.stats.spe ? 0 : 1;

	var result, maxDamage;
	var bestResult;
	var zProtectAlerted = false;
	for (var i = 0; i < 4; i++) {
		// P1
		result = damageResults[0][i];
		maxDamage = result.range()[1] * p1.moves[i].hits;
		if (!zProtectAlerted && maxDamage > 0 && p1.item.indexOf(" Z") === -1 && p1field.defenderSide.isProtected && p1.moves[i].isZ) {
			alert('Although only possible while hacking, Z-Moves fully damage through protect without a Z-Crystal');
			zProtectAlerted = true;
		}
		p1.maxDamages.push({moveOrder: i, maxDamage: maxDamage});
		p1.maxDamages.sort(function (firstMove, secondMove) {
			return secondMove.maxDamage - firstMove.maxDamage;
		});
		$(resultLocations[0][i].move + " + label").text(p1.moves[i].name.replace("Hidden Power", "HP"));
		$(resultLocations[0][i].damage).text(result.moveDesc(notation));

		// P2
		result = damageResults[1][i];
		maxDamage = result.range()[1] * p2.moves[i].hits;
		if (!zProtectAlerted && maxDamage > 0 && p2.item.indexOf(" Z") === -1 && p2field.defenderSide.isProtected && p2.moves[i].isZ) {
			alert('Although only possible while hacking, Z-Moves fully damage through protect without a Z-Crystal');
			zProtectAlerted = true;
		}
		p2.maxDamages.push({moveOrder: i, maxDamage: maxDamage});
		p2.maxDamages.sort(function (firstMove, secondMove) {
			return secondMove.maxDamage - firstMove.maxDamage;
		});
		$(resultLocations[1][i].move + " + label").text(p2.moves[i].name.replace("Hidden Power", "HP"));
		//console.log(result); // debug
		$(resultLocations[1][i].damage).text(result.moveDesc(notation));
		//$(resultLocations[1][i].moveRate).text(result.moveRate(notation)); // TODO: one day....

		// BOTH
		var bestMove;
		if (fastestSide === "tie") {
			// Technically the order should be random in a speed tie, but this non-determinism makes manual testing more difficult.
			// battling.sort(function () { return 0.5 - Math.random(); });
			bestMove = battling[1].maxDamages[0].moveOrder;
			var chosenPokemon = battling[1] === p1 ? "0" : "1";
			bestResult = $(resultLocations[chosenPokemon][bestMove].move);
		} else {
			bestMove = battling[fastestSide].maxDamages[0].moveOrder;
			bestResult = $(resultLocations[fastestSide][bestMove].move);
		}
	}

	var aiOptions = createAiOptionsDict();
	var runAIPercentageCode = !($("#disableAiMovePercentage").is(":checked"));

	if (runAIPercentageCode) {
		var moveRates = calc.generateMoveDist(damageResults, fastestSide, aiOptions);

		for (var i = 0; i < moveRates.length; i++) {
			$("#resultMoveRateR" + (i + 1)).text((moveRates[i] * 100).toFixed(2) + "%");
		}
	}

	if ($('.locked-move').length) {
		bestResult = $('.locked-move');
	} else {
		stickyMoves.setSelectedMove(bestResult.prop("id"));
	}

	bestResult.prop("checked", true);
	bestResult.change();
	$("#resultHeaderL").text(p1.name + "'s Moves (select one to show detailed results)");
	$("#resultHeaderR").text(p2.name + "'s Moves (select one to show detailed results)");
}

// calc colors
function calculationsColors(p1info, p2) {
	if (!p2) {
		var p2info = $("#p2");
		var p2 = createPokemon(p2info);
	}
	var p1 = createPokemon(p1info);
	var p1field = createField();
	var p2field = p1field.clone().swap();

	damageResults = calculateAllMoves(gen, p1, p1field, p2, p2field);
	p1 = damageResults[0][0].attacker;
	p2 = damageResults[1][0].attacker;
	p1.maxDamages = [];
	p2.maxDamages = [];
	var p1s = p1.stats.spe;
	var p2s = p2.stats.spe;
	//Faster Tied Slower
	var fastest = p1s > p2s ? "F" : p1s < p2s ? "S" : p1s === p2s ? "T" : undefined;
	var result, highestRoll, lowestRoll, damage = 0;
	//goes from the most optimist to the least optimist
	var p1KO = 0, p2KO = 0;
	//Highest damage
	var p1HD = 0, p2HD = 0;
	for (var i = 0; i < 4; i++) {
		// P1
		result = damageResults[0][i];
		//lowest rolls in %
		damage = result.damage[0] ? result.damage[0] : result.damage;
		lowestRoll = damage * p1.moves[i].hits / p2.stats.hp * 100;
		damage = result.damage[15] ? result.damage[15] : result.damage;
		highestRoll = damage * p1.moves[i].hits / p2.stats.hp * 100;
		if (highestRoll > p1HD) {
			p1HD = highestRoll;
		}
		if (lowestRoll >= 100) {
			p1KO = 1;
		} else { //if lowest kill obviously highest will
			//highest rolls in %
			if (highestRoll >= 100) {
				if (p1KO == 0) {
					p1KO = 2;
				}
			}
		}

		// P2
		result = damageResults[1][i];
		//some damage like sonic boom acts a bit weird.
		damage = result.damage[0] ? result.damage[0] : result.damage;
		lowestRoll = damage * p2.moves[i].hits / p1.stats.hp * 100;
		damage = result.damage[15] ? result.damage[15] : result.damage;
		highestRoll = damage * p2.moves[i].hits / p1.stats.hp * 100;
		if (highestRoll > p2HD) {
			p2HD = highestRoll;
		}
		if (lowestRoll >= 100) {
			p2KO = 4;
		} else {
			if (highestRoll >= 100) {
				if (p2KO < 3) {
					p2KO = 3;
				}
			}
		}
	}
	// Checks if the pokemon walls it
	// i wouldn't mind change this algo for a smarter one.

	// if the adversary don't three shots our pokemon
	if (Math.round(p2HD * 3) < 100) {
		// And if our pokemon does more damage
		if (p1HD > p2HD) {
			if (p1HD > 100) {
				// Then i consider it a wall that may OHKO
				return {speed: fastest, code: "WMO"};
			}
			// if not Then i consider it a good wall
			return {speed: fastest, code: "W"};
		}
	}
	p1KO = p1KO > 0 ? p1KO.toString() : "";
	p2KO = p2KO > 0 ? p2KO.toString() : "";
	return {speed: fastest, code: p1KO + p2KO};
}

// when different move selected, change strings
$(".result-move").change(function () {
	if (damageResults) {
		var result = findDamageResult($(this));
		if (result) {
			var desc = result.fullDesc(notation, false);
			if (desc.indexOf('--') === -1) desc += ' -- possibly the worst move ever';
			$("#mainResult").text(desc);
			$("#damageValues").text("Possible damage amounts: (" + displayDamageHits(result.damage) + ")");
		}
	}
});

function displayDamageHits(damage) {
	// Fixed Damage
	if (typeof damage === 'number') return damage;
	// Standard Damage
	if (damage.length > 2) return damage.join(', ');
	// Fixed Parental Bond Damage
	if (typeof damage[0] === 'number' && typeof damage[1] === 'number') {
		return '1st Hit: ' + damage[0] + '; 2nd Hit: ' + damage[1];
	}
	// Parental Bond Damage
	return '1st Hit: ' + damage[0].join(', ') + '; 2nd Hit: ' + damage[1].join(', ');
}

function findDamageResult(resultMoveObj) {
	var selector = "#" + resultMoveObj.attr("id");
	for (var i = 0; i < resultLocations.length; i++) {
		for (var j = 0; j < resultLocations[i].length; j++) {
			if (resultLocations[i][j].move === selector) {
				return damageResults[i][j];
			}
		}
	}
}

function checkStatBoost(p1, p2) {
	if ($('#StatBoostL').prop("checked")) {
		for (var stat in p1.boosts) {
			if (stat === 'hp') continue;
			p1.boosts[stat] = Math.min(6, p1.boosts[stat] + 1);
		}
	}
	if ($('#StatBoostR').prop("checked")) {
		for (var stat in p2.boosts) {
			if (stat === 'hp') continue;
			p2.boosts[stat] = Math.min(6, p2.boosts[stat] + 1);
		}
	}
}

function calculateAllMoves(gen, p1, p1field, p2, p2field) {
	checkStatBoost(p1, p2);
	var results = [[], []];
	for (var i = 0; i < 4; i++) {
		results[0][i] = calc.calculate(gen, p1, p2, p1.moves[i], p1field);
		results[1][i] = calc.calculate(gen, p2, p1, p2.moves[i], p2field);
	}
	//console.log(results); // DEBUG
	return results;
}

$(".mode").change(function () {
	var params = new URLSearchParams(window.location.search);
	params.set('mode', $(this).attr("id"));
	var mode = params.get('mode');
	if (mode === 'randoms') {
		window.location.replace('randoms' + linkExtension + '?' + params);
	} else if (mode === 'one-vs-one') {
		window.location.replace('index' + linkExtension + '?' + params);
	} else {
		window.location.replace('honkalculate' + linkExtension + '?' + params);
	}
});

$(".notation").change(function () {
	performCalculations();
});

$(document).ready(function () {
	var params = new URLSearchParams(window.location.search);
	var m = params.get('mode');

	if (m) {
		if (m !== 'one-vs-one' && m !== 'randoms') {
			window.location.replace('honkalculate' + linkExtension + '?' + params);
		} else {
			if ($('#randoms').prop('checked')) {
				if (m === 'one-vs-one') {
					window.location.replace('index' + linkExtension + '?' + params);
				}
			} else {
				if (m === 'randoms') {
					window.location.replace('randoms' + linkExtension + '?' + params);
				}
			}
		}
	}

	// Initialize AI options persistence
	initAiOptionsPersistence();

	$("#disableAiMovePercentage").change(function () {
		var disableAiMovePercentage = $(this).is(":checked");
		if (disableAiMovePercentage) {
			hideAiOptionsAndDisclaimers();
			hideAiPercentages();
		} else {
			// turn on ai options and disclaimers
			showAiOptionsAndDisclaimers();
			setAiOptionAndDisclaimVisibility('p2');
			
			showAIPercentages();
		}
	});

	$("#toggleSearch").change(function () {
		var showSearch = $(this).is(":checked");
		if (showSearch) {
			$(".search-inline").show();
		} else {
			$(".search-inline").hide();
		}
	});

	$("#rangeCompare").change(function() {
		var rangeCompare = $(this).is(":checked");
		if (rangeCompare) {
			$(".wrapper").css({"width": "1685px"});
			$(".range-compare").show();
		} else {
			$(".wrapper").css({"width": "1285px"});
			$(".range-compare").hide();
		}
	});

	// clear search if escape pressed

	document.onkeydown = function(evt) {
		evt = evt || window.event;
		isEscape = evt.key === 'Escape';
		if (isEscape && $("#search").is(":focus")) {
			$('#search').val('');
		}
	}

	// Filters mons in players sections based on the search input.
	$("#search").on('input keyup change', function () {
		var q = ($(this).val() || '').trim().toLowerCase();
		var $targets = $('#team-poke-list img.trainer-pok, #box-poke-list img.trainer-pok, #box-poke-list2 img.trainer-pok, #trash-box img.trainer-pok');

		// If targets aren't loaded return
		if ($targets.length === 0) {
			return;
		}

		$targets.each(function () {
			var dataId = (this.dataset && this.dataset.id) ? this.dataset.id.split("(")[0].trim() : '';

			var haystack = (dataId).toLowerCase();

			// Hamilton Alaska now show Arcanine Hisui, etc.
			for (const key in NAME_SEARCH_OVERRIDES) {
				if (haystack.indexOf(key) !== -1) {
					haystack = haystack.concat(" ", NAME_SEARCH_OVERRIDES[key]);
				}
			}

			// set display to none if query doesn't match
			if (q.length === 0 || haystack.indexOf(q) !== -1) {
				this.style.display = '';
			} else {
				this.style.display = 'none';
			}
		});
	});

	$(".calc-trigger").bind("change keyup", function (ev) {
		/*
			This prevents like 8 performCalculations out of 8 that were useless
			without causing bugs (so far)
		*/
		if (window.NO_CALC) {
			return;
		}
		if (document.getElementById("cc-auto-refr").checked) {
			window.refreshColorCode();
		}
		performCalculations();
	});

	performCalculations();
});

/* Click-to-copy function */
$("#mainResult").click(function () {
	navigator.clipboard.writeText($("#mainResult").text()).then(function () {
		document.getElementById('tooltipText').style.visibility = 'visible';
		setTimeout(function () {
			document.getElementById('tooltipText').style.visibility = 'hidden';
		}, 2000);
	});
});
