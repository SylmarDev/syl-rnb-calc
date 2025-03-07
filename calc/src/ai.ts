import { Result } from './result';
import { Move } from './move';

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
    return isNamed(move, 'Whirlpool', 'Fire Spin', 'Sand Tomb', 'Magma Storm', 'Infestation', 'Wrap');
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
    
    //console.log(allChoices); // debug
    
    for (let choice of allChoices) {
       let keys = choice.map(([key, value]) => key);
       let moveProbabilities: number[] = choice.map(([key, value]) => Number(value));

       let maximumKey = Math.max(...keys);

       // generate keystring
       let keyStrings = [];
       let keyString = "";
       let i = 0;
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
           if (isTrapping(moves[i]) || isNamed(moves[i].move, "Relic Song", "Meteor Beam", "Future Sight")) {
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

    //console.log(probabilities); // debug
    
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
    // set variables, parsed from move dist
    const moves: any[] = damageResults[1];
    const aiFaster: boolean = fastestSide != "0";

    let finalDist: number[] = [];
    moves.forEach((move, i) => {
        finalDist[i] = 0.0;
    });
    
    let damagingMoveDist = calculateHighestDamage(moves);

    // console.log(damagingMoveDist); // DEBUG

    // TODO: cont from here probably, pull in all field info for best calcs
    // TODO: used in a lot of checks
    // TODO: this needs to check if dead to player, maybe pass it in?
    // If player has 1 move and 1 roll that kill AI at their current health, this is true
    //console.log(damageResults[0]); // DEBUG
    const aiDeadToPlayer = true;
    const playerHasStatusCond = false; // TODO: needs to be refactored to have this passed in as well

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
            const damageRolls = moves[index].damageRolls();
            // anyValidDamageRolls should prevent Ghost type moves being chosen to hit normal types
            const anyValidDamageRolls = damageRolls.reduce((a: number, b: number) => a + b, 0) > 0;

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

            // Rollout
            // Always +7
            if (moveName == "Rollout") {
                moveStringsToAdd.push({
                    move: moveName,
                    score: 7,
                    rate: 1
                });
            }

            // Will-o-Wisp
            // Starts at +6
            // 37% of the time, the following conditions are checked
            // If target has a physical attacking move +1
            // If AI mon or partner has Hex +1
            if (moveName == "Will-O-Wisp") {
                if (playerHasStatusCond) { // any intuitive condition where AI won't click status move
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
    // console.log(postBoostsMoveDist);
    
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