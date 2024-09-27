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

function cartesian<T>(...arrays: T[][]): T[][] {
    return arrays.reduce((acc, curr) => {
        return acc.flatMap(a => curr.map(b => [...a, b]));
    }, [[]] as T[][]);
}

function objectEntriesIntKeys(obj: { [key: number]: number }): number[] {
    return Object.keys(obj).map(key => {
        const intKey = parseInt(key, 10);
        const k = isNaN(intKey) ? key : intKey;
        if (typeof k === 'string') {
            throw new Error('Expected integer key');
        }
        return obj[k];
    });
}

function calculateHighestDamage(moves: any[]): { [key: number]: number } {
    let p1CurrentHealth = moves[0].defender.curHP();
    let arrays = moves.map(move => move.damageRolls().map((roll: number) => Math.min(p1CurrentHealth, roll)));

    // list of damage distributions for the move
    let moveDistributions = arrays.map(array => computeDistribution(array));

    // calculate the probability distribution of which dict will have the highest key
    let probabilities: { [key: number]: number } = {};

    // get all possible combinations of key choices
    // TODO: fix this
    console.log(moveDistributions);
    // move distributions is a list of 4 dictionaries, each with an int key and number value
    // we want to get all possible combinations of keys from each dictionary

    let allChoicesParam = [...moveDistributions.map(distribution => objectEntriesIntKeys(distribution))];
    console.log(allChoicesParam);
    let allChoices = cartesian(allChoicesParam);
    
    //console.log(allChoices); // debug
    /*
    for (let choice of allChoices) {
       
    } */

    return probabilities;
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