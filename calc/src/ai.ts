import { Result } from './result';
import { Move } from './move';
import { Generations, Pokemon } from '.';
import { Field } from './field';
import { MoveName } from './data/interface';
import { getMoveEffectiveness } from './mechanics/util';
import { calculateSMSSSV } from './mechanics/gen789';

import * as I from './data/interface';

// interfaces
interface KVP {
    key: string,
    value: number
}

const trappingMoveNames: string[] = ['Whirlpool', 'Fire Spin', 'Sand Tomb', 'Magma Storm', 'Infestation', 'Wrap', 'Bind'];
const highCritRatioMoveNames: string[] = [
        "Aeroblast", "Air Cutter", "Attack Order",
        "Blaze Kick", "Crabhammer", "Cross Chop", "Cross Poison", "Drill Run",
        "Karate Chop", "Leaf Blade", "Night Slash", "Poison Tail", "Psycho Cut",
        "Razor Leaf", "Razor Wind", "Shadow Claw", "Sky Attack", "Slash",
        "Spacial Rend", "Stone Edge"
];
const twoHitMoves: string[] = ["Bonemerang", "Double Hit", "Double Iron Bash", "Double Kick", "Dragon Darts",
    "Dual Chop", "Dual Wingbeat", "Gear Grind", "Tachyon Cutter", "Twin Beam", "Twineedle"
];
const threeHitMoves: string[] = [
    "Arm Thrust", "Barrage", "Bone Rush", "Bullet Seed", "Comet Punch", "Double Slap",
    "Fury Attack", "Icicle Spear", "Pin Missile", "Rock Blast", "Scale Shot", "Spike Cannon",
    "Surging Strikes", "Tail Slap", "Triple Dive", "Water Shuriken"
];
const zeroBPButNotStatus: string[] = ["(No Move)", "Electro Ball", "Metal Burst", "Endeavor", "Bide",
     "Seismic Toss", "Punishment", "Flail", "Reversal", "Gyro Ball", "Magnitude", "Heat Crash",
      "Heavy Slam", "Present", "Natural Gift", "Beat Up", "Fissure", "Guillotine", "Horn Drill", "Super Fang",
      "Low Kick", "Sheer Cold", "Final Gambit", "Mirror Coat", "Nature's Madness", "Psywave", "Night Shade", "Dragon Rage",
      "Sonic Boom", "Spit Up", "Trump Card", "Grass Knot", "Wring Out", "Nature Power", "Pain Split"
];
const soundMoves: string[] = ["Boomburst", "Bug Buzz", "Chatter",
        "Clanging Scales", "Clangorous Soul", "Clangorous Soulblaze",
       "Confide", "Disarming Voice", "Echoed Voice", "Eerie Spell",
       "Grass Whistle", "Growl", "Heal Bell", "Howl", "Hyper Voice",
       "Metal Sound", "Noble Roar", "Overdrive", "Parting Shot",
       "Perish Song", "Psychic Noise", "Relic Song", "Roar",
       "Round", "Screech", "Sing", "Snarl", "Snore", "Sparkling Aria",
       "Supersonic","Uproar"];
const offensiveSetup: string[] = [
    "Dragon Dance", "Shift Gear", "Swords Dance", "Howl",
    "Sharpen", "Meditate", "Hone Claws", "Charge Beam", "Power-Up Punch",
    "Swords Dance", "Howl", "Tail Glow", "Nasty Plot", "Dragon Dance", "Hone Claws",
    "Growth", "Work Up"
];
const defensiveSetup: string[] = [
    "Acid Armor", "Barrier", "Cotton Guard", "Harden", "Iron Defense",
    "Stockpile", "Cosmic Power"
];

// move functions
function isNamed(moveName: string, ...names: string[]) {
    return names.includes(moveName);
}

function isTrapping(move: Move) {
    return isNamed(move.name, ...trappingMoveNames);
}

function isTrappingStr(s: string) {
    return isNamed(s, ...trappingMoveNames);
}

function isHighCritRate(s: string) {
    return isNamed(s, ...highCritRatioMoveNames);
}

function isTwoHit(move: Move) {
    return isNamed(move.name, ...twoHitMoves);
}

function isThreeHit(move: Move) {
    return isNamed(move.name, ...threeHitMoves);
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
    return movesetHasMoves(moves, ...soundMoves);
}

function movesetHasHighCritRatioMove(moves: any[]) {
    return movesetHasMoves(moves, ...highCritRatioMoveNames);
}

function getMoveIndexesOfType(moves: any[], type: string) {
    let moveIndexes: number[] = [];
    let i = 0;
    for (const move of moves) {
        if (move.move.type == type) {
            moveIndexes.push(i)
        }
        i++;
    }

    return moveIndexes;
}

function movesetHasMultiHitMove(moves: any[]) {
    return movesetHasMoves(moves, ...twoHitMoves) ||
     movesetHasMoves(moves, ...threeHitMoves) ||
      movesetHasMove(moves, "Triple Axel");
}

function getMultiHitCount(move: Move) {
    if (isTwoHit(move)) {
        return 2;
    }

    if (isThreeHit(move)) {
        return move.ability == "Skill Link" ? 5 : 3;
    }

    return 1;
}

function getTripleAxelDamage(res: Result) {
    let tripleAxelDamageRolls: number[][] = [];
    let tripleAxelDamage: number[] = [];

    let i = 0;
    for (const bp of [20, 40, 60]) {
        let move: Move = res.move.clone();
        move.bp = bp;
        move.hits = 1;
        move.name = "Ice Punch" as MoveName;
        move.originalName = "Ice Punch";
        move.overrides = {
            basePower: bp,
            type: "Ice",
            category: "Physical"
        };

        tripleAxelDamageRolls[i] = calculateSMSSSV(Generations.get(8),
        res.attacker.clone(),
        res.defender.clone(),
        move,
        res.field ? res.field.clone() : new Field())
        .damageRolls();

        i++;
    }

    tripleAxelDamage = tripleAxelDamageRolls.reduce((acc, curr) =>
        acc.map((val, i) => val + curr[i])
    );

    return tripleAxelDamage;
}

function getAIDeadAfterShellSmash(res: any[], playerMaxDamage: number) {
    const aiCurrentHp = res[1][0].attacker.originalCurHP;
    const aiItem = res[1][0].attacker.item;
    const aiSlower = res[0][0].attacker.spe > res[0][0].defender.spe;

    const playerMoves = res[0];

    if (aiItem == "White Herb" || aiSlower) {
        return playerMaxDamage >= aiCurrentHp;
    }

    let playerMaxDamageAfterSS: number = 0;
    let defender = playerMoves[0].defender.clone();
    defender.boosts.atk += 2;
    defender.boosts.spa += 2;
    defender.boosts.spe += 2;

    defender.boosts.def -= 1;
    defender.boosts.spd -= 1;

    for (const move of playerMoves) {
        const maxRoll = Math.max(...calculateSMSSSV(Generations.get(8),
        move.attacker.clone(),
        defender.clone(),
        move.move,
        move.field ? move.field.clone() : new Field())
        .damageRolls());

        if (maxRoll > playerMaxDamageAfterSS) {
            playerMaxDamageAfterSS = maxRoll;
        }
    }
    
    return playerMaxDamageAfterSS >= aiCurrentHp;
}

function getMoveIsStatus(moveName: string, moveBp: number) {
    return moveBp <= 0 &&
        !isNamed(moveName, ...zeroBPButNotStatus)
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
// for now lets just hope there are no sing + boom/rollout mons lol
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

function getAiDeadToSecondaryDamage(result: any)
{
    const currentHP = result.attacker.originalCurHP;
    const maxHP = result.attacker.stats.hp;
    const types = result.attacker.types;
    const ability = result.move.ability;
    const item = result.move.item;
    const status = result.attacker.status;
    const toxCounter = result.attacker.toxicCounter;
    const weather = result.field.weather;

    let statusDamage = 0;

    switch (status) {
        case "brn":
            statusDamage = Math.trunc(maxHP / 16);
            break;
        case "psn":
            statusDamage = Math.trunc(maxHP / 8);
            break;
        case "tox":
            statusDamage = Math.trunc(maxHP / 16) * toxCounter;
            break;
        default:
            break;
    }

    let weatherDamage = 0;

    switch (weather) {
        case "Sand":
            const immuneToSand = (types.includes("Rock") ||
                types.includes("Steel") ||
                types.includes("Ground")) ||
            (ability == "Sand Force" || ability == "Sand Rush" ||
                ability == "Sand Veil" || ability == "Magic Guard" ||
                ability == "Overcoat") ||
            item == "Safety Goggles";

            if (immuneToSand) { break; }

            weatherDamage = Math.trunc(maxHP / 16);
            
            break;
        case "Hail":
            const immuneToHail = types.includes("Ice") || 
                (ability == "Ice Body" || ability == "Snow Cloak" ||
                ability == "Magic Guard" || ability == "Overcoat") ||
                item == "Safety Goggles";

            if (immuneToHail) { break; }

            weatherDamage = Math.trunc(maxHP / 16);

            break;
        default:
            break;
    }

    let damageTaken = statusDamage + weatherDamage;
    return damageTaken >= currentHP;
}

// should AI recover function
// returns 0-1 based on probability of AI recover function being true (0 false, 1 true)
// return value is used as a modifier on the rate of recover moves in the moveStringsToAdd
// recoveryPercentage needs to be in decimal form (50% -> 0.5)
function shouldAIRecover(aiMon: Pokemon, recoveryPercentage: number,
    playerMaxRoll: number, aiFaster: boolean) : number 
{
    const aiMonCurrentHP = aiMon.originalCurHP;
    const aiMonMaxHP = aiMon.stats.hp;
    const aiHealthPercentage = Math.trunc((aiMonCurrentHP / aiMonMaxHP) * 100);
    const aiRecoveredHP = Math.trunc(aiMonMaxHP * recoveryPercentage);

    if (aiMon.status == "tox") { return 0; }
    if (playerMaxRoll >= aiRecoveredHP) { return 0; }

    if (aiFaster) {
        const playerCanKillAI = playerMaxRoll >= aiMonCurrentHP;
        const playerCanKillAIAfterRecovery = playerMaxRoll >= Math.min(aiMonCurrentHP + aiRecoveredHP, aiMonMaxHP);
        if (playerCanKillAI && !playerCanKillAIAfterRecovery) {
            return 1;
        }

        if (!playerCanKillAI) {
            if (aiHealthPercentage < 66 && aiHealthPercentage > 40) {
                return 0.5;
            }
            if (aiHealthPercentage <= 40) {
                return 1;
            }
        }
    } else {
        if (aiHealthPercentage < 50) {
            return 1;
        }
        if (aiHealthPercentage < 70) {
            return 0.75;
        }
    }

    // default to false if slips through the cracks
    return 0;
}

function isSuperEffective(move: Move, monTypes: I.TypeName[], gravity: boolean = false, ringTarget: boolean = false) {
    const type1Effectiveness = getMoveEffectiveness(move.gen, move, monTypes[0], false, gravity, ringTarget);
    const type2Effectiveness = monTypes[1] as string != "" ? 
        getMoveEffectiveness(move.gen, move, monTypes[1], false, gravity, ringTarget) :
        1;

    return (type1Effectiveness * type2Effectiveness) >= 2;
}


// takes moveKVPs, 1 Key Value Pair, {key: "Move1:0/Move2:6/Move3:0/Move4:0", value: 1}
// takes moveStringsToAdd, an array of objects, [{move: Move3, score: 8, rate: 0.37}]
// returns a new list of KVP's, [{key: "Move1:0/Move2:6/Move3:0/Move4:0", value: 0.63}, {key: "Move1:0/Move2:6/Move3:8/Move4:0", value: 0.37}]
function updateMoveKVPWithMoveStrings(moveKVPs: KVP[], moveStringToAdd: { move: string, score: number, rate: number }): KVP[] {
    // populate moveStringsToAdd to every score from that array to every instance of that move in moveKVPs
    let newKvps: KVP[] = []; // [{key: "Move1:0/Move2:6/Move3:0/Move4:0", value: 1}]

    // return if there's no point in running this
    if (moveStringToAdd.score === 0 || moveStringToAdd.rate === 0) { return moveKVPs; }

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

    console.log(moves); // DEBUG
    
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
            isNamed(moves[i].move.name, "Explosion", "Final Gambit", "Rollout", "Misty Explosion",
            "Self-Destruct", "Relic Song", "Meteor Beam", "Future Sight") ||
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
               if (aiFaster || moves[i].move.priority > 0) {
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
                isNamed(moves[i].move.name, "Explosion", "Final Gambit", "Rollout", "Misty Explosion", "Self-Destruct"))
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

        keyStrings = setKeyStrings(keyString, ["HD"]);

        for (const keyString of keyStrings) {
            console.log(keyStrings); // Debug
            const probabilityToAdd = probabilityOfChoice / keyStrings.length;
            addOrUpdateProbability(probabilities, keyString, probabilityToAdd);
        }
    }

    // update probabilities with variance
    let probabilitiesWithVariance: KVP[] = [];
    
    for (const probability of probabilities) {
        if (probability.key.includes("HD")) {
            updateProbabilityWithVariance(probabilitiesWithVariance, probability.key, probability.value, 0.8, ["HD", "6"]);
            updateProbabilityWithVariance(probabilitiesWithVariance, probability.key, probability.value, 0.2, ["HD", "8"]);
        } else {
            addOrUpdateProbability(probabilitiesWithVariance, probability.key, probability.value);
        }
    }

    // console.log(probabilitiesWithVariance); // Debug

    if (!movesetHasHighCritRatioMove(moves)) {
        return probabilitiesWithVariance;
    }

    // if has high crit rate move
    let critBoostMoveDist: KVP[] = [];

    for (const damagingMoveDistKVP of probabilitiesWithVariance) {
        let moveArr = damagingMoveDistKVP.key.split('/');
        let moveStringsToAdd: { move: string, score: number, rate: number}[] = [];

        let moveKVPs: KVP[] = [
            {
                key: damagingMoveDistKVP.key,
                value: damagingMoveDistKVP.value
            }
        ];

        moveArr.forEach((moveScoreString, index) => {
            const move = moves[index].move;
            if (isHighCritRate(move.name) && isSuperEffective(move, moves[index].defender.types, moves[0].field.isGravity, moves[index].defender.item == "Ring Target")) {
                moveStringsToAdd.push({move: move.name, score: 1, rate: 0.5});
            }
        });

        for (const moveStringToAdd of moveStringsToAdd) {
            moveKVPs = updateMoveKVPWithMoveStrings(moveKVPs, moveStringToAdd);
        }

        for (const moveKVP of moveKVPs) {
            addOrUpdateProbability(critBoostMoveDist, moveKVP.key, moveKVP.value);
        }
    }

    // console.log(critBoostMoveDist); // DEBUG
    return critBoostMoveDist;
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
    let moves: any[] = damageResults[1];
    const playerMoves: any[] = damageResults[0];
    const aiFaster: boolean = fastestSide != "0";
    const playerMon: Pokemon = moves[0].defender;

    let finalDist: number[] = [];
    moves.forEach((move, i) => {
        finalDist[i] = 0.0;
    });

    // handle multi-hit moves
    // not making this into a function because passing moves to a function will mess up the functionality
    // we will live with the code duplication and get through it together
    if (movesetHasMultiHitMove(moves)) {
        moves.forEach((move, i) => {
            const multiHit: number = getMultiHitCount(move.move);
            if (multiHit > 1) {
                if (typeof move.damage == 'number') {
                    move.damage *= multiHit;
                } else if (Array.isArray(move.damage)) {
                    move.damage = move.damage.map((x: number) => x * multiHit);
                }
            }

            // handle triple axel and update damage numbers
            if (move.move.name == "Triple Axel" && Array.isArray(move.damage)) {
                move.damage = getTripleAxelDamage(move);
            }
        });
    }

    //console.log(moves); // DEBUG
    
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
         !((moves[0].move.ability == "Sturdy" || moves[0].move.item == "Focus Sash") &&
          moves[0].attacker.originalCurHP == moves[0].attacker.stats.hp);
    const aiTwoHitKOd = playerHighestRoll * 2 >= moves[0].attacker.originalCurHP;
    const aiThreeHitKOd = playerHighestRoll * 3 >= moves[0].attacker.originalCurHP;
    const playerHasStatusCond = playerMon.status != "";
    const aiStatusCond = moves[0].attacker.status ?? "";
    const playerTypes: string[] = playerMon.types;
    const playerAbility = moves[0].defender.moves[0].ability; // ugly but works
    const aiAbility = moves[0].move.ability;
    const playerHealthPercentage = Math.trunc((moves[0].defender.originalCurHP / moves[0].defender.stats.hp) * 100);
    const aiHealthPercentage = Math.trunc((moves[0].attacker.originalCurHP / moves[0].attacker.stats.hp) * 100);
    const aiMaxedOutAttack = moves[0].attacker.boosts.atk == 6;
    const aiMonName = moves[0].attacker.name;
    const aiItem = moves[0].attacker.item;
    const playerSideSpikes = moves[0].field.defenderSide.spikes > 0;
    const playerSideTSpikes = moves[0].field.defenderSide.tspikes > 0;
    const playerSideStealthRocks = moves[0].field.defenderSide.isSR;
    const aiReflect = moves[0].field.attackerSide.isReflect;
    const aiLightScreen = moves[0].field.attackerSide.isLightScreen;
    const aiHasTailwind = moves[0].field.attackerSide.isTailwind;
    const terrain = moves[0].field.terrain;
    const aiSlowerButFasterAfterPara = !aiFaster && moves[0].attacker.stats.spe > Math.trunc(moves[0].defender.stats.spe / 4);
    const trickRoomUp = moves[0].field.isTrickRoom;
    const playerLeechSeeded = moves[0].field.defenderSide.isSeeded;
    const aiHasAnyStatRaised = Object.values(moves[0].attacker.boosts).some(value => (value as number) > 0);
    const weather = moves[0].field.weather;
    const playerHasStatusMove = playerMoves.some(x => getMoveIsStatus(x.move.name, x.move.bp));
    const aiHasStatusMove = moves.some(x => getMoveIsStatus(x.move.name, x.move.bp)); // AI has at least 1 status move
    // TODO: create this and use where applicable
    // TODO: add thaw moves + recharging, loafing around due to truant
    const playerIncapacitated = playerMon.status == "frz" || playerMon.status == "slp";

    // console.log(moves[0].attacker.boosts);

    // console.log(moves);
    
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
    const aiMagnetRisen = aiOptions["magnetRiseAiOpt"];

    // protect yayyy
    const protectIncentive = aiOptions["protectIncentiveAiOpt"];
    const protectDisincentive = aiOptions["protectDisincentiveAiOpt"];
    const aiProtectLastTurn = aiOptions["protectLastAiOpt"];
    const aiProtectLastTwoTurns = aiOptions["protectLastTwoAiOpt"];

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
        const aiSeesKill = getAISeesKill(moveArr, aiAbility);

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
            const moveIsStatus = getMoveIsStatus(moveName, move.bp); // can't believe I didn't think of this till now

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
            const isDamagingSpeedReducing = moveName == "Icy Wind" || moveName == "Electroweb" || moveName == "Rock Tomb"
            || moveName == "Mud Shot" || moveName == "Low Sweep";
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
            if (isNamed(moveName, "Skitter Smack", "Trop Kick", "Snarl") && moveScore == 0) {
                const affectedMoveType = moveName == "Trop Kick" ? "Physical" : "Special";
                if (playerAbility != "Contrary" && playerAbility != "Clear Body" && playerAbility != "White Smoke" &&
                    playerMoves.findIndex((x: { move: { category: string; }; }) => x.move.category === affectedMoveType) != -1)
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

            // Stealth Rock
            if (moveName == "Stealth Rock") {
                if (playerSideStealthRocks) {
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
                }
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

            // Protect, King's Shield, Spiky Shield, Baneful Bunker
            if (moveName == "Protect" || moveName == "King's Shield" ||
                moveName == "Spiky Shield" || moveName == "Baneful Bunker" ||
                moveName == "Detect") {
                const aiDeadToSecondaryDamage = getAiDeadToSecondaryDamage(moves[0]);
                if (aiProtectLastTwoTurns || aiDeadToSecondaryDamage) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    let protectScore = 6;
                    let playerBurnedOrPoisoned = false;
                    let aiBurnedOrPoisoned = false;

                    if (aiStatusCond == "brn" || 
                        aiStatusCond == "psn" ||
                        aiStatusCond == "tox") {
                        aiBurnedOrPoisoned = true;
                    }

                    if (playerMon.status == "brn" || 
                        playerMon.status == "psn" ||
                        playerMon.status == "tox") {
                        playerBurnedOrPoisoned = true;
                    }

                    if (protectDisincentive || aiBurnedOrPoisoned) {
                        protectScore -= 2;
                    }

                    if (protectIncentive || playerBurnedOrPoisoned) {
                        protectScore++;
                    }

                    // TODO: doubles update
                    if (firstTurnOut) {
                        protectScore--;
                    }

                    moveStringsToAdd.push({
                        move: moveName,
                        score: protectScore,
                        rate: 1
                    });

                    if (aiProtectLastTurn) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: -20,
                            rate: 0.5
                        });
                    }
                }
            }

            // Fling, Role Play, doubles weakness policy, magnitude, eq is just for doubles, so leave it for now

            // Imprison
            // One move in common +9, else -20
            if (moveName == "Imprison") {
                const playerMoveNames = playerMoves.map(x => x.move.name);
                // console.log(playerMoveNames); // debug
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
            // TODO: doubles update
            if (isNamed(moveName, "Helping Hand", "Follow Me")) {
                moveStringsToAdd.push({
                    move: moveName,
                    score: -6,
                    rate: 1
                });
            }

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
                    let screenScore = 6;
                    const correspondingMoveSplit = moveName == "Reflect" ? "Physical": "Special";
                    const playerHasAnyOfCorrespondingSplit = playerMoves.some(x => x.move.category == correspondingMoveSplit && x.move.bp > 0);

                    if (playerHasAnyOfCorrespondingSplit) {
                        if (aiItem == "Light Clay") {
                            screenScore++;
                        }
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 1,
                            rate: 0.5
                        });
                    }

                    moveStringsToAdd.push({
                        move: moveName,
                        score: screenScore,
                        rate: 1
                    });
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
            if (moveName == "Explosion" || moveName == "Self-Destruct" || moveName == "Misty Explosion") {
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
                    const physicalIndex = damageResults[0].findIndex((x: { move: { category: string; bp: number }; }) => x.move.category === "Physical" && x.move.bp > 0);
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
                        
                        // TODO: needs update for doubles one day
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
                    if (playerHealthPercentage > 20 && !aiSeesKill) {
                        let toxScore = 0;

                        if (playerHighestRoll == 0 && 
                            (movesetHasMoves(moves, "Hex", "Venom Drench") || moves[0].ability == "Merciless")) {
                            toxScore += 2;
                        }
    
                        moveStringsToAdd.push({
                            move: moveName,
                            score: toxScore,
                            rate: 0.38
                        });
                    }
                }
            }

            // variables to handle setup moves
            let isOffensiveSetup = false;
            let isDefensiveSetup = false;
            let isContrary = aiAbility == "Contrary";
            let actAsBulkUp = false;

            // General Setup
            if (isNamed(moveName, "Power-Up Punch", "Swords Dance", "Howl",
                "Stuff Cheeks", "Barrier", "Acid Armor", "Iron Defense", "Cotton Guard",
                "Charge Beam", "Tail Glow", "Nasty Plot", "Cosmic Power",
                "Bulk Up", "Calm Mind", "Dragon Dance", "Coil", "Hone Claws", "Quiver Dance",
                "Shift Gear", "Shell Smash", "Growth", "Work Up", "Curse", "No Retreat")) {
                if (aiDeadToPlayer || 
                    ((moveName != "Power-Up Punch" && moveName != "Swords Dance" && moveName != "Howl") &&
                    playerAbility == "Unaware")) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                }
            }

            // Contrary edge cases
            if (moveScore == 0 && isContrary) {
                if (isContrary) {
                    if (isNamed(moveName, "Overheat", "Leaf Storm")) {
                        isOffensiveSetup = true;
                    } else if (moveName == "Superpower") {
                        actAsBulkUp = true;
                    }
                }
            } else if (moveScore == 0) {
                // all others that aren't contrary
                if (isNamed(moveName, ...offensiveSetup)) {
                    isOffensiveSetup = true;
                } else if (isNamed(moveName, ...defensiveSetup)) {
                    isDefensiveSetup = true;
                }
                // this else-if is not nessesary, but it will help me sleep better
            }

            // Coil, Bulk Up, Calm Mind, Quiver Dance, Non-Ghost Curse
            // (above Offensive and Defensive so we can decide where to send it)
            if (isNamed(moveName, "Coil", "Bulk Up", "Quiver Dance", "No Retreat", "Calm Mind") ||
                moveName == "Curse" && !moves[0].attacker.types.includes("Ghost") ||
                actAsBulkUp)
            {
                // physical
                // (just leaving curse because we did the ghost type check earlier)
                if (isNamed(moveName, "Coil", "Bulk Up", "No Retreat", "Curse") || actAsBulkUp) {
                    if (playerMoves.some(x => x.move.category == "Physical" && !getMoveIsStatus(x.move.name, x.move.bp)) &&
                        !playerMoves.some(x => x.move.category == "Special" && !getMoveIsStatus(x.move.name, x.move.bp))) {
                        // console.log("is defensive setup"); // DEBUG
                        isDefensiveSetup = true;
                    } else {
                        // console.log("is offensive setup"); // DEBUG
                        isOffensiveSetup = true;
                    }
                } else { // special
                    if (playerMoves.some(x => x.move.category == "Special" && !getMoveIsStatus(x.move.name, x.move.bp)) &&
                        !playerMoves.some(x => x.move.category == "Physical" && !getMoveIsStatus(x.move.name, x.move.bp))) {
                        // console.log("is defensive setup"); // DEBUG
                        isDefensiveSetup = true;
                    } else {
                        // console.log("is offensive setup"); // DEBUG
                        isOffensiveSetup = true;
                    }
                }
            }

            // Offensive Setup
            if (isOffensiveSetup) {
                let offensiveScore = 6;

                if (playerIncapacitated) { 
                    offensiveScore += 3; 
                } 
                // comented out because of run and bug
                /* else if (!aiThreeHitKOd) {
                    offensiveScore++;
                    if (aiFaster) { offensiveScore++; }
                } */

                if ((!aiFaster && aiTwoHitKOd) && !isContrary) {
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
            if (isDefensiveSetup) {
                // this may need updating this is off my memory
                const boostsDefAndSpDef = isNamed(moveName, "Stockpile", "Cosmic Power");
                
                let initialDefensiveScore = 6;
                if ((!aiFaster && aiTwoHitKOd) && !isContrary) {
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

                const aiDeadAfterShellSmash = getAIDeadAfterShellSmash(damageResults, playerHighestRoll);

                // if player cannot KO AI if Shell Smash is used this turn +2
                if (!aiDeadAfterShellSmash) {
                    score += 2;
                } else { // if player mon can KO AI mon if Shell Smash is used this turn -2
                    score -= 2;
                }

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
                const aiNotDeadAfterBellyDrum = playerHighestRoll < hpAfterBellyDrum;
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
            if (isNamed(moveName, "Recover", "Slack Off", "Heal Order", "Soft-Boiled",
                "Roost", "Strength Sap"))
            {
                if (aiHealthPercentage == 100) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else if (aiHealthPercentage >= 85) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -6,
                        rate: 1
                    });
                } else {
                    moveStringsToAdd.push(...[{
                        move: moveName,
                        score: 5,
                        rate: 1
                    },
                    {
                        move: moveName,
                        score: 2,
                        rate: shouldAIRecover(moves[0].attacker, 0.5, playerHighestRoll, aiFaster)
                    }]);
                }
            }

            // Sun Based Recovery
            // TODO: tabled for now, needs some funky solution
            // I'm sure we can multiply rate to figure it out, and move this above recovery moves so we can funnel these moves to normal recovery
            /* if (isNamed(moveName, "Morning Sun", "Synthesis", "Moonlight")) {
                
            } */

            // Rest
            if (moveName == "Rest") {
                const restIncentive: number = aiItem == "Lum Berry" || aiItem == "Chesto Berry" ||
                                                movesetHasMoves(moves, "Sleep Talk", "Snore") ||
                                                moves[0].ability == "Shed Skin" || moves[0].ability == "Early Bird" ||
                                                (moves[0].ability == "Hydration" && weather.includes("Rain")) ? 1 : 0;
                
                const aiShouldRecover = shouldAIRecover(moves[0].attacker, 1, playerHighestRoll, aiFaster);

                moveStringsToAdd.push(...[{
                    move: moveName,
                    score: 5,
                    rate: 1
                },
                {
                    move: moveName,
                    score: 2,
                    rate: aiShouldRecover
                },
                {
                    move: moveName,
                    score: 1,
                    rate: aiShouldRecover * restIncentive
                }
                ]);
            }

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
            if (moveName == "Counter" || moveName == "Mirror Coat") {
                // aiDeadToPlayer, -20
                if (aiDeadToPlayer) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -20,
                        rate: 1
                    });
                } else {
                    let counterScore = 6;
                    const correspondingMoveSplit = moveName == "Counter" ? "Physical": "Special";
                    const playerOnlyHasMovesOfCorrespondingSplit = playerMoves.every(x => x.move.category == correspondingMoveSplit && x.move.bp > 0);
    
                    if (playerHighestRoll >= moves[0].attacker.originalCurHP &&
                       (aiAbility == "Sturdy" || aiItem == "Focus Sash") &&
                    aiHealthPercentage == 100 &&
                    playerOnlyHasMovesOfCorrespondingSplit) {
                        counterScore += 2;
                    }
    
                    moveStringsToAdd.push({
                        move: moveName,
                        score: counterScore,
                        rate: 1
                    });
    
                    if (!aiDeadToPlayer && playerOnlyHasMovesOfCorrespondingSplit) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 2,
                            rate: 0.8
                        });
                    }
    
                    if (aiFaster) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: -1,
                            rate: 0.25
                        });
                    }
    
                    if (playerHasStatusMove) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: -1,
                            rate: 0.25
                        });
                    }
                }
            }

            // put Magnet Rise in the docs, going off what Grintoul has said in dekcord
            if (moveName == "Magnet Rise") {
                if (aiMagnetRisen) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: -40,
                        rate: 1
                    });
                } else {
                    // +8 if player has a damaging ground type move, and aiFaster
                    const playerGroundMoveIndexes: number[] = getMoveIndexesOfType(playerMoves, "Ground");
                    let playerHasDamagingGroundMove: boolean = false;

                    for (const groundMoveIndex of playerGroundMoveIndexes) {
                        // if damaging ground move
                        const groundMoveDamage = playerMoves[groundMoveIndex].damage;
                        if ((typeof groundMoveDamage === 'number' && groundMoveDamage != 0) ||
                            (Array.isArray(groundMoveDamage) && groundMoveDamage.reduce((a: number, b: number) => a + b, 0) > 0)) {
                            playerHasDamagingGroundMove = true;
                            break;
                        }
                    }
                    
                    if (aiFaster && playerHasDamagingGroundMove) {
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 8,
                            rate: 1
                        });
                    } else { // +5 otherwise
                        moveStringsToAdd.push({
                            move: moveName,
                            score: 5,
                            rate: 1
                        });
                    }
                }
            }
            // end of the hell loop
        });

        // set score to +6 as a default
        let i = 0;
        for (const moveScoreString of moveArr) {
            const move = moves[i].move;
            const moveName = moveScoreString.split(':')[0];
            const moveScore: number = Number(moveScoreString.split(':')[1]);
            const moveIsStatus = getMoveIsStatus(moveName, move.bp);
            // if move doesn't have custom rules already (not in moveStringsToAdd)
            // and doesn't already have a score, and is status
            // default to +6
            if (moveScore == 0 &&
                moveIsStatus &&
                !(moveStringsToAdd.map(x => x.move).includes(moveName))) {
                    moveStringsToAdd.push({
                        move: moveName,
                        score: 6,
                        rate: 1
                    });
            }

            i++;
        }
        
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

    // reset multi-hit moves for display
    if (movesetHasMultiHitMove(moves)) {
        moves.forEach((move, i) => {
            const multiHit: number = getMultiHitCount(move.move);
            if (multiHit > 1) {
                if (typeof move.damage == 'number') {
                    move.damage /= multiHit;
                } else if (Array.isArray(move.damage)) {
                    move.damage = move.damage.map((x: number) => x / multiHit);
                }
            }
        });
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