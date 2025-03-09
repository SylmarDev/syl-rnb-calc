import { Result } from './result';
import { Move } from './move';
import { Pokemon } from '.';

// interfaces
interface KVP {
    key: string,
    value: number
}

// move functions
function isNamed(move: Move, ...names: string[]) {
    return names.includes(move.name);
}

function isTrapping(move: Move) {
    return isNamed(move, 'Whirlpool', 'Fire Spin', 'Sand Tomb', 'Magma Storm', 'Infestation', 'Wrap', 'Bind');
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
    // And for calculating the new damage values of multi hit moves

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
            isNamed(moves[i].move, "Explosion", "Final Gambit", "Rollout") ||
            isNamed(moves[i].move, "Relic Song", "Meteor Beam", "Future Sight") ||
            isTrapping(moves[i].move))
            {
                i++;
                continue;
            }

            keysForMaximumCheck.push(key);
            i++;
       }

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

           // skip these moves entirely
           if (moves[i].move.category === "Status" ||
                isNamed(moves[i].move, "Explosion", "Final Gambit", "Rollout"))
           {
               keyString += `${moveName}:0`;
               i++;
               continue;
           }
           
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
           }

           // TODO: add the crit chance + super effective rule
           // TODO: will have to get high crit ratio moves from a predefined list
           // not sure how I'll get super effectives
           
           // moves that do not have damage rolled normally, still get the boosts for kills.
           if (isTrapping(moves[i].move) || isNamed(moves[i].move, "Relic Song", "Meteor Beam", "Future Sight")) {
                keyString += `${moveName}:${moveBonus}`;
                i++;
                continue;
           }

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

    //console.log(probabilitiesWithVariance); // Debug
    return probabilitiesWithVariance;
}

/**
 * Generates the move distribution.
 * @param {any[]} damageResults - damageResults of current calc state
 * @param {string} fastestSide - 0 if player, 1 if AI. "tie" if tie
 * @returns {number[]} The move distribution.
 */
export function generateMoveDist(damageResults: any[], fastestSide: string): number[] {
    // DEBUG
    // console.log(damageResults);

    // set variables, parsed from move dist
    const moves: any[] = damageResults[1];
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
    const playerHasStatusCond = playerMon.status != "";
    const playerTypes: string[] = playerMon.types;
    const playerAbility = moves[0].defender.moves[0].ability; // ugly but works
    const playerHealthPercentage = Math.round((moves[0].defender.originalCurHP / moves[0].defender.stats.hp) * 100);
    const aiMaxedOutAttack = moves[0].attacker.boosts.atk == 6;
    const aiMonName = moves[0].attacker.name;

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
            const canKill = highestRoll >= moves[index].defender.originalCurHP;

            // TODO: Need to go through and add anyValidDamageRolls to a lot of these checks
            // TODO: apparently these *set* the score if set to 1, so go back and ensure that stacking scores correctly

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

            // Damaging Trapping Moves
            // Always +6 80%, +8 20%
            if (isTrapping(move)) {
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
            // TODO: will need a list for this

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
            // TODO: will need to add a conditional checkbox to the calc

            // Pursuit
            // +10 if can KO (stacks with kill bonuses)
            // +3 if faster (stacks with kill bonuses)
            // Player below 20% +10
            // Player below 40%, +8 (50%)
            if (moveName == "Pursuit") {
                if (canKill) {
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
            if (moveName == "Fell Stinger" && !aiMaxedOutAttack && canKill) {
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

            // these setup moves all require a "first turn out" checkbox
            // Stealth Rock

            // Spikes, Toxic Spikes

            // Sticky Web

            // Protect, King's Shield, Spiky Shield

            // Fling, Role Play, doubles weakness policy, magnitude, eq is just for doubles, so leave it for now

            // Imprison
            // One move in common +9, else -20

            // Baton Pass

            // Tailwind

            // Trick Room
            
            // Fake Out

            // Helping Hand, Follow Me (just make it -6 since no doubles)

            // Final Gambit

            // Terrain
            // If Holding Terrain Extender +9, else +8. If already Terrain -20

            // Light Screen / Reflect
            // starts at +6, +1 if holding light clay, +1 (50%). If screen is already up -20

            // Substitute

            // Explostion, Self Destruct, Misty Explosion

            // Memento

            // Thunder Wave, Stun Spore, Glare, Nuzzle
            
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

            // Yawn, Dark Void, Grasswhistle, Sing

            // Poisoning Moves

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

            // Shell Smash

            // Belly Drum

            // Focus Energy, Laser Focus
            // If AI has Super Luck/Sniper, holding Scope Lens, or has a high crit rate move +7, else +6
            if (moveName == "Focus Energy" || moveName == "Laser Focus") {
                // TODO: add high crit rate moves to this
                // TODO: add player mon has shell armor or battle armor to this
                const critIncentive = move.ability == "Super Luck" || move.ability == "Sniper"
                                        || move.item == "Scope Lens"; 
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

            // Coaching

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

            // Encore

            // Counter, Mirror Coat
        });
        
        // iterate through all move strings and update the move kvps
        for (const moveStringToAdd of moveStringsToAdd) {
            moveKVPs = updateMoveKVPWithMoveStrings(moveKVPs, moveStringToAdd);
        }        
        
        for (const moveKVP of moveKVPs) {
            addOrUpdateProbability(postBoostsMoveDist, moveKVP.key, moveKVP.value);
        }
    }

    // console.log("damagingMoveDist before it goes into postBoostsMoveDist");
    // console.log(postBoostsMoveDist); // DEBUG
    
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