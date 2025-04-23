if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (searchElement, fromIndex) { // eslint-disable-line no-extend-native
		var k;
		if (this == null) {
			throw new TypeError('"this" equals null or n is undefined');
		}
		var O = Object(this);
		var len = O.length >>> 0;
		if (len === 0) {
			return -1;
		}
		var n = +fromIndex || 0;
		if (Math.abs(n) === Infinity) {
			n = 0;
		}
		if (n >= len) {
			return -1;
		}
		k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
		while (k < len) {
			if (k in O && O[k] === searchElement) {
				return k;
			}
			k++;
		}
		return -1;
	};
}

function startsWith(string, target) {
	return (string || '').slice(0, target.length) === target;
}

var LEGACY_STATS_RBY = ["hp", "at", "df", "sl", "sp"];
var LEGACY_STATS_GSC = ["hp", "at", "df", "sa", "sd", "sp"];
var LEGACY_STATS = [[], LEGACY_STATS_RBY, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC];
var HIDDEN_POWER_REGEX = /Hidden Power (\w*)/;

var CALC_STATUS = {
	'Healthy': '',
	'Paralyzed': 'par',
	'Poisoned': 'psn',
	'Badly Poisoned': 'tox',
	'Burned': 'brn',
	'Asleep': 'slp',
	'Frozen': 'frz'
};

function legacyStatToStat(st) {
	switch (st) {
		case 'hp':
			return "hp";
		case 'at':
			return "atk";
		case 'df':
			return "def";
		case 'sa':
			return "spa";
		case 'sd':
			return "spd";
		case 'sp':
			return "spe";
		case 'sl':
			return "spc";
	}
}

// input field validation
var bounds = {
	"level": [0, 100],
	"base": [1, 255],
	"evs": [0, 252],
	"ivs": [0, 31],
	"dvs": [0, 15],
	"move-bp": [0, 65535]
};
for (var bounded in bounds) {
	attachValidation(bounded, bounds[bounded][0], bounds[bounded][1]);
}
function attachValidation(clazz, min, max) {
	$("." + clazz).keyup(function () {
		validate($(this), min, max);
	});
}
function validate(obj, min, max) {
	obj.val(Math.max(min, Math.min(max, ~~obj.val())));
}

$("input:radio[name='format']").change(function () {
	var gameType = $("input:radio[name='format']:checked").val();
	if (gameType === 'Singles') {
		$("input:checkbox[name='ruin']:checked").prop("checked", false);
	}
	$(".format-specific." + gameType.toLowerCase()).each(function () {
		if ($(this).hasClass("gen-specific") && !$(this).hasClass("g" + gen)) {
			return;
		}
		$(this).show();
	});
	$(".format-specific").not("." + gameType.toLowerCase()).hide();
});

// auto-calc stats and current HP on change
$(".level").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcHP(poke);
	calcStats(poke);
});
$(".nature").bind("keyup change", function () {
	calcStats($(this).closest(".poke-info"));
});
$(".hp .base, .hp .evs, .hp .ivs").bind("keyup change", function () {
	calcHP($(this).closest(".poke-info"));
});
$(".at .base, .at .evs, .at .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'at');
});
$(".df .base, .df .evs, .df .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'df');
});
$(".sa .base, .sa .evs, .sa .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'sa');
});
$(".sd .base, .sd .evs, .sd .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'sd');
});
$(".sp .base, .sp .evs, .sp .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'sp');
});
$(".sl .base").keyup(function () {
	calcStat($(this).closest(".poke-info"), 'sl');
});
$(".at .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'at');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".df .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'df');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".sa .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'sa');
	poke.find(".sd .dvs").val($(this).val());
	calcStat(poke, 'sd');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".sp .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'sp');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".sl .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'sl');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});

function getHPDVs(poke) {
	return (~~poke.find(".at .dvs").val() % 2) * 8 +
		(~~poke.find(".df .dvs").val() % 2) * 4 +
		(~~poke.find(".sp .dvs").val() % 2) * 2 +
		(~~poke.find(gen === 1 ? ".sl .dvs" : ".sa .dvs").val() % 2);
}

function calcStats(poke) {
	for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
		calcStat(poke, LEGACY_STATS[gen][i]);
	}
}

function calcCurrentHP(poke, max, percent, skipDraw) {
	var current = Math.round(Number(percent) * Number(max) / 100);
	poke.find(".current-hp").val(current);
	if (!skipDraw) drawHealthBar(poke, max, current);
	return current;
}
function calcPercentHP(poke, max, current, skipDraw) {
	var percent = Math.round(100 * Number(current) / Number(max));
	if (percent === 0 && current > 0) {
		percent = 1;
	} else if (percent === 100 & current < max) {
		percent = 99;
	}

	poke.find(".percent-hp").val(percent);
	if (!skipDraw) drawHealthBar(poke, max, current);
	return percent;
}
function drawHealthBar(poke, max, current) {
	var fillPercent = 100 * current / max;
	var fillColor = fillPercent > 50 ? "green" : fillPercent > 20 ? "yellow" : "red";

	var healthbar = poke.find(".hpbar");
	healthbar.addClass("hp-" + fillColor);
	var unwantedColors = ["green", "yellow", "red"];
	unwantedColors.splice(unwantedColors.indexOf(fillColor), 1);
	for (var i = 0; i < unwantedColors.length; i++) {
		healthbar.removeClass("hp-" + unwantedColors[i]);
	}
	healthbar.css("background", "linear-gradient(to right, " + fillColor + " " + fillPercent + "%, white 0%");
}
// TODO: these HP inputs should really be input type=number with min=0, step=1, constrained by max=maxHP or 100
$(".current-hp").keyup(function () {
	var max = $(this).parent().children(".max-hp").text();
	validate($(this), 0, max);
	var current = $(this).val();
	calcPercentHP($(this).parent(), max, current);
});
$(".percent-hp").keyup(function () {
	var max = $(this).parent().children(".max-hp").text();
	validate($(this), 0, 100);
	var percent = $(this).val();
	calcCurrentHP($(this).parent(), max, percent);
});

$(".ability").bind("keyup change", function () {
	$(this).closest(".poke-info").find(".move-hits").val($(this).val() === 'Skill Link' ? 5 : 3);

	var ability = $(this).closest(".poke-info").find(".ability").val();

	var TOGGLE_ABILITIES = ['Flash Fire', 'Intimidate', 'Minus', 'Plus', 'Slow Start', 'Unburden', 'Stakeout'];

	if (TOGGLE_ABILITIES.indexOf(ability) >= 0) {
		$(this).closest(".poke-info").find(".abilityToggle").show();
	} else {
		$(this).closest(".poke-info").find(".abilityToggle").hide();
	}

	if (ability === "Supreme Overlord") {
		$(this).closest(".poke-info").find(".alliesFainted").show();
	} else {
		$(this).closest(".poke-info").find(".alliesFainted").val('0');
		$(this).closest(".poke-info").find(".alliesFainted").hide();

	}
});

$("#p1 .ability").bind("keyup change", function () {
	autosetWeather($(this).val(), 0);
	autosetTerrain($(this).val(), 0);
});

var lastManualWeather = "";
var lastAutoWeather = ["", ""];
function autosetWeather(ability, i) {
	var currentWeather = $("input:radio[name='weather']:checked").val();
	if (lastAutoWeather.indexOf(currentWeather) === -1) {
		lastManualWeather = currentWeather;
		lastAutoWeather[1 - i] = "";
	}
	switch (ability) {
		case "Drought":
		case "Orichalcum Pulse":
			lastAutoWeather[i] = "Sun";
			$("#sun").prop("checked", true);
			break;
		case "Drizzle":
			lastAutoWeather[i] = "Rain";
			$("#rain").prop("checked", true);
			break;
		case "Sand Stream":
			lastAutoWeather[i] = "Sand";
			$("#sand").prop("checked", true);
			break;
		case "Snow Warning":
			if (gen >= 9) {
				lastAutoWeather[i] = "Snow";
				$("#snow").prop("checked", true);
			} else {
				lastAutoWeather[i] = "Hail";
				$("#hail").prop("checked", true);
			}
			break;
		case "Desolate Land":
			lastAutoWeather[i] = "Harsh Sunshine";
			$("#harsh-sunshine").prop("checked", true);
			break;
		case "Primordial Sea":
			lastAutoWeather[i] = "Heavy Rain";
			$("#heavy-rain").prop("checked", true);
			break;
		case "Delta Stream":
			lastAutoWeather[i] = "Strong Winds";
			$("#strong-winds").prop("checked", true);
			break;
		default:
			break;
	}
}

var lastManualTerrain = "";
var lastAutoTerrain = ["", ""];
function autosetTerrain(ability, i) {
	var currentTerrain = $("input:checkbox[name='terrain']:checked").val() || "No terrain";
	if (lastAutoTerrain.indexOf(currentTerrain) === -1) {
		lastManualTerrain = currentTerrain;
		lastAutoTerrain[1 - i] = "";
	}
	// terrain input uses checkbox instead of radio, need to uncheck all first
	$("input:checkbox[name='terrain']:checked").prop("checked", false);
	switch (ability) {
		case "Electric Surge":
		case "Hadron Engine":
			lastAutoTerrain[i] = "Electric";
			$("#electric").prop("checked", true);
			break;
		case "Grassy Surge":
			lastAutoTerrain[i] = "Grassy";
			$("#grassy").prop("checked", true);
			break;
		case "Misty Surge":
			lastAutoTerrain[i] = "Misty";
			$("#misty").prop("checked", true);
			break;
		case "Psychic Surge":
			lastAutoTerrain[i] = "Psychic";
			$("#psychic").prop("checked", true);
			break;
		default:
			lastAutoTerrain[i] = "";
			var newTerrain = lastAutoTerrain[1 - i] !== "" ? lastAutoTerrain[1 - i] : lastManualTerrain;
			if ("No terrain" !== newTerrain) {
				$("input:checkbox[name='terrain'][value='" + newTerrain + "']").prop("checked", true);
			}
			break;
	}
}

$("#p1 .item").bind("keyup change", function () {
	autosetStatus("#p1", $(this).val());
});

var lastManualStatus = { "#p1": "Healthy" };
var lastAutoStatus = { "#p1": "Healthy" };
function autosetStatus(p, item) {
	var currentStatus = $(p + " .status").val();
	if (item === "Flame Orb") {
		lastAutoStatus[p] = "Burned";
		$(p + " .status").val("Burned");
		$(p + " .status").change();
	} else if (item === "Toxic Orb") {
		lastAutoStatus[p] = "Badly Poisoned";
		$(p + " .status").val("Badly Poisoned");
		$(p + " .status").change();
	}
}

$(".status").bind("keyup change", function () {
	if ($(this).val() === 'Badly Poisoned') {
		$(this).parent().children(".toxic-counter").show();
	} else {
		$(this).parent().children(".toxic-counter").hide();
	}
});

var lockerMove = "";
// auto-update move details on select
$(".move-selector").change(function () {
	var moveName = $(this).val();
	var move = moves[moveName] || moves['(No Move)'];
	var moveGroupObj = $(this).parent();
	moveGroupObj.children(".move-bp").val(moveName === 'Present' ? 40 : move.bp);
	var m = moveName.match(HIDDEN_POWER_REGEX);
	if (m) {
		var pokeObj = $(this).closest(".poke-info");
		var pokemon = createPokemon(pokeObj);
		var actual = calc.Stats.getHiddenPower(GENERATION, pokemon.ivs);
		if (actual.type !== m[1]) {
			var hpIVs = calc.Stats.getHiddenPowerIVs(GENERATION, m[1]);
			if (hpIVs && gen < 7) {
				for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
					var legacyStat = LEGACY_STATS[gen][i];
					var stat = legacyStatToStat(legacyStat);
					pokeObj.find("." + legacyStat + " .ivs").val(hpIVs[stat] !== undefined ? hpIVs[stat] : 31);
					pokeObj.find("." + legacyStat + " .dvs").val(hpIVs[stat] !== undefined ? calc.Stats.IVToDV(hpIVs[stat]) : 15);
				}
				if (gen < 3) {
					var hpDV = calc.Stats.getHPDV({
						atk: pokeObj.find(".at .ivs").val(),
						def: pokeObj.find(".df .ivs").val(),
						spe: pokeObj.find(".sp .ivs").val(),
						spc: pokeObj.find(".sa .ivs").val()
					});
					pokeObj.find(".hp .ivs").val(calc.Stats.DVToIV(hpDV));
					pokeObj.find(".hp .dvs").val(hpDV);
				}
				pokeObj.change();
				moveGroupObj.children(".move-bp").val(gen >= 6 ? 60 : 70);
			}
		} else {
			moveGroupObj.children(".move-bp").val(actual.power);
		}
	} else if (gen >= 2 && gen <= 6 && HIDDEN_POWER_REGEX.test($(this).attr('data-prev'))) {
		// If this selector was previously Hidden Power but now isn't, reset all IVs/DVs to max.
		var pokeObj = $(this).closest(".poke-info");
		for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
			var legacyStat = LEGACY_STATS[gen][i];
			pokeObj.find("." + legacyStat + " .ivs").val(31);
			pokeObj.find("." + legacyStat + " .dvs").val(15);
		}
	}
	$(this).attr('data-prev', moveName);
	moveGroupObj.children(".move-type").val(move.type);
	moveGroupObj.children(".move-cat").val(move.category);
	moveGroupObj.children(".move-crit").prop("checked", move.willCrit === true).change();

	var stat = move.category === 'Special' ? 'spa' : 'atk';
	var dropsStats =
		move.self && move.self.boosts && move.self.boosts[stat] && move.self.boosts[stat] < 0;
	if (Array.isArray(move.multihit)) {
		moveGroupObj.children(".stat-drops").hide();
		moveGroupObj.children(".move-hits").show();
		var pokemon = $(this).closest(".poke-info");
		var moveHits = (pokemon.find(".ability").val() === 'Skill Link') ? 5 : 3;
		moveGroupObj.children(".move-hits").val(moveHits);
	} else if (dropsStats) {
		moveGroupObj.children(".move-hits").hide();
		moveGroupObj.children(".stat-drops").show();
	} else {
		moveGroupObj.children(".move-hits").hide();
		moveGroupObj.children(".stat-drops").hide();
	}
	moveGroupObj.children(".move-z").prop("checked", false);
});

$(".item").change(function () {
	var itemName = $(this).val();
	var $metronomeControl = $(this).closest('.poke-info').find('.metronome');
	if (itemName === "Metronome") {
		$metronomeControl.show();
	} else {
		$metronomeControl.hide();
	}
});

function smogonAnalysis(pokemonName) {
	var generation = ["rb", "gs", "rs", "dp", "bw", "xy", "sm", "ss", "sv"][gen - 1];
	return "https://smogon.com/dex/" + generation + "/pokemon/" + pokemonName.toLowerCase() + "/";
}

function sortmons(a, b) {
	return parseInt(a.split("[")[1].split("]")[0]) - parseInt(b.split("[")[1].split("]")[0])
}

// auto-update set details on select
$(".set-selector").change(function () {
	window.NO_CALC = true;
	var fullSetName = $(this).val();
	if ($(this).hasClass('opposing')) {
		topPokemonIcon(fullSetName, $("#p2mon")[0])
		CURRENT_TRAINER_POKS = get_trainer_poks(fullSetName)
		var next_poks = CURRENT_TRAINER_POKS.sort(sortmons)

		var trpok_html = ""
		for (i in next_poks) {
			if (next_poks[i][0].includes($('input.opposing').val())) {
				continue
			}
			var pok_name = next_poks[i].split("]")[1].split(" (")[0]
			if (pok_name == "Zygarde-10%") {
				pok_name = "Zygarde-10%25"
			}//this ruined my day
			var pok = `<img class="trainer-pok right-side" src="https://raw.githubusercontent.com/May8th1995/sprites/master/${pok_name}.png" data-id="${CURRENT_TRAINER_POKS[i].split("]")[1]}" title="${next_poks[i]}, ${next_poks[i]} BP">`
			trpok_html += pok
		}
	} else {
		topPokemonIcon(fullSetName, $("#p1mon")[0])
	}

	$('.trainer-pok-list-opposing').html(trpok_html)
	var pokemonName = fullSetName.substring(0, fullSetName.indexOf(" ("));
	var setName = fullSetName.substring(fullSetName.indexOf("(") + 1, fullSetName.lastIndexOf(")"));
	var pokemon = pokedex[pokemonName];
	if (pokemon) {
		var pokeObj = $(this).closest(".poke-info");
		if (stickyMoves.getSelectedSide() === pokeObj.prop("id")) {
			stickyMoves.clearStickyMove();
		}
		pokeObj.find(".teraToggle").prop("checked", false);
		pokeObj.find(".analysis").attr("href", smogonAnalysis(pokemonName));
		pokeObj.find(".type1").val(pokemon.types[0]);
		pokeObj.find(".type2").val(pokemon.types[1]);
		pokeObj.find(".hp .base").val(pokemon.bs.hp);
		var i;
		for (i = 0; i < LEGACY_STATS[gen].length; i++) {
			pokeObj.find("." + LEGACY_STATS[gen][i] + " .base").val(pokemon.bs[LEGACY_STATS[gen][i]]);
		}
		pokeObj.find(".boost").val(0);
		pokeObj.find(".percent-hp").val(100);
		pokeObj.find(".status").val("Healthy");
		$(".status").change();
		var moveObj;
		var abilityObj = pokeObj.find(".ability");
		var itemObj = pokeObj.find(".item");
		var randset = $("#randoms").prop("checked") ? randdex[pokemonName] : undefined;
		var regSets = pokemonName in setdex && setName in setdex[pokemonName];

		if (randset) {
			var listItems = randdex[pokemonName].items ? randdex[pokemonName].items : [];
			var listAbilities = randdex[pokemonName].abilities ? randdex[pokemonName].abilities : [];
			if (gen >= 3) $(this).closest('.poke-info').find(".ability-pool").show();
			$(this).closest('.poke-info').find(".extraSetAbilities").text(listAbilities.join(', '));
			if (gen >= 2) $(this).closest('.poke-info').find(".item-pool").show();
			$(this).closest('.poke-info').find(".extraSetItems").text(listItems.join(', '));
			if (gen >= 9) {
				$(this).closest('.poke-info').find(".role-pool").show();
				$(this).closest('.poke-info').find(".tera-type-pool").show();
			}
			var listRoles = randdex[pokemonName].roles ? Object.keys(randdex[pokemonName].roles) : [];
			$(this).closest('.poke-info').find(".extraSetRoles").text(listRoles.join(', '));
			var listTeraTypes = [];
			if (randdex[pokemonName].roles) {
				for (var roleName in randdex[pokemonName].roles) {
					var role = randdex[pokemonName].roles[roleName];
					for (var q = 0; q < role.teraTypes.length; q++) {
						if (listTeraTypes.indexOf(role.teraTypes[q]) === -1) {
							listTeraTypes.push(role.teraTypes[q]);
						}
					}
				}
			}
			pokeObj.find(".teraType").val(listTeraTypes[0] || pokemon.types[0]);
			$(this).closest('.poke-info').find(".extraSetTeraTypes").text(listTeraTypes.join(', '));
		} else {
			$(this).closest('.poke-info').find(".ability-pool").hide();
			$(this).closest('.poke-info').find(".item-pool").hide();
			$(this).closest('.poke-info').find(".role-pool").hide();
			$(this).closest('.poke-info').find(".tera-type-pool").hide();
		}
		if (regSets || randset) {
			var set = regSets ? correctHiddenPower(setdex[pokemonName][setName]) : randset;
			if (regSets) {
				pokeObj.find(".teraType").val(set.teraType || pokemon.types[0]);
			}
			pokeObj.find(".level").val(set.level);
			pokeObj.find(".hp .evs").val((set.evs && set.evs.hp !== undefined) ? set.evs.hp : 0);
			pokeObj.find(".hp .ivs").val((set.ivs && set.ivs.hp !== undefined) ? set.ivs.hp : 31);
			pokeObj.find(".hp .dvs").val((set.dvs && set.dvs.hp !== undefined) ? set.dvs.hp : 15);
			for (i = 0; i < LEGACY_STATS[gen].length; i++) {
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .evs").val(
					(set.evs && set.evs[LEGACY_STATS[gen][i]] !== undefined) ?
						set.evs[LEGACY_STATS[gen][i]] : ($("#randoms").prop("checked") ? 84 : 0));
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .ivs").val(
					(set.ivs && set.ivs[LEGACY_STATS[gen][i]] !== undefined) ? set.ivs[LEGACY_STATS[gen][i]] : 31);
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .dvs").val(
					(set.dvs && set.dvs[LEGACY_STATS[gen][i]] !== undefined) ? set.dvs[LEGACY_STATS[gen][i]] : 15);
			}
			setSelectValueIfValid(pokeObj.find(".nature"), set.nature, "Hardy");
			var abilityFallback = (typeof pokemon.abilities !== "undefined") ? pokemon.abilities[0] : "";
			if ($("#randoms").prop("checked")) {
				setSelectValueIfValid(abilityObj, randset.abilities && randset.abilities[0], abilityFallback);
				setSelectValueIfValid(itemObj, randset.items && randset.items[0], "");
			} else {
				setSelectValueIfValid(abilityObj, set.ability, abilityFallback);
				setSelectValueIfValid(itemObj, set.item, "");
			}
			var setMoves = set.moves;
			if (randset) {
				if (gen < 9) {
					setMoves = randset.moves;
				} else {
					setMoves = [];
					for (var role in randset.roles) {
						for (var q = 0; q < randset.roles[role].moves.length; q++) {
							var moveName = randset.roles[role].moves[q];
							if (setMoves.indexOf(moveName) === -1) setMoves.push(moveName);
						}
					}
				}
			}
			var moves = selectMovesFromRandomOptions(setMoves);
			for (i = 0; i < 4; i++) {
				moveObj = pokeObj.find(".move" + (i + 1) + " select.move-selector");
				moveObj.attr('data-prev', moveObj.val());
				setSelectValueIfValid(moveObj, moves[i], "(No Move)");
				moveObj.change();
			}
			if (randset) {
				$(this).closest('.poke-info').find(".move-pool").show();
				$(this).closest('.poke-info').find(".extraSetMoves").html(formatMovePool(setMoves));
			}
		} else {
			pokeObj.find(".teraType").val(pokemon.types[0]);
			pokeObj.find(".level").val(100);
			pokeObj.find(".hp .evs").val(0);
			pokeObj.find(".hp .ivs").val(31);
			pokeObj.find(".hp .dvs").val(15);
			for (i = 0; i < LEGACY_STATS[gen].length; i++) {
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .evs").val(0);
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .ivs").val(31);
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .dvs").val(15);
			}
			pokeObj.find(".nature").val("Hardy");
			setSelectValueIfValid(abilityObj, pokemon.ab, "");
			itemObj.val("");
			for (i = 0; i < 4; i++) {
				moveObj = pokeObj.find(".move" + (i + 1) + " select.move-selector");
				moveObj.attr('data-prev', moveObj.val());
				moveObj.val("(No Move)");
				moveObj.change();
			}
			if ($("#randoms").prop("checked")) {
				$(this).closest('.poke-info').find(".move-pool").hide();
			}
		}
		if (typeof getSelectedTiers === "function") { // doesn't exist when in 1vs1 mode
			var format = getSelectedTiers()[0];
			var is50lvl = startsWith(format, "VGC") || startsWith(format, "Battle Spot");
			//var isDoubles = format === 'Doubles' || has50lvl; *TODO*
			if (format === "LC") pokeObj.find(".level").val(5);
			if (is50lvl) pokeObj.find(".level").val(50);
			//if (isDoubles) field.gameType = 'Doubles'; *TODO*
		}
		var formeObj = $(this).siblings().find(".forme").parent();
		itemObj.prop("disabled", false);
		var baseForme;
		if (pokemon.baseSpecies && pokemon.baseSpecies !== pokemon.name) {
			baseForme = pokedex[pokemon.baseSpecies];
		}
		if (pokemon.otherFormes) {
			showFormes(formeObj, pokemonName, pokemon, pokemonName);
		} else if (baseForme && baseForme.otherFormes) {
			showFormes(formeObj, pokemonName, baseForme, pokemon.baseSpecies);
		} else {
			formeObj.hide();
		}
		calcHP(pokeObj);
		calcStats(pokeObj);
		abilityObj.change();
		itemObj.change();
		if (pokemon.gender === "N") {
			pokeObj.find(".gender").parent().hide();
			pokeObj.find(".gender").val("");
		} else pokeObj.find(".gender").parent().show();
	}
	window.NO_CALC = false;
});

function formatMovePool(moves) {
	var formatted = [];
	for (var i = 0; i < moves.length; i++) {
		formatted.push(isKnownDamagingMove(moves[i]) ? moves[i] : '<i>' + moves[i] + '</i>');
	}
	return formatted.join(', ');
}

function isKnownDamagingMove(move) {
	var m = GENERATION.moves.get(calc.toID(move));
	return m && m.basePower;
}

function selectMovesFromRandomOptions(moves) {
	var selected = [];

	var nonDamaging = [];
	for (var i = 0; i < moves.length; i++) {
		if (isKnownDamagingMove(moves[i])) {
			selected.push(moves[i]);
			if (selected.length >= 4) break;
		} else {
			nonDamaging.push(moves[i]);
		}
	}

	while (selected.length < 4 && nonDamaging.length) {
		selected.push(nonDamaging.pop());
	}

	return selected;
}

function showFormes(formeObj, pokemonName, pokemon, baseFormeName) {
	var formes = pokemon.otherFormes.slice();
	formes.unshift(baseFormeName);

	var defaultForme = formes.indexOf(pokemonName);
	if (defaultForme < 0) defaultForme = 0;

	var formeOptions = getSelectOptions(formes, false, defaultForme);
	formeObj.children("select").find("option").remove().end().append(formeOptions).change();
	formeObj.show();
}

function setSelectValueIfValid(select, value, fallback) {
	select.val(!value ? fallback : select.children("option[value='" + value + "']").length ? value : fallback);
}

$(".forme").change(function () {
	var altForme = pokedex[$(this).val()],
		container = $(this).closest(".info-group").siblings(),
		fullSetName = container.find(".select2-chosen").first().text(),
		pokemonName = fullSetName.substring(0, fullSetName.indexOf(" (")),
		setName = fullSetName.substring(fullSetName.indexOf("(") + 1, fullSetName.lastIndexOf(")"));

	$(this).parent().siblings().find(".type1").val(altForme.types[0]);
	$(this).parent().siblings().find(".type2").val(altForme.types[1] ? altForme.types[1] : "");
	for (var i = 0; i < LEGACY_STATS[9].length; i++) {
		var baseStat = container.find("." + LEGACY_STATS[9][i]).find(".base");
		baseStat.val(altForme.bs[LEGACY_STATS[9][i]]);
		baseStat.keyup();
	}
	var isRandoms = $("#randoms").prop("checked");
	var pokemonSets = isRandoms ? randdex[pokemonName] : setdex[pokemonName];
	var chosenSet = pokemonSets && pokemonSets[setName];
	var greninjaSet = $(this).val().indexOf("Greninja") !== -1;
	var isAltForme = $(this).val() !== pokemonName;
	if (isAltForme && abilities.indexOf(altForme.ab) !== -1 && !greninjaSet) {
		container.find(".ability").val(altForme.ab);
	} else if (greninjaSet) {
		$(this).parent().find(".ability");
	} else if (chosenSet) {
		if (!isRandoms) {
			container.find(".abilities").val(chosenSet.ability);
		} else {
			container.find(".ability").val(chosenSet.abilities[0]);
		}
	}
	container.find(".ability").keyup();

	if ($(this).val().indexOf("-Mega") !== -1 && $(this).val() !== "Rayquaza-Mega") {
		container.find(".item").val("").keyup();
	} else {
		container.find(".item").prop("disabled", false);
	}
});

function correctHiddenPower(pokemon) {
	// After Gen 7 bottlecaps means you can have a HP without perfect IVs
	if (gen >= 7) return pokemon;

	// Convert the legacy stats table to a useful one, and also figure out if all are maxed
	var ivs = {};
	var maxed = true;
	for (var i = 0; i <= LEGACY_STATS[9].length; i++) {
		var s = LEGACY_STATS[9][i];
		var iv = ivs[legacyStatToStat(s)] = (pokemon.ivs && pokemon.ivs[s]) || 31;
		if (iv !== 31) maxed = false;
	}

	var expected = calc.Stats.getHiddenPower(GENERATION, ivs);
	for (var i = 0; i < pokemon.moves.length; i++) {
		var m = pokemon.moves[i].match(HIDDEN_POWER_REGEX);
		if (!m) continue;
		// The Pokemon has Hidden Power and is not maxed but the types don't match we don't
		// want to attempt to reconcile the user's IVs so instead just correct the HP type
		if (!maxed && expected.type !== m[1]) {
			pokemon.moves[i] = "Hidden Power " + expected.type;
		} else {
			// Otherwise, use the default preset hidden power IVs that PS would use
			var hpIVs = calc.Stats.getHiddenPowerIVs(GENERATION, m[1]);
			if (!hpIVs) continue; // some impossible type was specified, ignore

			pokemon.ivs = pokemon.ivs || { hp: 31, at: 31, df: 31, sa: 31, sd: 31, sp: 31 };
			pokemon.dvs = pokemon.dvs || { hp: 15, at: 15, df: 15, sa: 15, sd: 15, sp: 15 };
			for (var stat in hpIVs) {
				pokemon.ivs[calc.Stats.shortForm(stat)] = hpIVs[stat];
				pokemon.dvs[calc.Stats.shortForm(stat)] = calc.Stats.IVToDV(hpIVs[stat]);
			}
			if (gen < 3) {
				pokemon.dvs.hp = calc.Stats.getHPDV({
					atk: pokemon.ivs.at,
					def: pokemon.ivs.df,
					spe: pokemon.ivs.sp,
					spc: pokemon.ivs.sa
				});
				pokemon.ivs.hp = calc.Stats.DVToIV(pokemon.dvs.hp);
			}
		}
	}
	return pokemon;
}

function createPokemon(pokeInfo) {
	if (typeof pokeInfo === "string") { // in this case, pokeInfo is the id of an individual setOptions value whose moveset's tier matches the selected tier(s)
		var name = pokeInfo.substring(0, pokeInfo.indexOf(" ("));
		var setName = pokeInfo.substring(pokeInfo.indexOf("(") + 1, pokeInfo.lastIndexOf(")"));
		var isRandoms = $("#randoms").prop("checked");
		var set = isRandoms ? randdex[name] : setdex[name][setName];

		var ivs = {};
		var evs = {};
		for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
			var legacyStat = LEGACY_STATS[gen][i];
			var stat = legacyStatToStat(legacyStat);

			ivs[stat] = (gen >= 3 && set.ivs && typeof set.ivs[legacyStat] !== "undefined") ? set.ivs[legacyStat] : 31;
			evs[stat] = (set.evs && typeof set.evs[legacyStat] !== "undefined") ? set.evs[legacyStat] : 0;
		}
		var moveNames = set.moves;
		if (isRandoms && gen >= 9) {
			moveNames = [];
			for (var role in set.roles) {
				for (var q = 0; q < set.roles[role].moves.length; q++) {
					var moveName = set.roles[role].moves[q];
					if (moveNames.indexOf(moveName) === -1) moveNames.push(moveName);
				}
			}
		}

		var pokemonMoves = [];
		for (var i = 0; i < 4; i++) {
			var moveName = moveNames[i];
			var isCrit = $('.move-crit')[i].checked;
			pokemonMoves.push(new calc.Move(gen, moves[moveName] ? moveName : "(No Move)", { ability: ability, item: item, isCrit: isCrit, }));
		}

		if (isRandoms) {
			pokemonMoves = pokemonMoves.filter(function (move) {
				return move.category !== "Status";
			});
		}

		return new calc.Pokemon(gen, name, {
			level: set.level,
			ability: set.ability,
			abilityOn: true,
			item: set.item && typeof set.item !== "undefined" && (set.item === "Eviolite" || set.item.indexOf("ite") < 0) ? set.item : "",
			nature: set.nature,
			ivs: ivs,
			evs: evs,
			moves: pokemonMoves
		});
	} else {
		var setName = pokeInfo.find("input.set-selector").val();
		var name;
		if (setName.indexOf("(") === -1) {
			name = setName;
		} else {
			var pokemonName = setName.substring(0, setName.indexOf(" ("));
			var species = pokedex[pokemonName];
			name = (species.otherFormes || (species.baseSpecies && species.baseSpecies !== pokemonName)) ? pokeInfo.find(".forme").val() : pokemonName;
		}

		var baseStats = {};
		var ivs = {};
		var evs = {};
		var boosts = {};
		for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
			var stat = legacyStatToStat(LEGACY_STATS[gen][i]);
			baseStats[stat === 'spc' ? 'spa' : stat] = ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .base").val();
			ivs[stat] = gen > 2 ? ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .ivs").val() : ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .dvs").val() * 2 + 1;
			evs[stat] = ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .evs").val();
			boosts[stat] = ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .boost").val();
		}
		if (gen === 1) baseStats.spd = baseStats.spa;

		var ability = pokeInfo.find(".ability").val();
		var item = pokeInfo.find(".item").val();
		var isDynamaxed = pokeInfo.find(".max").prop("checked");
		var teraType = pokeInfo.find(".teraToggle").is(":checked") ? pokeInfo.find(".teraType").val() : undefined;
		pokeInfo.isDynamaxed = isDynamaxed;
		calcHP(pokeInfo);
		var curHP = ~~pokeInfo.find(".current-hp").val();
		// FIXME the Pokemon constructor expects non-dynamaxed HP
		if (isDynamaxed) curHP = Math.floor(curHP / 2);
		var types = [pokeInfo.find(".type1").val(), pokeInfo.find(".type2").val()];

		// TODO : cont from here get toxic counter value and make sure its setting
		// try replacing deprecated status with
		// pokeInfo.find(".status").val()

		return new calc.Pokemon(gen, name, {
			level: ~~pokeInfo.find(".level").val(),
			ability: ability,
			abilityOn: pokeInfo.find(".abilityToggle").is(":checked"),
			item: item,
			gender: pokeInfo.find(".gender").is(":visible") ? getGender(pokeInfo.find(".gender").val()) : "N",
			nature: pokeInfo.find(".nature").val(),
			ivs: ivs,
			evs: evs,
			isDynamaxed: isDynamaxed,
			isSaltCure: pokeInfo.find(".saltcure").is(":checked"),
			alliesFainted: parseInt(pokeInfo.find(".alliesFainted").val()),
			teraType: teraType,
			boosts: boosts,
			curHP: curHP,
			status: CALC_STATUS[pokeInfo.find(".status").val()],
			toxicCounter: status === 'Badly Poisoned' ? ~~pokeInfo.find(".toxic-counter").val() : 0,
			moves: [
				getMoveDetails(pokeInfo.find(".move1"), name, ability, item, isDynamaxed),
				getMoveDetails(pokeInfo.find(".move2"), name, ability, item, isDynamaxed),
				getMoveDetails(pokeInfo.find(".move3"), name, ability, item, isDynamaxed),
				getMoveDetails(pokeInfo.find(".move4"), name, ability, item, isDynamaxed)
			],
			overrides: {
				baseStats: baseStats,
				types: types
			}
		});
	}
}

function getGender(gender) {
	if (!gender || gender === 'genderless' || gender === 'N') return 'N';
	if (gender.toLowerCase() === 'male' || gender === 'M') return 'M';
	return 'F';
}

function getMoveDetails(moveInfo, species, ability, item, useMax) {
	var moveName = moveInfo.find("select.move-selector").val();
	var isZMove = gen > 6 && moveInfo.find("input.move-z").prop("checked");
	var isCrit = moveInfo.find(".move-crit").prop("checked");
	var hits = +moveInfo.find(".move-hits").val();
	var timesUsed = +moveInfo.find(".stat-drops").val();
	var timesUsedWithMetronome = moveInfo.find(".metronome").is(':visible') ? +moveInfo.find(".metronome").val() : 1;
	var overrides = {
		basePower: +moveInfo.find(".move-bp").val(),
		type: moveInfo.find(".move-type").val()
	};
	if (gen >= 4) overrides.category = moveInfo.find(".move-cat").val();
	return new calc.Move(gen, moveName, {
		ability: ability, item: item, useZ: isZMove, species: species, isCrit: isCrit, hits: hits,
		timesUsed: timesUsed, timesUsedWithMetronome: timesUsedWithMetronome, overrides: overrides, useMax: useMax
	});
}

function createField() {
	var gameType = $("input:radio[name='format']:checked").val();
	var isBeadsOfRuin = $("#beads").prop("checked");
	var isTabletsOfRuin = $("#tablets").prop("checked");
	var isSwordOfRuin = $("#sword").prop("checked");
	var isVesselOfRuin = $("#vessel").prop("checked");
	var isMagicRoom = $("#magicroom").prop("checked");
	var isWonderRoom = $("#wonderroom").prop("checked");
	var isTrickRoom = $("#trickroom").prop("checked");
	var isGravity = $("#gravity").prop("checked");
	var isSR = [$("#srL").prop("checked"), $("#srR").prop("checked")];
	var weather;
	var spikes;
	if (gen === 2) {
		spikes = [$("#gscSpikesL").prop("checked") ? 1 : 0, $("#gscSpikesR").prop("checked") ? 1 : 0];
		weather = $("input:radio[name='gscWeather']:checked").val();
	} else {
		weather = $("input:radio[name='weather']:checked").val();
		spikes = [~~$("input:radio[name='spikesL']:checked").val(), ~~$("input:radio[name='spikesR']:checked").val()];
	}
	var tspikes = [~~$("input:radio[name='tspikesL']:checked").val(), ~~$("input:radio[name='tspikesR']:checked").val()]
	var steelsurge = [$("#steelsurgeL").prop("checked"), $("#steelsurgeR").prop("checked")];
	var vinelash = [$("#vinelashL").prop("checked"), $("#vinelashR").prop("checked")];
	var wildfire = [$("#wildfireL").prop("checked"), $("#wildfireR").prop("checked")];
	var cannonade = [$("#cannonadeL").prop("checked"), $("#cannonadeR").prop("checked")];
	var volcalith = [$("#volcalithL").prop("checked"), $("#volcalithR").prop("checked")];
	var terrain = ($("input:checkbox[name='terrain']:checked").val()) ? $("input:checkbox[name='terrain']:checked").val() : "";
	var isReflect = [$("#reflectL").prop("checked"), $("#reflectR").prop("checked")];
	var isLightScreen = [$("#lightScreenL").prop("checked"), $("#lightScreenR").prop("checked")];
	var isProtected = [$("#protectL").prop("checked"), $("#protectR").prop("checked")];
	var isSeeded = [$("#leechSeedL").prop("checked"), $("#leechSeedR").prop("checked")];
	var isForesight = [$("#foresightL").prop("checked"), $("#foresightR").prop("checked")];
	var isHelpingHand = [$("#helpingHandL").prop("checked"), $("#helpingHandR").prop("checked")];
	var isTailwind = [$("#tailwindL").prop("checked"), $("#tailwindR").prop("checked")];
	var isSubstitute = [$("#substituteL").prop("checked"), $("#substituteR").prop("checked")];
	var isFocusEnergy = [$("#focusEnergyL").prop("checked"), $("#focusEnergyR").prop("checked")];
	var isFlowerGift = [$("#flowerGiftL").prop("checked"), $("#flowerGiftR").prop("checked")];
	var isFriendGuard = [$("#friendGuardL").prop("checked"), $("#friendGuardR").prop("checked")];
	var isAuroraVeil = [$("#auroraVeilL").prop("checked"), $("#auroraVeilR").prop("checked")];
	var isBattery = [$("#batteryL").prop("checked"), $("#batteryR").prop("checked")];
	var isPowerSpot = [$("#powerSpotL").prop("checked"), $("#powerSpotR").prop("checked")];
	// TODO: support switching in as well!
	var isSwitchingOut = [$("#switchingL").prop("checked"), $("#switchingR").prop("checked")];

	var createSide = function (i) {
		return new calc.Side({
			spikes: spikes[i], tspikes: tspikes[i], isSR: isSR[i], steelsurge: steelsurge[i],
			vinelash: vinelash[i], wildfire: wildfire[i], cannonade: cannonade[i], volcalith: volcalith[i],
			isReflect: isReflect[i], isLightScreen: isLightScreen[i],
			isProtected: isProtected[i], isSeeded: isSeeded[i], isForesight: isForesight[i],
			isTailwind: isTailwind[i], isSubstitute: isSubstitute[i], isFocusEnergy: isFocusEnergy[i], isHelpingHand: isHelpingHand[i], isFlowerGift: isFlowerGift[i], isFriendGuard: isFriendGuard[i],
			isAuroraVeil: isAuroraVeil[i], isBattery: isBattery[i], isPowerSpot: isPowerSpot[i], isSwitching: isSwitchingOut[i] ? 'out' : undefined
		});
	};
	return new calc.Field({
		gameType: gameType, weather: weather, terrain: terrain,
		isMagicRoom: isMagicRoom, isWonderRoom: isWonderRoom, isTrickRoom: isTrickRoom, isGravity: isGravity,
		isBeadsOfRuin: isBeadsOfRuin, isTabletsOfRuin: isTabletsOfRuin,
		isSwordOfRuin: isSwordOfRuin, isVesselOfRuin: isVesselOfRuin,
		attackerSide: createSide(0), defenderSide: createSide(1)
	});
}

function calcHP(poke) {
	var total = calcStat(poke, "hp");
	var $maxHP = poke.find(".max-hp");

	var prevMaxHP = Number($maxHP.attr('data-prev')) || total;
	var $currentHP = poke.find(".current-hp");
	var prevCurrentHP = $currentHP.attr('data-set') ? Math.min(Number($currentHP.val()), prevMaxHP) : prevMaxHP;
	// NOTE: poke.find(".percent-hp").val() is a rounded value!
	var prevPercentHP = 100 * prevCurrentHP / prevMaxHP;

	$maxHP.text(total);
	$maxHP.attr('data-prev', total);

	var newCurrentHP = calcCurrentHP(poke, total, prevPercentHP);
	calcPercentHP(poke, total, newCurrentHP);

	$currentHP.attr('data-set', true);
}

function calcStat(poke, StatID) {
	var stat = poke.find("." + StatID);
	var base = ~~stat.find(".base").val();
	var level = ~~poke.find(".level").val();
	var nature, ivs, evs;
	if (gen < 3) {
		ivs = ~~stat.find(".dvs").val() * 2;
		evs = 252;
	} else {
		ivs = ~~stat.find(".ivs").val();
		evs = ~~stat.find(".evs").val();
		if (StatID !== "hp") nature = poke.find(".nature").val();
	}
	// Shedinja still has 1 max HP during the effect even if its Dynamax Level is maxed (DaWoblefet)
	var total = calc.calcStat(gen, legacyStatToStat(StatID), base, ivs, evs, level, nature);
	if (gen > 7 && StatID === "hp" && poke.isDynamaxed && total !== 1) {
		total *= 2;
	}
	stat.find(".total").text(total);
	return total;
}

var GENERATION = {
	'1': 1, 'rb': 1, 'rby': 1,
	'2': 2, 'gs': 2, 'gsc': 2,
	'3': 3, 'rs': 3, 'rse': 3, 'frlg': 3, 'adv': 3,
	'4': 4, 'dp': 4, 'dpp': 4, 'hgss': 4,
	'5': 5, 'bw': 5, 'bw2': 5, 'b2w2': 5,
	'6': 6, 'xy': 6, 'oras': 6,
	'7': 7, 'sm': 7, 'usm': 7, 'usum': 7,
	'8': 8, 'ss': 8,
	'9': 9, 'sv': 9
};

var SETDEX = [
	{},
	typeof SETDEX_RBY === 'undefined' ? {} : SETDEX_RBY,
	typeof SETDEX_GSC === 'undefined' ? {} : SETDEX_GSC,
	typeof SETDEX_ADV === 'undefined' ? {} : SETDEX_ADV,
	typeof SETDEX_DPP === 'undefined' ? {} : SETDEX_DPP,
	typeof SETDEX_BW === 'undefined' ? {} : SETDEX_BW,
	typeof SETDEX_XY === 'undefined' ? {} : SETDEX_XY,
	typeof SETDEX_SM === 'undefined' ? {} : SETDEX_SM,
	typeof SETDEX_SS === 'undefined' ? {} : SETDEX_SS,
	typeof SETDEX_SV === 'undefined' ? {} : SETDEX_SV,
];
var RANDDEX = [
	{},
	typeof GEN1RANDOMBATTLE === 'undefined' ? {} : GEN1RANDOMBATTLE,
	typeof GEN2RANDOMBATTLE === 'undefined' ? {} : GEN2RANDOMBATTLE,
	typeof GEN3RANDOMBATTLE === 'undefined' ? {} : GEN3RANDOMBATTLE,
	typeof GEN4RANDOMBATTLE === 'undefined' ? {} : GEN4RANDOMBATTLE,
	typeof GEN5RANDOMBATTLE === 'undefined' ? {} : GEN5RANDOMBATTLE,
	typeof GEN6RANDOMBATTLE === 'undefined' ? {} : GEN6RANDOMBATTLE,
	typeof GEN7RANDOMBATTLE === 'undefined' ? {} : GEN7RANDOMBATTLE,
	typeof GEN8RANDOMBATTLE === 'undefined' ? {} : GEN8RANDOMBATTLE,
	typeof GEN9RANDOMBATTLE === 'undefined' ? {} : GEN9RANDOMBATTLE,
];
var gen, genWasChanged, notation, pokedex, setdex, randdex, typeChart, moves, abilities, items, calcHP, calcStat, GENERATION;

TR_NAMES = get_trainer_names()

$(".gen").change(function () {
	/*eslint-disable */
	gen = ~~$(this).val() || 8;
	GENERATION = calc.Generations.get(gen);
	var params = new URLSearchParams(window.location.search);
	if (gen === 8) {
		params.delete('gen');
		params = '' + params;
		if (window.history && window.history.replaceState) {
			window.history.replaceState({}, document.title, window.location.pathname + (params.length ? '?' + params : ''));
		}
	} else {
		params.set('gen', gen);
		if (window.history && window.history.pushState) {
			params.sort();
			var path = window.location.pathname + '?' + params;
			window.history.pushState({}, document.title, path);
			gtag('config', 'UA-26211653-3', { 'page_path': path });
		}
	}
	genWasChanged = true;
	/* eslint-enable */
	// declaring these variables with var here makes z moves not work; TODO
	pokedex = calc.SPECIES[gen];
	setdex = SETDEX[gen];
	randdex = RANDDEX[gen];
	typeChart = calc.TYPE_CHART[gen];
	moves = calc.MOVES[gen];
	items = calc.ITEMS[gen];
	abilities = calc.ABILITIES[gen];
	clearField();
	$("#importedSets").prop("checked", false);
	loadDefaultLists();
	$(".gen-specific.g" + gen).show();
	$(".gen-specific").not(".g" + gen).hide();
	var typeOptions = getSelectOptions(Object.keys(typeChart));
	$("select.type1, select.move-type").find("option").remove().end().append(typeOptions);
	$("select.teraType").find("option").remove().end().append(getSelectOptions(Object.keys(typeChart).slice(1)));
	$("select.type2").find("option").remove().end().append("<option value=\"\">(none)</option>" + typeOptions);
	var moveOptions = getSelectOptions(Object.keys(moves), true);
	$("select.move-selector").find("option").remove().end().append(moveOptions);
	var abilityOptions = getSelectOptions(abilities, true);
	$("select.ability").find("option").remove().end().append("<option value=\"\">(other)</option>" + abilityOptions);
	var itemOptions = getSelectOptions(items, true);
	$("select.item").find("option").remove().end().append("<option value=\"\">(none)</option>" + itemOptions);

	$(".set-selector").val(getFirstValidSetOption().id);
	$(".set-selector").change();
});

function getFirstValidSetOption() {
	var sets = getSetOptions();
	// NB: The first set is never valid, so we start searching after it.
	for (var i = 1; i < sets.length; i++) {
		if (sets[i].id && sets[i].id.indexOf('(Blank Set)') === -1) return sets[i];
	}
	return undefined;
}

$(".notation").change(function () {
	notation = $(this).val();
});

function clearField() {
	$("#singles-format").prop("checked", true);
	$("#clear").prop("checked", true);
	$("#gscClear").prop("checked", true);
	$("#gravity").prop("checked", false);
	$("#srL").prop("checked", false);
	$("#srR").prop("checked", false);
	$("#spikesL0").prop("checked", true);
	$("#spikesR0").prop("checked", true);
	$("#gscSpikesL").prop("checked", false);
	$("#gscSpikesR").prop("checked", false);
	$("#steelsurgeL").prop("checked", false);
	$("#steelsurgeR").prop("checked", false);
	$("#vinelashL").prop("checked", false);
	$("#vinelashR").prop("checked", false);
	$("#wildfireL").prop("checked", false);
	$("#wildfireR").prop("checked", false);
	$("#cannonadeL").prop("checked", false);
	$("#cannonadeR").prop("checked", false);
	$("#volcalithL").prop("checked", false);
	$("#volcalithR").prop("checked", false);
	$("#reflectL").prop("checked", false);
	$("#reflectR").prop("checked", false);
	$("#lightScreenL").prop("checked", false);
	$("#lightScreenR").prop("checked", false);
	$("#protectL").prop("checked", false);
	$("#protectR").prop("checked", false);
	$("#leechSeedL").prop("checked", false);
	$("#leechSeedR").prop("checked", false);
	$("#foresightL").prop("checked", false);
	$("#foresightR").prop("checked", false);
	$("#helpingHandL").prop("checked", false);
	$("#helpingHandR").prop("checked", false);
	$("#tailwindL").prop("checked", false);
	$("#tailwindR").prop("checked", false);
	$("#friendGuardL").prop("checked", false);
	$("#friendGuardR").prop("checked", false);
	$("#auroraVeilL").prop("checked", false);
	$("#auroraVeilR").prop("checked", false);
	$("#batteryL").prop("checked", false);
	$("#batteryR").prop("checked", false);
	$("#switchingL").prop("checked", false);
	$("#switchingR").prop("checked", false);
	$("input:checkbox[name='terrain']").prop("checked", false);
}

function getSetOptions(sets) {
	var setsHolder = sets;
	if (setsHolder === undefined) {
		setsHolder = pokedex;
	}
	var pokeNames = Object.keys(setsHolder);
	pokeNames.sort();
	var setOptions = [];
	for (var i = 0; i < pokeNames.length; i++) {
		var pokeName = pokeNames[i];
		setOptions.push({
			pokemon: pokeName,
			text: pokeName
		});
		if ($("#randoms").prop("checked")) {
			if (pokeName in randdex) {
				setOptions.push({
					pokemon: pokeName,
					set: 'Randoms Set',
					text: pokeName + " (Randoms)",
					id: pokeName + " (Randoms)"
				});
			}
		} else {
			if (pokeName in setdex) {
				var setNames = Object.keys(setdex[pokeName]);
				for (var j = 0; j < setNames.length; j++) {
					var setName = setNames[j];
					setOptions.push({
						pokemon: pokeName,
						set: setName,
						text: pokeName + " (" + setName + ")",
						id: pokeName + " (" + setName + ")",
						isCustom: setdex[pokeName][setName].isCustomSet,
						nickname: setdex[pokeName][setName].nickname || ""
					});
				}
			}
			setOptions.push({
				pokemon: pokeName,
				set: "Blank Set",
				text: pokeName + " (Blank Set)",
				id: pokeName + " (Blank Set)"
			});
		}
	}
	return setOptions;
}

function getSelectOptions(arr, sort, defaultOption) {
	if (sort) {
		arr.sort();
	}
	var r = '';
	for (var i = 0; i < arr.length; i++) {
		r += '<option value="' + arr[i] + '" ' + (defaultOption === i ? 'selected' : '') + '>' + arr[i] + '</option>';
	}
	return r;
}
var stickyMoves = (function () {
	var lastClicked = 'resultMoveL1';
	$(".result-move").click(function () {
		if (this.id === lastClicked) {
			$(this).toggleClass("locked-move");
		} else {
			$('.locked-move').removeClass('locked-move');
		}
		lastClicked = this.id;
	});

	return {
		clearStickyMove: function () {
			lastClicked = null;
			$('.locked-move').removeClass('locked-move');
		},
		setSelectedMove: function (slot) {
			lastClicked = slot;
		},
		getSelectedSide: function () {
			if (lastClicked) {
				if (lastClicked.indexOf('resultMoveL') !== -1) {
					return 'p1';
				} else if (lastClicked.indexOf('resultMoveR') !== -1) {
					return 'p2';
				}
			}
			return null;
		}
	};
})();

function isPokeInfoGrounded(pokeInfo) {
	var teraType = pokeInfo.find(".teraToggle").is(":checked") ? pokeInfo.find(".teraType").val() : undefined;
	return $("#gravity").prop("checked") || (
		teraType ? teraType !== "Flying" : pokeInfo.find(".type1").val() !== "Flying" &&
			teraType ? teraType !== "Flying" : pokeInfo.find(".type2").val() !== "Flying" &&
			pokeInfo.find(".ability").val() !== "Levitate" &&
		pokeInfo.find(".item").val() !== "Air Balloon"
	);
}

function getTerrainEffects() {
	var className = $(this).prop("className");
	className = className.substring(0, className.indexOf(" "));
	switch (className) {
		case "type1":
		case "type2":
		case "teraType":
		case "teraToggle":
		case "item":
			var id = $(this).closest(".poke-info").prop("id");
			var terrainValue = $("input:checkbox[name='terrain']:checked").val();
			if (terrainValue === "Electric") {
				$("#" + id).find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#" + id)));
			} else if (terrainValue === "Misty") {
				$("#" + id).find(".status").prop("disabled", isPokeInfoGrounded($("#" + id)));
			}
			break;
		case "ability":
			// with autoset, ability change may cause terrain change, need to consider both sides
			var terrainValue = $("input:checkbox[name='terrain']:checked").val();
			if (terrainValue === "Electric") {
				$("#p1").find(".status").prop("disabled", false);
				$("#p2").find(".status").prop("disabled", false);
				$("#p1").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p1")));
				$("#p2").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p2")));
			} else if (terrainValue === "Misty") {
				$("#p1").find(".status").prop("disabled", isPokeInfoGrounded($("#p1")));
				$("#p2").find(".status").prop("disabled", isPokeInfoGrounded($("#p2")));
			} else {
				$("#p1").find("[value='Asleep']").prop("disabled", false);
				$("#p1").find(".status").prop("disabled", false);
				$("#p2").find("[value='Asleep']").prop("disabled", false);
				$("#p2").find(".status").prop("disabled", false);
			}
			break;
		default:
			$("input:checkbox[name='terrain']").not(this).prop("checked", false);
			if ($(this).prop("checked") && $(this).val() === "Electric") {
				// need to enable status because it may be disabled by Misty Terrain before.
				$("#p1").find(".status").prop("disabled", false);
				$("#p2").find(".status").prop("disabled", false);
				$("#p1").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p1")));
				$("#p2").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p2")));
			} else if ($(this).prop("checked") && $(this).val() === "Misty") {
				$("#p1").find(".status").prop("disabled", isPokeInfoGrounded($("#p1")));
				$("#p2").find(".status").prop("disabled", isPokeInfoGrounded($("#p2")));
			} else {
				$("#p1").find("[value='Asleep']").prop("disabled", false);
				$("#p1").find(".status").prop("disabled", false);
				$("#p2").find("[value='Asleep']").prop("disabled", false);
				$("#p2").find(".status").prop("disabled", false);
			}
			break;
	}
}

function loadDefaultLists() {
	$(".set-selector").select2({
		formatResult: function (object) {
			if ($("#randoms").prop("checked")) {
				return object.pokemon;
			} else {
				return object.set ? ("&nbsp;&nbsp;&nbsp;" + object.set) : ("<b>" + object.text + "</b>");
			}
		},
		query: function (query) {
			var pageSize = 30;
			var results = [];
			var options = getSetOptions();
			for (var i = 0; i < options.length; i++) {
				var option = options[i];
				var pokeName = option.pokemon.toUpperCase();
				if (!query.term || query.term.toUpperCase().split(" ").every(function (term) {
					return pokeName.indexOf(term) === 0 || pokeName.indexOf("-" + term) >= 0 || pokeName.indexOf(" " + term) >= 0;
				})) {
					if ($("#randoms").prop("checked")) {
						if (option.id) results.push(option);
					} else {
						results.push(option);
					}
				}
			}
			query.callback({
				results: results.slice((query.page - 1) * pageSize, query.page * pageSize),
				more: results.length >= query.page * pageSize
			});
		},
		initSelection: function (element, callback) {
			callback(getFirstValidSetOption());
		}
	});
}

function allPokemon(selector) {
	var allSelector = "";
	for (var i = 0; i < $(".poke-info").length; i++) {
		if (i > 0) {
			allSelector += ", ";
		}
		allSelector += "#p" + (i + 1) + " " + selector;
	}
	return allSelector;
}

function loadCustomList(id) {
	$("#" + id + " .set-selector").select2({
		formatResult: function (set) {
			return (set.nickname ? set.pokemon + " (" + set.nickname + ")" : set.id);
		},
		query: function (query) {
			var pageSize = 30;
			var results = [];
			var options = getSetOptions();
			for (var i = 0; i < options.length; i++) {
				var option = options[i];
				var pokeName = option.pokemon.toUpperCase();
				var setName = option.set ? option.set.toUpperCase() : option.set;
				if (option.isCustom && option.set && (!query.term || query.term.toUpperCase().split(" ").every(function (term) {
					return pokeName.indexOf(term) === 0 || pokeName.indexOf("-" + term) >= 0 || pokeName.indexOf(" " + term) >= 0 || setName.indexOf(term) === 0 || setName.indexOf("-" + term) >= 0 || setName.indexOf(" " + term) >= 0;
				}))) {
					results.push(option);
				}
			}
			query.callback({
				results: results.slice((query.page - 1) * pageSize, query.page * pageSize),
				more: results.length >= query.page * pageSize
			});
		},
		initSelection: function (element, callback) {
			var data = "";
			callback(data);
		}
	});
}

function get_trainer_names() {
	var all_poks = SETDEX_SS
	var trainer_names = []

	for (const [pok_name, poks] of Object.entries(all_poks)) {
		var pok_tr_names = Object.keys(poks)
		for (i in pok_tr_names) {
			var index = (poks[pok_tr_names[i]]["index"])
			var trainer_name = pok_tr_names[i]
			trainer_names.push(`[${index}]${pok_name} (${trainer_name})`)
		}
	}
	return trainer_names
}
function addBoxed(poke) {
	if (document.getElementById(`${poke.name}${poke.nameProp}`)) {
		//nothing to do it already exist
		return
	}
	var newPoke = document.createElement("img");
	newPoke.id = `${poke.name}${poke.nameProp}`
	newPoke.className = "trainer-pok left-side";
	newPoke.src = getSrcImgPokemon(poke);
	newPoke.dataset.id = `${poke.name} (${poke.nameProp})`
	newPoke.addEventListener("dragstart", dragstart_handler);
	$('#box-poke-list')[0].appendChild(newPoke)
}

function getSrcImgPokemon(poke) {
	//edge case
	if (!poke) {
		return
	}
	if (poke.name == "Aegislash-Shield") {
		return `https://raw.githubusercontent.com/May8th1995/sprites/master/Aegislash.png`
	} else {
		return `https://raw.githubusercontent.com/May8th1995/sprites/master/${poke.name}.png`
	}
}

function get_trainer_poks(trainer_name) {
	var true_name = trainer_name.split("(")[1].split("\n")[0].trim()
	window.CURRENT_TRAINER = true_name.substring(0, true_name.length -1);
	var matches = []
	for (i in TR_NAMES) {
		if (TR_NAMES[i].includes(true_name)) {
			matches.push(TR_NAMES[i])
		}
	}
	return matches
}

function topPokemonIcon(fullname, node) {
	var mon = { name: fullname.split(" (")[0] };
	var src = getSrcImgPokemon(mon);
	node.src = src;
}

function isNamed(moveName, ...names) {
    return names.includes(moveName);
}

function hasMove(affectedMoves, aiMoves) {
	for (const move of affectedMoves) {
		if (isNamed(move, ...aiMoves)) { return true; }
	}
	return false;
}

function setAiOptionVisibility(side) {
	let moveNames = [];
	// console.log($(`#${side} .i-f-o-move div.move-selector a.select2-choice span.select2-chosen`));
	$(`#${side} .i-f-o-move div.move-selector a.select2-choice span.select2-chosen`).each(function() { moveNames.push($(this).text())}); // trust the process
	// console.log(moveNames);

	hideAiOptions();
	
	// if Stealth Rocks, Spikes, Toxic Spikes, Sticky Web, Protect, King's Shield, Fake Out, Or Encore
	// first turn out checkbox needs made available
	if (hasMove(["Stealth Rock", "Spikes", "Toxic Spikes", "Sticky Web", "Protect", "King's Shield", "Fake Out", "Encore"], moveNames)) {
		showAiOptionsDiv();
		$("#firstTurnOutOpt").show();
	}

	// sucker punch
	if (isNamed("Sucker Punch", ...moveNames)) {
		showAiOptionsDiv();
		$("#suckerPunchOpt").show();
	}

	// self fainting moves
	if (hasMove(["Explosion", "Self Destruct", "Misty Explosion", "Memento"], moveNames)) {
		if (!isNamed("Memento", ...moveNames)) {
			$("#playerLastMonOpt").show();
		}
		
		showAiOptionsDiv();
		$("#lastMonOpt").show();
	}

	// baton pass
	if (isNamed("Baton Pass", ...moveNames)) {
		showAiOptionsDiv();
		$("#lastMonOpt").show();
	}

	// player charmed or confused
	if (hasMove(["Thunder Wave", "Stun Spore", "Glare", "Nuzzle"], moveNames)) {
		showAiOptionsDiv();
		$("#playerCharmedOrConfusedOpt").show();
	}

	// imprison
	if (isNamed("Imprison", ...moveNames)) {
		showAiOptionsDiv();
		$("#imprisonOpt").show();
	}

	// taunt
	if (isNamed("Taunt", ...moveNames)) {
		showAiOptionsDiv();
		$("#tauntOpt").show();
	}

	// encore
	if (isNamed("Encore", ...moveNames)) {
		showAiOptionsDiv();
		$("#encoreOpt").show();
		$("#playerFirstTurnOutOpt").show();
	}

	if (isNamed("Magnet Rise", ...moveNames)) {
		showAiOptionsDiv();
		$("#magnetRiseOpt").show();
	}
}

$(document).on('click', '.right-side', function () {
	var set = $(this).attr('data-id');
	topPokemonIcon(set, $("#p2mon")[0])
	$('.opposing').val(set);
	$('.opposing').change();
	$('.opposing .select2-chosen').text(set);
	setAiOptionVisibility('p2');
})

$(document).on('click', '.left-side', function () {
	var set = $(this).attr('data-id');
	topPokemonIcon(set, $("#p1mon")[0])
	$('.player').val(set);
	$('.player').change();
	$('.player .select2-chosen').text(set);
})

$(document).on('change', '#p2 .i-f-o-move select.move-selector', function () {
	setAiOptionVisibility('p2');
})

//select first mon of the box when loading
function selectFirstMon() {
	var pMons = document.getElementsByClassName("trainer-pok left-side");
	let set = pMons[i].getAttribute("data-id");
	$('.player').val(set);
	$('.player').change();
	$('.player .select2-chosen').text(set);
}

function selectTrainer(value) {
	localStorage.setItem("lasttimetrainer", value);
	all_poks = SETDEX_SS
	for (const [pok_name, poks] of Object.entries(all_poks)) {
		var pok_tr_names = Object.keys(poks)
		for (i in pok_tr_names) {
			var index = (poks[pok_tr_names[i]]["index"])
			if (index == value) {
				var set = `${pok_name} (${pok_tr_names[i]})`;
				$('.opposing').val(set);
				$('.opposing').change();
				$('.opposing .select2-chosen').text(set);
			}

		}
	}
}

function nextTrainer() {
	string = ($(".trainer-pok-list-opposing")).html()
	initialSplit = string.split("[")
	value = parseInt(initialSplit[initialSplit.length - 2].split("]")[0]) + 1
	selectTrainer(value)
}

function previousTrainer() {
	string = ($(".trainer-pok-list-opposing")).html()
	value = parseInt(string.split("]")[0].split("[")[1]) - 1
	selectTrainer(value)
}

function resetTrainer() {
	if (confirm(`Are you sure you want to reset? This will clear all imported sets and change your current trainer back to Younger Calvin. This cannot be undone.`)){
		selectTrainer(1);
		localStorage.removeItem("customsets");
		$(allPokemon("#importedSetsOptions")).hide();
		loadDefaultLists();
		for (let zone of document.getElementsByClassName("dropzone")){
			zone.innerHTML="";
		}
	}
	
}


function HideShowCCSettings(){
	$('#show-cc')[0].toggleAttribute("hidden");
	$('#hide-cc')[0].toggleAttribute("hidden");
	$('#refr-cc')[0].toggleAttribute("hidden");
	$('#info-cc')[0].toggleAttribute("hidden");
	$('#cc-sets')[0].toggleAttribute("hidden");
}

function colorCodeUpdate(){
	var speCheck = document.getElementById("cc-spe-border").checked;
	var ohkoCheck = document.getElementById("cc-ohko-color").checked;
	if (!speCheck && !ohkoCheck){
		return
	}
	var pMons = document.getElementsByClassName("trainer-pok left-side");
	// i calc here to alleviate some calculation
	var p2info = $("#p2");
	var p2 = createPokemon(p2info);
	for (let i = 0; i < pMons.length; i++) {
		let set = pMons[i].getAttribute("data-id");
		let idColor = calculationsColors(set, p2);
		if (speCheck && ohkoCheck){
			pMons[i].className = `trainer-pok left-side mon-speed-${idColor.speed} mon-dmg-${idColor.code}`;
		}
		else if (speCheck){
			pMons[i].className = `trainer-pok left-side mon-speed-${idColor.speed}`;
		}
		else if (ohkoCheck){
			pMons[i].className = `trainer-pok left-side mon-dmg-${idColor.code}`;
		}
		
		
	}
}
function showColorCodes(){
	colorCodeUpdate();
	HideShowCCSettings();
}

function refreshColorCode(){
	colorCodeUpdate();
}

function hideColorCodes(){
	var pMons = document.getElementsByClassName("trainer-pok left-side");
	for (let i = 0; i < pMons.length; i++) {
		pMons[i].className = "trainer-pok left-side";
	}
	document.getElementById("cc-auto-refr").checked = false;
	HideShowCCSettings();
}

function toggleInfoColorCode(){
	document.getElementById("info-cc-field").toggleAttribute("hidden");
}

function TrashPokemon() {
	var maybeMultiple = document.getElementById("trash-box").getElementsByClassName("trainer-pok");
	if (maybeMultiple.length == 0){
		return; //nothing to delete
	}
	var numberPKM = maybeMultiple.length > 1 ? `${maybeMultiple.length} Pokemon(s)` : "this Pokemon"; 
	var yes = confirm(`do you really want to remove ${numberPKM}?`);
	if (!yes) {
		return;
	}
	var customSets = JSON.parse(localStorage.customsets);
	var length= maybeMultiple.length;
	for( let i = 0; i<length; i++){
		var pokeTrashed = maybeMultiple[i];
		var name = pokeTrashed.getAttribute("data-id").split(" (")[0];
		delete customSets[name];
	}
	document.getElementById("trash-box").innerHTML="";
	localStorage.setItem("customsets", JSON.stringify(customSets));
	$('#box-poke-list')[0].click();
	//switch to the next pokemon automatically
	
}
function RemoveAllPokemon() {
	document.getEle
}
function allowDrop(ev) {
	ev.preventDefault();
}

var pokeDragged = null;
function dragstart_handler(ev) {
	pokeDragged = ev.target;
}

function drop(ev) {
	ev.preventDefault();
	if (ev.target.classList.contains("dropzone")) {
		pokeDragged.parentNode.removeChild(pokeDragged);
		ev.target.appendChild(pokeDragged);	
	}
	// if it's a pokemon
	else if(ev.target.classList.contains("left-side")) {
		//And if a sibling switch them
		if(ev.target.parentNode == pokeDragged.parentNode){
			let prev1 = ev.target.previousSibling || ev.target;
			let prev2 = pokeDragged.previousSibling || pokeDragged;

			prev1.after(pokeDragged);
			prev2.after(ev.target);
		}
		//if not just append to the box it belongs
		else{
			let prev1 = ev.target.previousSibling || ev.target;
			prev1.after(pokeDragged);
		}
	}
	ev.target.classList.remove('over');
}

function handleDragEnter(ev) {
	ev.target.classList.add('over');
}

function handleDragLeave(ev) {
	ev.target.classList.remove('over');
}

function SpeedBorderSetsChange(ev){
	var monImgs = document.getElementsByClassName("left-side");
	if (ev.target.checked){
		for (let monImg of monImgs){
			monImg.classList.remove("mon-speed-none")
		}
	}else{
		for (let monImg of monImgs){
			monImg.classList.add("mon-speed-none")
		}
	}
}

function ColorCodeSetsChange(ev){
	var monImgs = document.getElementsByClassName("left-side");
	if (ev.target.checked){
		for (let monImg of monImgs){
			monImg.classList.remove("mon-dmg-none")
		}
	}else{
		for (let monImg of monImgs){
			monImg.classList.add("mon-dmg-none")
		}
	}
}
function setupSideCollapsers(){
	var applyF = (btns) => {
		for (var i = 0; i < btns.length; i++) {
			let btn = btns[i];
			btn.cum = btn.offsetHeight;
			btn.sisterEl = document.getElementsByClassName(btn.getAttribute("data-set"))[0];
			btn.prevEl = btns[i-1] || null;
			if (btn.prevEl){
				btn.cum += btn.prevEl.cum
			}else{
				btn.cum = 0;
			}
			btn.nextEl = btns[i+1] || null;
			btn.onclick = sideCollapsersCorrection
		}
	}
	var leftBtns = document.getElementsByClassName("l-side-button");
	var rigtBtns = document.getElementsByClassName("r-side-button");
	applyF(leftBtns);
	applyF(rigtBtns);
	/*
		readjust the left buttons
		Because i couldn't find a proper way to do it with css
	*/
	for(let btn of leftBtns){
		btn.style.left = "-" + btn.offsetWidth + "px";
	}
	leftBtns[0].onclick();
	rigtBtns[0].onclick();
}
function sideCollapsersCorrection(ev){
	if (ev){
		var arrow = ev.target.children[0] || ev.target.parentNode.children[0];
		collapseArrow(arrow);
	}
	var node = this;
	if (node.tagName != "BUTTON"){
		node = this.target.parentNode;
	}
	var prev = node.prevEl;
	var offset = node.sisterEl.offsetTop;
	var relativeHeight = node.parentNode.offsetTop;
	if(prev){
		//since the position is absolute, this will prevent from eating fellows.
		var prevLowPos = prev.offsetTop + prev.offsetHeight; - relativeHeight ;
		if(offset==0){// collapsed
			offset = prevLowPos;
		}else{// standing
			offset = offset - relativeHeight;
			if (offset < prevLowPos){
				offset = prevLowPos;
			}
		}
	}else{
		if(offset==0){// collapsed
			offset = node.offsetTop;
		}else{// standing
			offset = offset - relativeHeight;
		}
	}
	node.style.top = offset + "px"
	//propagate to next buttons
	if(node.nextEl){
		node.nextEl.onclick()
	}
}
function collapseArrow(arrow){
	var arrBtn = arrow.parentNode;
	var target = arrBtn.getAttribute("data-set");
	for (let div of document.getElementsByClassName(target)){
		div.toggleAttribute("hidden");
	}
	if (arrBtn.classList.contains("l-side-button")){
		if (arrow.classList.contains("arrowdown")){
			arrow.classList.remove("arrowdown");
			arrow.classList.add("arrowright");
		}else{
			arrow.classList.remove("arrowright");
			arrow.classList.add("arrowdown");
		}
	}
	else if (arrBtn.classList.contains("r-side-button")){
		if (arrow.classList.contains("arrowdown")){
			arrow.classList.remove("arrowdown");
			arrow.classList.add("arrowleft");
		}else{
			arrow.classList.remove("arrowleft");
			arrow.classList.add("arrowdown");
		}
	}
}

/* although those two function could be factorised in one, i may think about more in depth 
functionality laters that may involve two separate functions, i will remove this comment if i do*/
function switchIconSingle(){
	document.getElementById("monDouble").toggleAttribute("hidden")
}

function switchIconDouble(){
	document.getElementById("monDouble").toggleAttribute("hidden")
}

function hideAiOptions() {
	$("#aiOptions").hide();
	$("#aiOptions div:has(input)").each(function () {
		$(this).hide();
	});
}

function showAiOptionsDiv() {
	if ($("#disableAiMovePercentage").is(":checked")) {
		return;
	}
	
	$("#aiOptions").show();
	$("#aiOptions .row").show();
}

$(document).ready(function () {
	var params = new URLSearchParams(window.location.search);
	var g = GENERATION[params.get('gen')] || 8;
	$("#gen" + g).prop("checked", true);
	$("#gen" + g).change();
	$("#percentage").prop("checked", true);
	$("#percentage").change();
	$("#singles-format").prop("checked", true);
	$("#singles-format").change();
	loadDefaultLists();
	$(".move-selector").select2({
		dropdownAutoWidth: true,
		matcher: function (term, text) {
			// 2nd condition is for Hidden Power
			return text.toUpperCase().indexOf(term.toUpperCase()) === 0 || text.toUpperCase().indexOf(" " + term.toUpperCase()) >= 0;
		}
	});
	$(".set-selector").val(getFirstValidSetOption().id);
	$(".set-selector").change();
	$(".terrain-trigger").bind("change keyup", getTerrainEffects);
	$("#previous-trainer").click(previousTrainer);
	$("#next-trainer").click(nextTrainer);
	$("#reset-trainer").click(resetTrainer);
	$('#show-cc').click(showColorCodes);
	$('#hide-cc').click(hideColorCodes);
	$('#refr-cc').click(refreshColorCode);
	$('#info-cc').click(toggleInfoColorCode);
	$('#trash-pok').click(TrashPokemon);
	$('#cc-spe-border').change(SpeedBorderSetsChange);
	$('#cc-ohko-color').change(ColorCodeSetsChange);
	$('#cc-spe-border')[0].checked=true;
	$('#cc-ohko-color')[0].checked=true;
	$('#singles-format').click(switchIconDouble);
	$('#doubles-format').click(switchIconSingle);
	for (let dropzone of document.getElementsByClassName("dropzone")){
		dropzone.ondragenter=handleDragEnter;
		dropzone.ondragleave=handleDragLeave;
		dropzone.ondrop=drop;
		dropzone.ondragover=allowDrop;
	}
	//select last trainer
	let last = localStorage.getItem("lasttimetrainer");
	if (last != "") {
		selectTrainer(parseInt(last, 10));
	};

	// set crit checkboxes to align their values
	/* Crits on the top of the screen */
	$(".top-crit").change(function() {
		const idSuffix = this.id.substr(this.id.length - 2);
		if ($(`#crit${idSuffix}`).is(":checked") != this.checked) {
			$(`#crit${idSuffix}`).click();
		}
	});

	$(".move-crit").change(function() {
		const idSuffix = this.id.substr(this.id.length - 2);
		if ($(`#critTop${idSuffix}`).is(":checked") != this.checked) {
			$(`#critTop${idSuffix}`).click();
		}
	});

	// hide ai options
	hideAiOptions();
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