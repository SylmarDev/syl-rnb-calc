import { Result } from './result';

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

function calculateHighestDamage(moves: any[]): { [key: number]: number } {
    let p1CurrentHealth = moves[0].defender.curHP();
    let arrays = moves.map(move => move.damageRolls().map((roll: number) => Math.min(p1CurrentHealth, roll)));
    let aiFaster = moves[0].attacker.stats.spe >= moves[0].defender.stats.spe;

    // list of damage distributions for the move
    let moveDistributions = arrays.map(array => computeDistribution(array));

    // calculate the probability distribution of which dict will have the highest key
    let probabilities: { [key: string]: number } = {};

    // Function to add or update a probability
    function addOrUpdateProbability(keyString: string, probabilityToAdd: number) {
        if (probabilities.hasOwnProperty(keyString)) {
            probabilities[keyString] += probabilityToAdd;
        } else {
            probabilities[keyString] = probabilityToAdd;
        }
    }

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

           if (key >= p1CurrentHealth) {
               if (aiFaster || moves[i].priority > 0) {
                   keyString += `${moveName}:FK`; // +6
               } else {
                   keyString += `${moveName}:SK`; // +3
               }
           } else if (key === maximumKey) {
               keyString += `${moveName}:HD`;
           } else {
               keyString += `${moveName}:0`;
           }


           i++;
        }

        let probabilityOfChoice = 1;
        for (let probability of moveProbabilities) {
            probabilityOfChoice *= Number(probability);
        }

        keyStrings = setKeyStrings(keyString, ["FK", "SK", "HD"]);

        for (let keyString of keyStrings) {
            //console.log(keyString); // Debug
            //console.log(probabilityOfChoice); // Debug

            console.log(keyStrings);
            
            const probabilityToAdd = probabilityOfChoice / keyStrings.length;

            addOrUpdateProbability(keyString, probabilityToAdd);
        }
        
        // update probabilities with variance
    }

    console.log(probabilities); // Debug
    return {};
}

/**
 * Generates the move distribution.
 * @param {any[]} moves - The array of moves.
 * @returns {any} The move distribution.
 */
export function generateMoveDist(moves: any[]): { [key: number]: number } {
    let damagingMoveDist = calculateHighestDamage(moves);

    return {};
}