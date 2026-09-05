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

// TODO: one field probably works with some refactoring
function getCritRate(attacker, defender, aField, dField, moveIndex, honorCritFlag = true) {
	const move = attacker.moves[moveIndex];
	const moveName = move.name;
	const attackerNotInitialized = attacker.item === null || attacker.ability === null || attacker.name === null;
	const critBlocking = strMatch(defender.ability, ...critBlockingAbilities) || (dField.isLuckyChant ?? false);

	if (attackerNotInitialized || critBlocking || calc.getMoveIsStatus(moveName, move.bp)) { return 0; }
	if (move.isCrit && honorCritFlag) { return 1; }

	stages = [0.0625, 0.125, 0.5, 1];

	boosts = 0;

	if (strMatch(move.originalName, ...highCritRatioMoveNames)) {
		boosts++;
	}

	if (strMatch(attacker.item, ...highCritRatioItems)) { boosts++; }
	if (strMatch(attacker.ability, "Super Luck")) { boosts++; }
	if (attacker.name.includes("fetch'd") && (attacker.item == "Leek" || attacker.item == "Stick")) { boosts += 2; }
	if (attacker.name == "Chansey" && attacker.item == "Lucky Punch") { boosts += 2; }
	if (aField.attackerSide.isFocusEnergy) { boosts += 2; }

	boosts = Math.min(boosts, stages.length-1);
	
	// console.log(`returning ${stages[boosts]}`);
	return stages[boosts];
}

window.getCritRate = getCritRate;