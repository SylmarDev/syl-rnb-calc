import { Result } from './result';
import { Move } from './move';

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
function addOrUpdateProbability(probabilities: { [key: string]: number }, newKey: string, value: number) {
    if (probabilities.hasOwnProperty(newKey)) {
        probabilities[newKey] += value;
    } else {
        probabilities[newKey] = value;
    }
}

function updateProbabilityWithVariance(probabilities: { [key: string]: number }, key: string, prob: number, factor: number, replacement: string[]) {
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

function calculateHighestDamage(moves: any[]): { [key: number]: number } {
    let p1CurrentHealth = moves[0].defender.curHP();
    let arrays = moves.map(move => move.damageRolls().map((roll: number) => Math.min(p1CurrentHealth, roll)));
    let aiFaster = moves[0].attacker.stats.spe >= moves[0].defender.stats.spe;

    // list of damage distributions for the move
    let moveDistributions = arrays.map(array => computeDistribution(array));

    // calculate the probability distribution of which dict will have the highest key
    let probabilities: { [key: string]: number } = {};

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
        for (let probability of moveProbabilities) {
            probabilityOfChoice *= Number(probability);
        }
        //console.log(probabilityOfChoice); // Debug

        keyStrings = setKeyStrings(keyString, ["HD"]);

        for (let keyString of keyStrings) {
            //console.log(keyStrings); // Debug
            const probabilityToAdd = probabilityOfChoice / keyStrings.length;
            addOrUpdateProbability(probabilities, keyString, probabilityToAdd);
        }
    }

    // update probabilities with variance
    let probabilitiesWithVariance = {};

    //console.log(probabilities); // debug
    
    for (const [key, prob] of Object.entries(probabilities)) {
        if (key.includes("HD")) {
            updateProbabilityWithVariance(probabilitiesWithVariance, key, prob, 0.8, ["HD", "6"]);
            updateProbabilityWithVariance(probabilitiesWithVariance, key, prob, 0.2, ["HD", "8"]);
        } else {
            addOrUpdateProbability(probabilitiesWithVariance, key, prob);
        }
    }

    //console.log(probabilitiesWithVariance); // Debug
    return probabilitiesWithVariance;
}

/**
 * Generates the move distribution.
 * @param {any[]} damageResults - damageResults of current
 * @param {string} fastestSide - 0 if player, 1 if AI. "tie" if tie
 * @returns {number[]} The move distribution.
 */
export function generateMoveDist(damageResults: any[], fastestSide: string): number[] {
    // TODO: we need to take player moves as well
    // set variables, parsed from move dist
    const moves: any[] = damageResults[1];
    const aiFaster: boolean = fastestSide !== "0";

    let finalDist: number[] = [];
    moves.forEach((move, i) => {
        finalDist[i] = 0.0;
    });
    
    let damagingMoveDist = calculateHighestDamage(moves);

    console.log(damagingMoveDist);

    // TODO: used in a lot of checks
    const aiDeadToPlayer = true;

    let postBoostsDamagingMoveDist: { [key: number]: number };

    // TODO: cont from here
    // flat bonsues
    // k - "Move1:X/Move2:Y/Move3:Z/Move4:A"
    // v - 0.003125 (probability of those scores)
    Object.entries(damagingMoveDist).forEach(([k, v]) => {
        let moveArr = k.split('/');
        let newMoveArr: any = [];

        moveArr.forEach((moveScoreString, index) => {
            // Damaging Priority moves
            // if AI is dead to player mon and slower, 
            // all attacking moves with priority get an additional +11
            // TODO: this needs to check if dead to player, maybe pass it in?
            if (moves[index].move.priority > 0 && !aiFaster && aiDeadToPlayer) {
                console.error("unfinished!");
            }
        });

        // TODO: cont from here
        // postBoostsDamagingMoveDist = 
    });

    
    // actually calculate score
    Object.entries(damagingMoveDist).forEach(([k,v]) => {
        let moveArr = k.split('/');

        let maxScore = 0;
        let moves: number[] = [];

        moveArr.forEach((moveScoreString, index) => {
            let moveName = moveScoreString.split(':')[0];
            let scoreString = moveScoreString.split(':')[1];
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
            finalDist[move] += v / moves.length;
        });
    });

    console.log(finalDist);
    return finalDist;
}