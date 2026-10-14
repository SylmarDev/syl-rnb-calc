// Manage type & base stat overrides
function getOverrides() {
	var overrides;
	if (localStorage.getItem("overrides") !== null) {
		overrides = JSON.parse(localStorage.getItem("overrides"));
	} else {
		// migrate legacy flat {hp, at, ...} entries into {bs: {...}} entries
		overrides = JSON.parse(localStorage.getItem("bsOverrides") || "{}");
		for (var name in overrides) {
			var entry = overrides[name];
			if (entry && entry.hp !== undefined && entry.bs === undefined) {
				overrides[name] = {bs: entry};
			}
		}
		localStorage.setItem("overrides", JSON.stringify(overrides));
		localStorage.removeItem("bsOverrides");
	}
	return overrides;
}

function setOverrides(overrides) {
	localStorage.setItem("overrides", JSON.stringify(overrides));
}

// read the two type selects, normalizing empty to null
function getCurrentTypes() {
	return [$("#p1 .type1").val() || null, $("#p1 .type2").val() || null];
}

// do the type selects match the dex defaults?
function typesMatchDex(monName) {
	var cur = getCurrentTypes();
	return cur[0] === (pokedex[monName].types[0] || null) && cur[1] === (pokedex[monName].types[1] || null);
}

// if types/base stats = dex defaults (or the override values, if an override exists)
// tldr "should save button show"
function currentOverridesMatchDefaults(monName, hasOverride) {
	if (!pokedex[monName]) return false; // unknown mon: leave save visible
	var entry = getOverrides()[monName];
	var typesMatch = typesMatchDex(monName);
	if (!typesMatch && entry && entry.types) {
		var cur = getCurrentTypes();
		typesMatch = cur[0] === (entry.types[0] || null) && cur[1] === (entry.types[1] || null);
	}
	if (!typesMatch) return false;
	for (var i = 0; i < LEGACY_STATS_GSC.length; i++) {
		var stat = LEGACY_STATS_GSC[i];
		var inputStat = ~~$("#p1 ." + stat + " .base").val();
		// if an override exists, matching either its stats or the original dex stats hides the save button
		if (hasOverride && entry.bs) {
			if (entry.bs[stat] != inputStat && pokedex[monName].bs[stat] != inputStat) return false;
		} else {
			if (pokedex[monName].bs[stat] != inputStat) return false;
		}
	}
	return true;
}

// hide until types or base stats don't match
function overrideButtonVisibility() {
	if (!$("#p1 input.set-selector").length) return;
	var pokemonName = $("#p1 input.set-selector").val().split(" (")[0];
	var hasOverride = !!getOverrides()[pokemonName];
	$("#save-override").prop("hidden", currentOverridesMatchDefaults(pokemonName, hasOverride));
	$("#reset-override").prop("hidden", !hasOverride);
}

$("#p1 input.base, #p1 select.type1, #p1 select.type2").on('change keyup', function() {
	overrideButtonVisibility();
})

$("#save-override").click(function () {
	var fullSetName = $("#p1 input.set-selector").val();
	var pokemonName = fullSetName.substring(0, fullSetName.indexOf(" ("));
	var overrides = getOverrides();
	var entry = {};
	if (!typesMatchDex(pokemonName)) {
		entry.types = [$("#p1 .type1").val(), $("#p1 .type2").val()];
	}
	var bs = {hp: ~~$("#p1 .hp .base").val()};
	var bsDiffers = false;
	for (var i = 0; i < LEGACY_STATS_GSC.length; i++) {
		var stat = LEGACY_STATS_GSC[i];
		bs[stat] = ~~$("#p1 ." + stat + " .base").val();
		if (bs[stat] != pokedex[pokemonName].bs[stat]) bsDiffers = true;
	}
	if (bsDiffers) entry.bs = bs;
	if (entry.types || entry.bs) {
		overrides[pokemonName] = entry;
	} else {
		delete overrides[pokemonName];
	}
	setOverrides(overrides);
	overrideButtonVisibility();
});

$("#reset-override").click(function () {
	var fullSetName = $("#p1 input.set-selector").val();
	var pokemonName = fullSetName.substring(0, fullSetName.indexOf(" ("));
	var dex = pokedex[pokemonName];
	var overrides = getOverrides();
	delete overrides[pokemonName];
	setOverrides(overrides);
	$("#p1 .hp .base").val(dex.bs.hp);
	for (var i = 0; i < LEGACY_STATS_GSC.length; i++) {
		$("#p1 ." + LEGACY_STATS_GSC[i] + " .base").val(dex.bs[LEGACY_STATS_GSC[i]]);
	}
	$("#p1 .type1").val(dex.types[0] || "");
	$("#p1 .type2").val(dex.types[1] || "");
	calcHP($("#p1"));
	calcStats($("#p1"));
	overrideButtonVisibility();
});
