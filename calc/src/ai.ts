import { Result } from './result';
import { Move } from './move';
import { Pokemon } from '.';

// interfaces
interface KVP {
    key: string,
    value: number
}

// move functions
function isNamed(moveName: string, ...names: string[]) {
    return names.includes(moveName);
}

function isTrapping(move: Move) {
    return isNamed(move.name, 'Whirlpool', 'Fire Spin', 'Sand Tomb', 'Magma Storm', 'Infestation', 'Wrap', 'Bind');
}

function isTrappingStr(s: string) {
    return isNamed(s, 'Whirlpool', 'Fire Spin', 'Sand Tomb', 'Magma Storm', 'Infestation', 'Wrap', 'Bind');
}

function movesetHasMove(moves: any[], moveName: string) {
    for (const move of moves) {
        if (move.move.name == moveName) { return true; }
    }
    return false;
}

// returns true if one of the moves in moveNames is contained in moves
function movesetHasMoves(moves: any[], ...moveNames: string[]) {
    let hasMove: boolean = false;
    for (const moveName of moveNames) {
        hasMove = movesetHasMove(moves, moveName);
        if (hasMove) { return true; }
    }
    return false;
}

function movesetHasSoundMove(moves: any[]) {
    return movesetHasMoves(moves, "Boomburst", "Bug Buzz", "Chatter",
        "Clanging Scales", "Clangorous Soul", "Clangorous Soulblaze",
       "Confide", "Disarming Voice", "Echoed Voice", "Eerie Spell",
       "Grass Whistle", "Growl", "Heal Bell", "Howl", "Hyper Voice",
       "Metal Sound", "Noble Roar", "Overdrive", "Parting Shot",
       "Perish Song", "Psychic Noise", "Relic Song", "Roar",
       "Round", "Screech", "Sing", "Snarl", "Snore", "Sparkling Aria",
       "Supersonic","Uproar");
}

function movesetHasHighCritRatioMove(moves: any[]) {
    return movesetHasMoves(moves, "Aeroblast", "Air Cutter", "Attack Order",
        "Blaze Kick", "Crabhammer", "Cross Chop", "Cross Poison", "Drill Run",
        "Karate Chop", "Leaf Blade", "Night Slash", "Poison Tail", "Psycho Cut",
        "Razor Leaf", "Razor Wind", "Shadow Claw", "Sky Attack", "Slash",
        "Spacial Rend", "Stone Edge");
}

function computeDistribution(array: number[]): { [key: number]: number } {
    let sortedArray = array.sort((a, b) => a - b);
    let distribution: { [key: number]: number } = {};

    let totalCount = sortedArray.length; // Total number of elements in the array

    sortedArray.forEach(value => {
        if (!(value in distribution)) {
            distribution[value] = sortedArray.filter(v => v === value).length / totalCount; // Store distribution value
        }
    });

    return distribution;
}

function objectEntriesIntKeys(obj: { [key: number]: number }): [number, number][] {
    return Object.entries(obj).map(([key, value]) => [parseInt(key), value]);
}

function cartesian(arrays: any[][]): any[][] {
    return arrays.reduce((acc, curr) => {
        return acc.flatMap(d => curr.map(e => [...d, e]));
    }, [[]]);
}

function setKeyStrings(keyString: string, splitKeys: string[]) : string[] {
    let keyStrings: string[] = [];
    for (let splitKey in splitKeys) {
        if (keyString.includes(splitKey)) {
            keyStrings.push(...splitKeyString(keyString, splitKey));
        }
    }

    if (keyStrings.length == 0) {
        keyStrings.push(keyString);
    }

    return keyStrings;
}

function splitKeyString(keyString: string, subString: string): string[] {
    let keyStrings = [];

    // assumes that the keystring has parts to replace
    let parts = keyString.split("/");

    const indices = parts.reduce((acc: number[], part, i) => {
        // I have no idea why this needs to be inversed, but it does
        if (!part.includes(subString)) { 
            acc.push(i);
        }
        return acc;
    }, []);
    
    //console.log(indices); // Debug

    for (let index in indices) {   
        let newKeyString = [... parts];
        newKeyString[index] = newKeyString[index].replace(subString, "0");
        keyStrings.push(newKeyString.map(String).join("/"));
    }

    return keyStrings;
}

// Function to add or update a probability
function addOrUpdateProbability(probabilities: KVP[], newKey: string, value: number) {
    const index = probabilities.findIndex(x => x.key === newKey);
    if (index !== -1) {
        probabilities[index].value += value;
    } else {
        probabilities.push({key: newKey, value: value});
    }
}

function updateProbabilityWithVariance(probabilities: KVP[], key: string, prob: number, factor: number, replacement: string[]) {
    const newProb = prob * factor;

    while (key.includes(`${replacement[0]}+`)) {
        key = key.replace(`${replacement[0]}+`, `${replacement[1]}+`);
    }
    
    let keyChanged = false;
    let newKeyValues = key.split("/");
    //console.log(newKeyValues);
    for (let i = 0; i < newKeyValues.length; i++) {
        let newKeyValue = newKeyValues[i];
        const score = newKeyValue.split(":")[1];
        if (score.includes('+')) {
            const parts = score.split('+').map(Number);
            const sum = parts.reduce((acc, val) => acc + val, 0);
            newKeyValues[i] = newKeyValue.split(":")[0] + ":" + sum.toString();
            keyChanged = true;
        }
    }

    if (keyChanged) {
        key = newKeyValues.join("/");
    }

    addOrUpdateProbability(probabilities, key, newProb);
}

// returns bool based on if this damagingKVP sees a kill
// TODO: this needs reworked if it needs to check for kills with Explosion, Final Gambit and Rollout
// for now lets just hope there are no sing + boom/roolout mons lol
function getAISeesKill(moveScores: string[], attackerAbility: string) {
    const abilityMoveBonus = attackerAbility === "Moxie" ||
                                attackerAbility === "Beast Boost" ||
                                attackerAbility === "Chilling Neigh" ||
                                attackerAbility === "Grim Neigh";

    let killScores: number[] = [9, 11, 12, 14];
    let exceptionKillScores: number[] = [3, 6];
    if (abilityMoveBonus) {
        let newKs: number[] = [];
        let newEks: number[] = [];

        for (const killScore of killScores) {
            newKs.push(killScore + 1);
        }

        for (const exceptionKillScore of exceptionKillScores) {
            newEks.push(exceptionKillScore + 1);
        }

        killScores = newKs;
        exceptionKillScores = newEks;
    }

    // ["Move1:0", "Move2:6", "Move3:0", "Move4:3"]
    for (const moveStr of moveScores) {
        const moveStrSplit = moveStr.split(':');
        const moveName = moveStrSplit[0];
        const moveScore: number = +moveStrSplit[1];

        if ((isNamed(moveName, "Relic Song", "Meteor Beam", "Future Sight") 
            || isTrappingStr(moveName)) && exceptionKillScores.includes(moveScore)) 
        {
            return true;
        } else if (killScores.includes(moveScore)) {
            return true;
        }
    }

    return false;
}


// takes moveKVPs, 1 Key Value Pair, {key: "Move1:0/Move2:6/Move3:0/Move4:0", value: 1}
// takes moveStringsToAdd, an array of objects, [{move: Move3, score: 8, rate: 0.37}]
// returns a new list of KVP's, [{key: "Move1:0/Move2:6/Move3:0/Move4:0", value: 0.63}, {key: "Move1:0/Move2:6/Move3:8/Move4:0", value: 0.37}]
function updateMoveKVPWithMoveStrings(moveKVPs: KVP[], moveStringToAdd: { move: string, score: number, rate: number }): KVP[] {
    // populate moveStringsToAdd to every score from that array to every instance of that move in moveKVPs
    let newKvps: KVP[] = []; // [{key: "Move1:0/Move2:6/Move3:0/Move4:0", value: 1}]

    // return if there's no point in running this
    if (moveStringToAdd.score === 0 || moveStringToAdd.rate === 0) { return moveKVPs }

    // subroutine for rate = 1
    if (moveStringToAdd.rate === 1) {
        for (const moveKVP of moveKVPs) {
            let key: string = "";
            let newKeyArr: string[] = [];

            // update key
            const moveScoreStrings = moveKVP.key.split("/");

            for (const moveScoreString of moveScoreStrings) {
                const moveScoreSplit = moveScoreString.split(":");
                const moveName = moveScoreSplit[0];
                let score = Number(moveScoreSplit[1]);
                if (moveName === moveStringToAdd.move) {
                    score += moveStringToAdd.score;
                }

                newKeyArr.push(`${moveName}:${String(score)}`);
            }

            key = newKeyArr.join("/");

            // keep value (in this case rate) the same since rate is 1
            addOrUpdateProbability(newKvps, key, moveKVP.value);
        }
    } else { // rate <1
        for (const moveKVP of moveKVPs) {
            const oldKey = moveKVP.key;
            let key: string = "";
            let newKeyArr: string[] = [];

            // update key
            const moveScoreStrings = moveKVP.key.split("/");

            for (const moveScoreString of moveScoreStrings) {
                const moveScoreSplit = moveScoreString.split(":");
                const moveName = moveScoreSplit[0];
                let score = Number(moveScoreSplit[1]);
                if (moveName === moveStringToAdd.move) {
                    score += moveStringToAdd.score;
                }

                newKeyArr.push(`${moveName}:${String(score)}`);
            }

            key = newKeyArr.join("/");

            // update value
            addOrUpdateProbability(newKvps, oldKey, moveKVP.value * (1 - moveStringToAdd.rate))
            addOrUpdateProbability(newKvps, key, moveKVP.value * moveStringToAdd.rate);
        }
    }

    // console.log("newKvps");
    // console.log(newKvps);
    return newKvps;
}

function calculateHighestDamage(moves: any[]): KVP[] {
    // TODO: multi-hit moves (i.e. Pin Missile) need their damage calculations updated
    let p1CurrentHealth = moves[0].defender.curHP();

    // console.log(moves); // DEBUG
    
    // Damaging Trapping Moves should always come back as -1 damage
    // TODO: use this for later if you need to iterate on other things, but for now this isn't nessesary
    /*
    let newMoves: any[] = [];
    moves.forEach((move, i) => {
        if (isTrapping(move.move)) {
            move.damage = [-1];
        }

        newMoves.push(move);
    });

    moves = newMoves; */

    // But ^^^ is how you would change a moves damage if you artificially needed to set it to 0.
    // TODO: consider using above code to turn off crits except for cases where Crit should be turned on
    // And for calculating the new damage values of multi hit moves (i.e Pin Missile)

    // console.log(moves); // DEBUG

    let arrays = moves.map(move => move.damageRolls().map((roll: number) => Math.min(p1CurrentHealth, roll)));
    let aiFaster = moves[0].attacker.stats.spe >= moves[0].defender.stats.spe;

    // list of damage distributions for the move
    let moveDistributions = arrays.map(array => computeDistribution(array));

    // calculate the probability distribution of which dict will have the highest key
    let probabilities: KVP[] = [];

    // get all possible combinations of key choices
    // move distributions is a list of 4 dictionaries, each with an int key and number value
    // we want to get all possible combinations of keys from each dictionary

    let allChoices = cartesian(moveDistributions.map(distribution => objectEntriesIntKeys(distribution)));
    
    // console.log(allChoices); // debug
    
    for (let choice of allChoices) {
       let keys = choice.map(([key, value]) => key);
       let moveProbabilities: number[] = choice.map(([key, value]) => Number(value));

       let keysForMaximumCheck = [];
       let i = 0;
       for (const key of keys) {
          if (moves[i].move.category === "Status" || 
            isNamed(moves[i].move.name, "Explosion", "Final Gambit", "Rollout") ||
            isNamed(moves[i].move.name, "Relic Song", "Meteor Beam", "Future Sight") ||
            isTrapping(moves[i].move))
            {
                i++;
                continue;
            }

            keysForMaximumCheck.push(key);
            i++;
       }

       // console.log(keysForMaximumCheck);

       let maximumKey = Math.max(...keysForMaximumCheck);

       // generate keystring
       let keyStrings = [];
       let keyString = "";
       i = 0;
       for (let key of keys) {
           if (keyString != "") {
               keyString += "/"
           }

           let moveName = moves[i].move.name;
           let moveBonus = 0;
           
           // if damaging move kills
           if (key >= p1CurrentHealth) {
               if (aiFaster || moves[i].priority > 0) {
                   moveBonus += 6;
               } else {
                   moveBonus += 3;
               }

               if (moves[i].attacker.ability === "Moxie" ||
                    moves[i].attacker.ability === "Beast Boost" ||
                    moves[i].attacker.ability === "Chilling Neigh" ||
                    moves[i].attacker.ability === "Grim Neigh")
               {
                   moveBonus += 1;
               }

               // skip these moves entirely
               if (moves[i].move.category === "Status" ||
                isNamed(moves[i].move.name, "Explosion", "Final Gambit", "Rollout"))
                {
                    keyString += `${moveName}:0`;
                    i++;
                    continue;
                }

                // these still get kill bonuses
                if (isNamed(moves[i].move.name, "Relic Song", "Meteor Beam", "Future Sight") || isTrapping(moves[i].move)) {
                    keyString += `${moveName}:${moveBonus}`;
                    i++;
                    continue;
                }
           }

           // TODO: add the crit chance + super effective rule
           // TODO: will have to get high crit ratio moves from a predefined list
           // not sure how I'll get super effectives

           if (key === maximumKey) {
               keyString += `${moveName}:HD+${moveBonus}`;
           } else {
               keyString += `${moveName}:0`;
           }

           i++;
        }

        // console.log(keyString);

        let probabilityOfChoice = 1;
        for (const probability of moveProbabilities) {
            probabilityOfChoice *= Number(probability);
        }
        //console.log(probabilityOfChoice); // Debug

        keyStrings = setKeyStrings(keyString, ["HD"]);

        for (const keyString of keyStrings) {
            //console.log(keyStrings); // Debug
            const probabilityToAdd = probabilityOfChoice / keyStrings.length;
            addOrUpdateProbability(probabilities, keyString, probabilityToAdd);
        }
    }

    // update probabilities with variance
    let probabilitiesWithVariance: KVP[] = [];

    // console.log(probabilities); // debug
    
    for (const probability of probabilities) {
        if (probability.key.includes("HD")) {
            updateProbabilityWithVariance(probabilitiesWithVariance, probability.key, probability.value, 0.8, ["HD", "6"]);
            updateProbabilityWithVariance(probabilitiesWithVariance, probability.key, probability.value, 0.2, ["HD", "8"]);
        } else {
            addOrUpdateProbability(probabilitiesWithVariance, probability.key, probability.value);
        }
    }

    // console.log(probabilitiesWithVariance); // Debug
    return probabilitiesWithVariance;
}

/**
 * Generates the move distribution.
 * @param {any[]} damageResults - damageResults of current calc state
 * @param {string} fastestSide - 0 if player, 1 if AI. "tie" if tie
 * @returns {number[]} The move distribution.
 */
export function generateMoveDist(damageResults: any[], fastestSide: string, aiOptions: {[key: string]: boolean }): number[] {
    // DEBUG
    // console.log(damageResults);
    // console.log(aiOptions);

    // set variables, parsed from move dist
    const moves: any[] = damageResults[1];
    const playerMoves: any[] = damageResults[0];
    const aiFaster: boolean = fastestSide != "0";
    const playerMon: Pokemon = moves[0].defender;

    let finalDist: number[] = [];
    moves.forEach((move, i) => {
        finalDist[i] = 0.0;
    });

    // console.log(moves); // DEBUG
    
    let damagingMoveDist = calculateHighestDamage(moves);

    // iterate through player moves, get highest damaging roll
    let playerHighestRoll = 0;
    damageResults[0].forEach((move: {damage: number[], move: any, attacker: any}, i: number) => {
        let playerDamageRoll: number = move.damage[move.damage.length-1];
        // TODO: don't do this check if move is a guaranteed crit
        if (move.move.isCrit) {
            playerDamageRoll = Math.trunc(playerDamageRoll / 1.5);
            if (move.attacker.ability == "Sniper") {
                playerDamageRoll = Math.trunc(playerDamageRoll / 1.5);
            }
        }

        if (playerDamageRoll > playerHighestRoll) {
            playerHighestRoll = playerDamageRoll;
        }
    });

    // console.log(damagingMoveDist); // DEBUG

    // this should work fine, may need more variables and need to test them but it all lgtm so far

    // If player has 1 move and 1 roll that kill AI at their current health, this is true
    const aiDeadToPlayer = playerHighestRoll >= moves[0].attacker.originalCurHP &&
         !((moves[0].move.ability == "Sturdy" || moves[0].move.item == "Focus Sash") && moves[0].attacker.originalCurHP == moves[0].attacker.stats.hp);
    const aiTwoHitKOd = playerHighestRoll * 2 >= moves[0].attacker.originalCurHP;     
    const aiThreeHitKOd = playerHighestRoll * 3 >= moves[0].attacker.originalCurHP;
    const playerHasStatusCond = playerMon.status != "";
    const playerTypes: string[] = playerMon.types;
    const playerAbility = moves[0].defender.moves[0].ability; // ugly but works
    const playerHealthPercentage = Math.trunc((moves[0].defender.originalCurHP / moves[0].defender.stats.hp) * 100);
    const aiHealthPercentage = Math.trunc((moves[0].attacker.originalCurHP / moves[0].attacker.stats.hp) * 100);
    const aiMaxedOutAttack = moves[0].attacker.boosts.atk == 6;
    const aiMonName = moves[0].attacker.name;
    const aiItem = moves[0].attacker.item;
    const playerSideSpikes = moves[0].field.defenderSide.spikes > 0;
    const playerSideTSpikes = moves[0].field.defenderSide.tspikes > 0;
    const aiReflect = moves[0].field.attackerSide.isReflect;
    const aiLightScreen = moves[0].field.attackerSide.isLightScreen;
    const aiHasTailwind = moves[0].field.attackerSide.isTailwind;
    const terrain = moves[0].field.terrain;
    const aiSlowerButFasterAfterPara = !aiFaster && moves[0].attacker.stats.spe > Math.trunc(moves[0].defender.stats.spe / 4);
    const trickRoomUp = moves[0].field.isTrickRoom;
    const playerLeechSeeded = moves[0].field.defenderSide.isSeeded;
    const aiHasAnyStatRaised = Object.values(moves[0].attacker.boosts).some(value => (value as number) > 0);
    // TODO: create this and use where applicable
    // TODO: add thaw moves + recharging, loafing around due to truant
    const playerIncapacitated = playerMon.status == "frz" || playerMon.status == "slp";

    // console.log(moves[0].attacker.boosts);

    // console.log(moves[0]);
    
    // ai options
    const firstTurnOut = aiOptions["firstTurnOutAiOpt"];
    const suckerPunchUsedLastTurn = aiOptions["suckerPunchAiOpt"];
    const aiLastMonOut = aiOptions["lastMonAiOpt"];
    const playerLastMonOut = aiOptions["playerLastMonAiOpt"];
    const playerCharmedOrConfused = aiOptions["playerCharmedOrConfusedAiOpt"];
    const playerTaunted = aiOptions["tauntAiOpt"];
    const playerImprisoned = aiOptions["imprisonAiOpt"];
    const encoreIncentive = aiOptions["encoreAiOpt"];
    const playerFirstTurnOut = aiOptions["playerFirstTurnOutAiOpt"]; // or encored

    // debug logging
    const debugLogging = aiOptions["enableDebugLogging"];

    let postBoostsMoveDist: KVP[] = [];

    // flat bonsues
    // key - "Move1:X/Move2:Y/Move3:Z/Move4:A"
    // value - 0.003125 (probability of getting those exact scores)
    for (const damagingMoveDistKVP of damagingMoveDist) {
        let moveArr = damagingMoveDistKVP.key.split('/');
        let moveStringsToAdd: { move: string, score: number, rate: number }[] = [];

        // this contains what needs to be added to the postDist from the damagingMoveDist
        // starts with the current entry as a base
        let moveKVPs: KVP[] = [
            {
                key: damagingMoveDistKVP.key,
                value: damagingMoveDistKVP.value
            }
        ];

        // this returns if *this* damagingMoveDistKVP sees a kill
        const aiSeesKill = getAISeesKill(moveArr, moves[0].ability);

        // iterate through each move
        moveArr.forEach((moveScoreString, index) => {
            // moveScoreString - "Move1:X" where X is the score of the move
            const move = moves[index].move;
            const moveName = moveScoreString.split(':')[0];
            const moveScore: number = Number(moveScoreString.split(':')[1]);
            const damageRolls = moves[index].damageRolls();
            const highestRoll = Math.max(...damageRolls);
            // anyValidDamageRolls should prevent Ghost type moves being chosen to hit normal types
            // this just checks sum of damageRolls to make sure it's a positive number
            const anyValidDamageRolls = damageRolls.reduce((a: number, b: number) => a + b, 0) > 0;
            const currentMoveCanKill = highestRoll >= moves[index].defender.originalCurHP;

            // TODO: Need to go through and add anyValidDamageRolls to a lot of these checks
            // TODO: This function can probably use continues, so I probably should do that for performance lol

            // console.log(move);

            // Damaging Priority moves
            // if AI is dead to player mon and slower, 
            // all attacking moves with priority get an additional +11
            if (move.priority > 0 && !aiFaster && aiDeadToPlayer && anyValidDamageRolls) {
                moveStringsToAdd.push({
                    move: moveName,
                    score: 11,
                    rate: 1
                });
            }

            // just ensure that prio moves aren't clicked in psychic terrain
            if (move.priority > 0 && terrain == "Psychic") {
                moveStringsToAdd.push({
                    move: moveName,
                    score: -40,
                    rate: 1
                });
            }

            // Damaging Trapping Moves
            // Always +6 80%, +8 20%
            if (isTrapping(move) && anyValidDamageRolls) {
                moveStringsToAdd.push(... [{
                    move: moveName,
                    score: 6,
                    rate: 1
                },
                {
                    move: moveName,
                    score: 2,
                    rate: 0.2
                }]);
            }

            // Damaging speed reduction moves
            // Only applied if not highest damage already
            const isDamagingSpeedReducing = moveName == "Icy Wind" || moveName == "Electroweb" || moveName == "Rock Tomb" || moveName == "Mud Shot" || moveName == "Low Sweep";
            if (isDamagingSpeedReducing && moveScore == 0) {
                if (playerAbility != "Contrary" && playerAbility != "Clear Body" && playerAbility != "White Smoke" && !aiFaster) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 5,
                        rate: 1
                    });
                }
                // TODO: double battle +1 to Icy Wind and Electroweb
            }

            // Damaging Atk/SpAtk reduction moves w/ guaranteed effect
            // TODO: there are probably more
            // TODO: need to take kill bonus into account, unsure how to rn
            if (isNamed(moveName, "Skitter Smack", "Trop Kick") && moveScore == 0) {
                const affectedMoveType = moveName == "Trop Kick" ? "Physical" : "Special";
                if (playerAbility != "Contrary" && playerAbility != "Clear Body" && playerAbility != "White Smoke" &&
                    playerMoves.findIndex((x: { move: { category: string; }; }) => x.move.category === affectedMoveType))
                {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 5,
                        rate: 1
                    });
                }
                // TODO: double battle +1 to spread moves
            }

            // Damaging -2 SpDef reduction moves w/ guaranteed effect
            // Always +6, stacks with other boosts
            if (moveName == "Acid Spray") {
                moveStringsToAdd.push({
                    move: moveName,
                    score: 6,
                    rate: 1
                });
            }

            // Future Sight
            // +8 if ai is faster and dead to player, +6 otherwise
            if (moveName == "Future Sight") {
                if (aiFaster && aiDeadToPlayer) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 8,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                }
            }

            // Relic Song
            // +10 if Meloetta base form
            // -20 if Meloetta Piroutette
            // stacks with kills/HD
            if (moveName == "Relic Song") {
                if (aiMonName == "Meloetta-Pirouette") {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 10,
                        rate: 1
                    });
                }
            }

            // Sucker Punch
            // If sucker punch used last turn, -20 50% of the time
            if (moveName == "Sucker Punch" && suckerPunchUsedLastTurn) {
                moveStringsToAdd.push({
                    move: moveName,
                    score: -20,
                    rate: 0.5
                });
            }

            // Pursuit
            // +10 if can KO (stacks with kill bonuses)
            // +3 if faster (stacks with kill bonuses)
            // Player below 20% +10
            // Player below 40%, +8 (50%)
            if (moveName == "Pursuit") {
                if (currentMoveCanKill) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 10,
                        rate: 1
                    });
                } else {
                    if (playerHealthPercentage < 20) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 10,
                            rate: 1
                        });
                    } else if (playerHealthPercentage < 40) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 8,
                            rate: 0.5
                        });
                    }
                }

                if (aiFaster) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 3,
                        rate: 1
                    })
                }
            }

            // Fell Stinger
            // If not max atk, and fell stinger kills TOTAL score is
                // faster +21 (80%), +23 (20%)
                // slower +15 (80%), +17 (20%)
            // no change otherwise
            if (moveName == "Fell Stinger" && !aiMaxedOutAttack && currentMoveCanKill) {
                if (aiFaster) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 21 - moveScore,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 15 - moveScore,
                        rate: 1
                    });
                }
                moveStringsToAdd.push({
                    move: moveName,
                    score: 2,
                    rate: 0.2
                });
            }

            // Rollout
            // Always +7
            if (moveName == "Rollout") {
                moveStringsToAdd.push({
                    move: moveName,
                    score: 7,
                    rate: 1
                });
            }

            // TODO: these setup moves need a common sense -40 if they're already all out
            // Stealth Rock
            if (moveName == "Stealth Rock") {
                if (firstTurnOut) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 8,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                }

                moveStringsToAdd.push({
                    move: moveName,
                    score: 1,
                    rate: 0.75
                })
            }

            // Spikes, Toxic Spikes
            if (moveName == "Spikes" || moveName == "Toxic Spikes") {
                // if max layers of spikes are out, never used
                if (moveName == "Spikes" && moves[0].field.defenderSide.spikes >= 3 ||
                    moveName == "Toxic Spikes" && moves[0].field.defenderSide.tspikes >= 2) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: -40,
                            rate: 1
                        });
                } else {
                    if (firstTurnOut) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 8,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 6,
                            rate: 1
                        });
                    }
                    
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 1,
                        rate: 0.75
                    });
                    
                    // IF PLAYER SPIKES ARE UP -1 ALWAYS
                    if ((moveName == "Spikes" && playerSideSpikes) || 
                        ((moveName == "Toxic Spikes") && playerSideTSpikes)) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: -1,
                            rate: 1
                        });
                    }
                }
            }

            // Sticky Web
            if (moveName == "Sticky Web") {
                if (firstTurnOut) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 9,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                }
                
                moveStringsToAdd.push({
                    move: moveName,
                    score: 3,
                    rate: 0.75
                })
            }

            // Protect, King's Shield, Spiky Shield

            // Fling, Role Play, doubles weakness policy, magnitude, eq is just for doubles, so leave it for now

            // Imprison
            // One move in common +9, else -20
            if (moveName == "Imprison") {
                const playerMoveNames = playerMoves.map(x => x.move.name);
                console.log(playerMoveNames); // debug
                const movesInCommon = movesetHasMoves(moves, ...playerMoveNames);
                if (!movesInCommon || playerImprisoned) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 9,
                        rate: 1
                    });
                }
            }

            // Baton Pass
            if (moveName == "Baton Pass") {
                if (aiLastMonOut) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else if (moves[0].field.attackerSide.isSubstitute || aiHasAnyStatRaised) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 14,
                        rate: 1
                    });
                } else { // this is important so it doesn't overwrite to +6 whenever we set default to +6
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 0,
                        rate: 1
                    });
                }
            }

            // Tailwind
            if (moveName == "Tailwind") {
                // TODO: update for doubles if needed
                if (!aiHasTailwind) {
                    if (!aiFaster) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 9,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 5,
                            rate: 1
                        });
                    }
                } else { // useless move, tailwind is up
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                }
            }

            // Trick Room
            if (moveName == "Trick Room") {
                if (trickRoomUp) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    // TODO: doubles update
                    if (!aiFaster) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 10,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 5,
                            rate: 1
                        });
                    }
                }
            }

            // Fake Out
            if (moveName == "Fake Out") {
                if (firstTurnOut && (playerAbility != "Shield Dust" && playerAbility != "Inner Focus")) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 9,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                }
            }

            // Helping Hand, Follow Me (just make it -6 since no doubles)

            // Final Gambit
            if (moveName == "Final Gambit") {
                if (aiFaster && moves[index].attacker.originalCurHP > moves[index].defender.originalCurHP) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 8,
                        rate: 1
                    });
                } else if (aiFaster && aiDeadToPlayer) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 7,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                }
            }

            // Terrain
            // If Holding Terrain Extender +9, else +8. If already Terrain -20
            if (moveName.endsWith(" Terrain")) {
                // I think there's only ever one terrain type per team, so this should be fine. 
                // If it's broken fix it obvs
                if (terrain != "" ) {
                    if (aiItem != "Terrain Extender") {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 9,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 8,
                            rate: 1
                        });
                    }
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                }
            }

            // Light Screen / Reflect
            // starts at +6, +1 if holding light clay, +1 (50%). If screen is already up -20
            // TODO: need to add status move category to all moves (instead of them being listed as physical)
            if (moveName == "Light Screen" || moveName == "Reflect") {
                // useless move check
                if ((moveName == "Light Screen" && aiLightScreen) || 
                    ((moveName == "Reflect") && aiReflect)) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
                    // TODO: continue from here this is broken
                }
            }

            // Substitute
            if (moveName == "Substitute") {
                // if Infiltrator, at or below 50% health, or sub already up
                if (playerAbility == "Infiltrator" || 
                    aiHealthPercentage <= 50 ||
                    moves[0].field.attackerSide.isSubstitute) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    let subScore = 6;
                    if (playerMon.status == "slp") { subScore += 2; }
                    if (playerLeechSeeded && aiFaster) { subScore += 2; }
                    if (movesetHasSoundMove(playerMoves)) { subScore -= 8; }
    
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: subScore,
                        rate: 1
                    },
                    { // always -1 50%
                        move: moveName,
                        score: -1,
                        rate: 0.5
                    }]);
                }
            }

            // Explosion, Self Destruct, Misty Explosion
            if (moveName == "Explosion" || moveName == "Self Destruct" || moveName == "Misty Explosion") {
                const boomUseless = !anyValidDamageRolls || (aiLastMonOut && !playerLastMonOut);
                const aiHealthPercentage = Math.trunc((moves[0].attacker.originalCurHP / moves[0].attacker.stats.hp) * 100);

                if (boomUseless) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else if (aiHealthPercentage < 10) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 10,
                        rate: 1
                    });
                } else if (aiHealthPercentage < 33) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 8,
                        rate: .7
                    });
                } else if (aiHealthPercentage < 66) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 7,
                        rate: 0.5
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 7,
                        rate: 0.05
                    });
                }

                if (aiLastMonOut && playerLastMonOut) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -1,
                        rate: 1
                    });
                }
            }

            // Memento
            if (moveName == "Memento") {
                const aiHealthPercentage = Math.trunc((moves[0].attacker.originalCurHP / moves[0].attacker.stats.hp) * 100);
                if (aiLastMonOut) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else if (aiHealthPercentage < 10) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 16,
                        rate: 1
                    });
                } else if (aiHealthPercentage < 33) {
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 6,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 8,
                        rate: 0.7
                    }]);
                } else if (aiHealthPercentage < 66) {
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 6,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 7,
                        rate: 0.5
                    }]);
                } else {
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 6,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 7,
                        rate: 0.05
                    }]);
                }
            }

            // Thunder Wave, Stun Spore, Glare, Nuzzle
            if (moveName == "Thunder Wave" || moveName == "Stun Spore" || moveName == "Nuzzle" || moveName == "Glare") {
                const hexIndex = moves.findIndex(x => x.move.name === "Hex"); // hehe inHEX more like
                var paraIncentive = aiSlowerButFasterAfterPara || hexIndex != -1 || playerCharmedOrConfused;

                if (playerHasStatusCond || 
                    (move.type == "Electric" && (playerTypes.includes("Ground") || playerTypes.includes("Electric")))) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else if (paraIncentive) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 8,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 7,
                        rate: 1
                    });
                }

                // always -1 50%
                moveStringsToAdd.push({
                    move: moveName,
                    score: -1,
                    rate: 0.5
                });
            }
            
            // Will-o-Wisp
            // Starts at +6
            // 37% of the time, the following conditions are checked
            // If target has a physical attacking move +1
            // If AI mon or partner has Hex +1
            if (moveName == "Will-O-Wisp") {
                // any intuitive condition where AI won't click status move
                if (playerHasStatusCond || playerTypes.findIndex((type: string) => type == "Fire") != -1) { 
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    // starts at +6
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });

                    let willOWispScore = 0;
                    const hexIndex = moves.findIndex(x => x.move.name === "Hex"); // hehe inHEX more like
                    // TODO: status moves are listed as physical so they increase the Will-O-Wisp chance
                    const physicalIndex = damageResults[0].findIndex((x: { move: { category: string; }; }) => x.move.category === "Physical");
                    if (hexIndex !== -1) { willOWispScore++; }
                    if (physicalIndex !== -1) { willOWispScore++; }


                    moveStringsToAdd.push({
                        move: moveName,
                        score: willOWispScore,
                        rate: 0.37
                    });
                }
            }

            // Trick, Switcheroo
            if (moveName == "Trick" || moveName == "Switcheroo") {
                if (aiItem == "Toxic Orb" || aiItem == "Flame Orb" || aiItem == "Black Sludge") {
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 6,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 1,
                        rate: 0.5
                    }]);
                } else {
                    if (aiItem == "Iron Ball" || aiItem == "Lagging Tail" || aiItem == "Sticky Barb") {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 7,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 5,
                            rate: 1
                        });
                    }
                }
            }

            // Yawn, Dark Void, Grasswhistle, Sing
            if (moveName == "Yawn" || moveName == "Dark Void" || moveName == "Grasswhistle" || moveName == "Sing" || moveName == "Hypnosis") {
                const sleepPreventingAbility = playerAbility == "Insomnia" || playerAbility == "Vital Spirit" || playerAbility == "Sweet Veil";
                if (sleepPreventingAbility || playerHasStatusCond || terrain == "Electric" || terrain == "Misty") { 
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });

                    let sleepScore: number = 0;
                    
                    if (!aiSeesKill) {
                        sleepScore++;
                        const dreamEaterIndex = moves.findIndex(x => x.move.name === "Dream Eater");
                        const nightmareIndex = moves.findIndex(x => x.move.name === "Nightmare");
                        const snoreIndex = playerMoves.findIndex(x => x.move.name == "Snore");
                        const sleepTalkIndex = playerMoves.findIndex(x => x.move.name == "Sleep Talk");
                        
                        if ((dreamEaterIndex != -1 || nightmareIndex != -1) && (snoreIndex == -1 && sleepTalkIndex == -1)) { sleepScore++; }
                        
                        // needs update for doubles one day
                        const hexIndex = moves.findIndex(x => x.move.name === "Hex"); // hehe inHEX more like
                        if (hexIndex != -1) { sleepScore++; }

                        moveStringsToAdd.push({
                            move: moveName,
                            score: sleepScore,
                            rate: 0.25
                        });
                    }
                }
            }

            // Poisoning Moves
            if (isNamed(moveName, "Toxic", "Poison Gas", "Poison Powder")) {
                if (playerHasStatusCond ||
                    ((playerTypes.includes("Poison") || playerTypes.includes("Steel")) && moves[0].ability != "Corrosion")) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    // Starts at +6
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });

                    // if player mon can be poisoned and is above 20% HP
                    if (playerHealthPercentage > 20 && !aiDeadToPlayer) {
                        let toxScore = 0;

                        if (playerHighestRoll == 0) { toxScore++; }
                        if (movesetHasMoves(moves, "Hex", "Venom Drench") || moves[0].ability == "Merciless") {
                            toxScore += 2;
                        } else {
                            toxScore++;
                        }
    
    
                        moveStringsToAdd.push({
                            move: moveName,
                            score: toxScore,
                            rate: 0.38
                        });
                    }
                }
            }

            // General Setup
            if (isNamed(moveName, "Power-up Punch", "Swords Dance", "Howl",
                "Stuff Cheeks", "Barrier", "Acid Armor", "Iron Defense", "Cotton Guard",
                "Charge Beam", "Tail Glow", "Nasty Plot", "Cosmic Power",
                "Bulk Up", "Calm Mind", "Dragon Dance", "Coil", "Hone Claws", "Quiver Dance",
                "Shift Gear", "Shell Smash", "Growth", "Work Up", "Curse", "No Retreat")) {
                if (aiDeadToPlayer || 
                    ((moveName != "Power-up Punch" && moveName != "Swords Dance" && moveName != "Howl") &&
                    playerAbility == "Unaware")) { 
                        moveStringsToAdd.push({
                            move: moveName,
                            score: -20,
                            rate: 1
                        });
                    }
            }

            // Coil, Bulk Up, Calm Mind, Quiver Dance
            // (above Offensive and Defensive so we can decide where to send it)
            // TODO: requires status move designation

            // Offensive Setup
            // TODO: funnel some moves to this sometimes
            // i.e. Coil, Bulk Up, Calm Mind, Quiver Dance, Curse (non ghost type)
            if (isNamed(moveName, "Dragon Dance", "Shift Gear", "Swords Dance", "Howl",
                "Sharpen", "Meditate", "Hone Claws")) {
                let offensiveScore = 6;

                if (playerIncapacitated) { 
                    offensiveScore += 3; 
                } 
                // comented out because of run and bug
                /* else if (!aiThreeHitKOd) {
                    offensiveScore++;
                    if (aiFaster) { offensiveScore++; }
                } */

                if (!aiFaster && aiTwoHitKOd) {
                    offensiveScore -= 5;
                }

                // if AI is at +2 Atk or higher
                // commented out cause run and bug
                /* if (moves[0].attacker.boosts.atk >= 2) {
                    offensiveScore--;
                } */

                moveStringsToAdd.push({
                    move: moveName,
                    score: offensiveScore,
                    rate: 1
                });
            }

            // Defensive Setup
            // TODO: funnel some moves to this sometimes
            // i.e. Coil, Bulk Up, Calm Mind, Quiver Dance, Curse (non ghost type)
            // Coil, Bulk Up, Calm Mind, Quiver Dance, Curse (falls under setups above, see doc)
            // (moveName == "Curse" && !moves[0].attacker.types.includes("Ghost"))
            if (isNamed(moveName, "Acid Armor", "Barrier", "Cotton Guard", "Harden", "Iron Defense",
                "Stockpile", "Cosmic Power")) {
                // this may need updating this is off my memory
                const boostsDefAndSpDef = isNamed(moveName, "Stockpile", "Cosmic Power");
                
                let initialDefensiveScore = 6;
                if (!aiFaster && aiTwoHitKOd) {
                    initialDefensiveScore -= 5;
                }

                moveStringsToAdd.push({
                    move: moveName,
                    score: initialDefensiveScore,
                    rate: 1
                });

                // for the 95% checks
                let defensiveScore = 0;

                if (playerIncapacitated) { defensiveScore += 2; }

                if (boostsDefAndSpDef && (moves[0].attacker.boosts.def < 2 || moves[0].attacker.boosts.spdef < 2)) {
                    defensiveScore += 2;
                }

                moveStringsToAdd.push(...[{
                    move: moveName,
                    score: defensiveScore,
                    rate: 0.95
                }]);
            }

            // Agility, Rock Polish, Autotomize
            // If AI is slower than player mon +7, else -20
            if (moveName == "Agility" || moveName == "Rock Polish" || moveName == "Autotomize") {
                if (aiFaster) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 7,
                        rate: 1
                    });
                }
            }

            // Tail Glow, Nasty Plot, Work Up
            if (moveName == "Tail Glow" || moveName == "Nasty Plot" || moveName == "Work Up") {
                // starts at +6
                let score: number = 6;

                // if player incapacitated +3
                if (playerIncapacitated) {
                    score += 3;
                } else if (!aiThreeHitKOd) {
                    score += 1;
                    if (aiFaster) { score++; }
                }

                if (!aiFaster && aiTwoHitKOd) {
                    score -= 5;
                }

                if (moves[0].attacker.boosts.spatk >= 2) {
                    score--;
                }

                moveStringsToAdd.push({
                    move: moveName,
                    score: score,
                    rate: 1
                });
            }

            // Shell Smash
            if (moveName == "Shell Smash") {
                // starts at +6
                let score: number = 6;

                if (playerIncapacitated) { score += 3; }

                // if player cannot KO AI if Shell Smash is used this turn +2

                // if player mon can KO AI mon if Shell Smash is used this turn -2

                // TODO: these checks take white herb into account and will need to call the calc itself to reroll that info

                if (moves[0].attacker.boosts.atk >= 1 || moves[0].attacker.boosts.spatk >= 6) {
                    score -= 20;
                }

                moveStringsToAdd.push({
                    move: moveName,
                    score: score,
                    rate: 1
                });
            }

            // Belly Drum
            if (moveName == "Belly Drum") {
                const sitrusRecovery = aiItem == "Sitrus Berry" ? Math.trunc(moves[0].attacker.stats.hp / 4) : 0;
                const hpAfterBellyDrum = moves[0].attacker.originalCurHP - Math.trunc(moves[0].attacker.stats.hp / 2) + sitrusRecovery;
                const aiNotDeadAfterBellyDrum = playerHighestRoll >= hpAfterBellyDrum;
                if (aiMaxedOutAttack  || moves[0].attacker.originalCurHP - Math.trunc(moves[0].attacker.stats.hp / 2) <= 0) { // useless move
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else if (playerIncapacitated) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 9,
                        rate: 1
                    });
                } else if (aiNotDeadAfterBellyDrum) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 8,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 4,
                        rate: 1
                    });
                }
            }

            // Focus Energy, Laser Focus
            // If AI has Super Luck/Sniper, holding Scope Lens, or has a high crit rate move +7, else +6
            if (moveName == "Focus Energy" || moveName == "Laser Focus") {
                const critIncentive = move.ability == "Super Luck" || move.ability == "Sniper"
                                        || move.item == "Scope Lens" || movesetHasHighCritRatioMove(moves);
                if ((moveName == "Focus Energy" && moves[0].field.attackerSide.isFocusEnergy) ||
                    playerAbility == "Shell Armor" || playerAbility == "Battle Armor") {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    if (critIncentive) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 7,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 6,
                            rate: 1
                        });
                    }
                }
            }

            // Coaching
            // TODO: doubles update
            if (moveName == "Coaching") {
                moveStringsToAdd.push({
                    move: moveName,
                    score: -20,
                    rate: 1
                });
            }

            // Contrary edge cases

            // Meteor Beam
            // +9 if holding Power Herb, -20 otherwise
            if (moveName == "Meteor Beam") {
                if (move.item == "Power Herb") {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 9,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                }
            }

            // Destiny Bond
            // If AI is faster and dies to player mon +7 (81%), +6 (19%)
            // If AI is slower, +5 (50%), +6 (50%)
            if (moveName == "Destiny Bond") {
                if (aiFaster && aiDeadToPlayer) { 
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 6,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 1,
                        rate: 0.81
                    }]);
                }
                
                if (!aiFaster) {
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 5,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 1,
                        rate: 0.5
                    }]);
                }
            }

            // Recovery Moves

            // Sun Based Recovery

            // Rest

            // Taunt
            if (moveName == "Taunt") {
                if (playerTaunted) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    if ((movesetHasMove(playerMoves, "Trick Room") && !trickRoomUp) ||
                        movesetHasMove(playerMoves, "Defog") && moves[0].field.attackerSide.isAuroraVeil && aiFaster) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 9,
                            rate: 1
                        });
                    } else {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 5,
                            rate: 1
                        });
                    }
                }
            }

            // Encore
            // kind of TODO? Doc says...
                //  If AI is faster and Encore Encouraged +7
                //  IF AI is slower: +5/+6 50/50
            // it says nothing about ai faster and not encouraged. I assume its +6
            // didn't see anything in the discord about it either
            if (moveName == "Encore") {
                // this also takes into account if player is already encored
                if (playerFirstTurnOut) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    if (aiFaster && encoreIncentive) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 7,
                            rate: 1
                        });
                    } else if (!aiFaster) {
                        moveStringsToAdd.push(...[{
                            move: moveName,
                            score: 5,
                            rate: 1
                        },
                        {
                            move: moveName,
                            score: 1,
                            rate: 0.5
                        }
                        ]);
                    }
                }
            }

            // Counter, Mirror Coat
            // TODO: needs status move type
            if (moveName == "Counter" || moveName == "Mirror Coat") {

            }
        });

        // TODO IF...
        // move is not in moveStringsToAdd
        // AND
        // move is score of 0
        // AND
        // move is status
        // set score to +6 as a default
        
        // iterate through all move strings and update the move kvps
        for (const moveStringToAdd of moveStringsToAdd) {
            moveKVPs = updateMoveKVPWithMoveStrings(moveKVPs, moveStringToAdd);
        }
        
        for (const moveKVP of moveKVPs) {
            addOrUpdateProbability(postBoostsMoveDist, moveKVP.key, moveKVP.value);
        }
    }

    // console.log("damagingMoveDist before it goes into postBoostsMoveDist");
    if (debugLogging) {
        console.log(postBoostsMoveDist); // DEBUG
    }
    
    // actually measure score and calculate probability of each move
    for (const dist of postBoostsMoveDist) {
        let moveArr = dist.key.split('/');

        let maxScore = 0;
        let moves: number[] = [];

        moveArr.forEach((moveScoreString, index) => {
            // const moveName = moveScoreString.split(':')[0]; // unnessesary for now
            const scoreString = moveScoreString.split(':')[1];
            let score = Number(scoreString);

            if (score > maxScore) {
                maxScore = score;
                moves = [];
                moves.push(index);
            }
            else if (score === maxScore) {
                moves.push(index);
            }
        });
        
        moves.forEach((move) => {
            finalDist[move] += dist.value / moves.length;
        });
    }

    // console.log(finalDist);
    return finalDist;
}