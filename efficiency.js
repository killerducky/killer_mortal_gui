// const emoji = require("../utils/emoji");
// const handToEmoji = require("../utils/handToEmoji");
// const sendResponse = require("../utils/sendResponse");
// const sendDeletableResponse = require("../utils/sendDeletableResponse");
// const convertTilesToTenhouString = require("../utils/convertTilesToTenhouString");
// const parseHandFromString = require("../utils/parseHandFromString");
// const { calculateMinimumShanten, calculateStandardShanten } = require("../utils/shanten");
import { calculateMinimumShanten, calculateStandardShanten } from "./shanten.js";

var cooldown_users = [];

// module.exports = (message, client) => {
//     let command = message.content.split(" ")[0].toLowerCase();
//     let handString = message.content.split(" ").slice(1).join("").toLowerCase();

//     if (command == "!eff" && handString == "you") {
//         return sendResponse(message, "Hey, that's not nice! Admin, help!");
//     } else if (command == "!eff" && handString == "me") {
//         return sendResponse(message, "You're not really my type. You're, you know... human.");
//     }

//     /*
//     if ((handString == "that" || handString == "thatstandard") && client.user.lastMessage.content) {
//         handString = client.user.lastMessage.content;
//     }
//     */

//     let {tiles, handTiles} = parseHandFromString(handString);

//     if (tiles == 0) {
//         // Sometimes people call it with just numbers, so add a p and see if that helps.
//         handString += "p";
//         let added = parseHandFromString(handString);
//         tiles = added.tiles;
//         handTiles = added.handTiles;

//         if (tiles == 0) {
//             return sendDeletableResponse(message, "You'll need to give me a hand to calculate. The format is like this: 1236m4568p789s111z");
//         }
//     }

//     if (tiles > 14) {
//         return sendDeletableResponse(message, `That hand has ${tiles - 14} too many tiles.`);
//     }

//     if (tiles % 3 === 0) {
//         return sendDeletableResponse(message, `That hand has ${tiles} tiles, which is a multiple of three, which can't happen.`);
//     }

//     if (message.guild && message.guild.id == "548440972997033996") {
//         let name = "invisible user";
//         if (message.member) {
//             name = message.member.user.username;
//         }

//         if (cooldown_users.indexOf(name) >= 0) {
//             return sendResponse(message, "You've already called this command recently. Please wait a bit.");
//         } else {
//             cooldown_users.push(name);
//             setTimeout(() => {
//                 cooldown_users.splice(cooldown_users.indexOf(name), 1);
//             }, 300000)
//         }
//     }

//     let remainingTiles = Array(38).fill(4);
//     remainingTiles[0] = 0;
//     remainingTiles[10] = 0;
//     remainingTiles[20] = 0;
//     remainingTiles[30] = 0;

//     for (let i = 0; i < remainingTiles.length; i++) {
//         remainingTiles[i] = Math.max(0, remainingTiles[i] - handTiles[i]);
//     }

//     let response = `${handToEmoji(handTiles)} `;
//     let handActuallyHasTon = handTiles[31] > 0;
//     let shantenFunction = message.content.toLowerCase().indexOf("standard") > 0 ? calculateStandardShanten : calculateMinimumShanten;
//     if (tiles < 13) {
//         shantenFunction = calculateStandardShanten;
//     }

//     // We add East triplets just to make the shanten calculation accurate for called hands.
//     while (tiles < 13) {
//         handTiles[31] += 3;
//         tiles += 3;
//     }
    
//     let shanten = shantenFunction(handTiles);
//     let isComplete = false;

//     if (shanten === -1) {
//         response += "(Complete)\n";
//         shanten = 0;
//         isComplete = true;
//     }
//     else if (shanten === 0) {
//         response += "(Tenpai)\n";
//     }
//     else {
//         response += `(${shanten}-shanten)\n`;
//     }

//     // Check just the ukeire of 13 tile hands (or tiles % 3 === 1 hands)
//     if (tiles == 13) {
//         let ukeire = calculateUkeire(handTiles, remainingTiles, shantenFunction, shanten);
//         response += `Ukeire: ${ukeire.value} (${tilesToEmoji(ukeire.tiles)})`;

//         let upgrades = calculateUkeireUpgrades(handTiles, remainingTiles, shantenFunction, shanten, ukeire.value, handActuallyHasTon);
//         if (upgrades.value > 0) {
//             upgrades.tiles = upgrades.tiles.map(o => o.tile);
//             response += `\nUpgrades: ${upgrades.value} (${tilesToEmoji(upgrades.tiles)})`;
//         }

//         return sendResponse(message, response);
//     }

//     // Check the ukeire of each discard for 14 tile hands (or tiles % 3 === 2 hands)
//     let discardUkeire = calculateDiscardUkeire(handTiles, remainingTiles, shantenFunction, shanten);
//     let groups = createUkeireGroups(discardUkeire, handActuallyHasTon);

//     if (shanten === 1) {
//         groups = filterBadUkeire(handTiles, groups, remainingTiles);
//     }

//     groups = sortGroups(groups);

//     if (shanten === 0 && !isComplete) {
//         for (let i = 0; i < groups.length; i++) {
//             handTiles[groups[i].discards[0]]--;
//             groups[i].upgrades = calculateUkeireUpgrades(handTiles, remainingTiles, shantenFunction, 0, groups[0].value, handActuallyHasTon);
//             groups[i].upgrades.tiles = groups[i].upgrades.tiles.map(o => o.tile);
//             handTiles[groups[i].discards[0]]++;
//         }
//     }

//     let ukeire = "";

//     for (let i = 0; i < groups.length; i++) {
//         let group = groups[i];
        
//         if (shanten === 1) {
//             ukeire += `Discard ${tilesToEmoji(group.discards)} -> ${group.value} (${group.good}\\*) ukeire (${tilesToEmoji(group.goodTiles)}\\*${tilesToEmoji(group.tiles)})\n`;
//         } else if (shanten === 0 && !isComplete) {
//             ukeire += `Discard ${tilesToEmoji(group.discards)} -> ${group.value} ukeire (${tilesToEmoji(group.tiles)}), ${group.upgrades.value} upgrades (${tilesToEmoji(group.upgrades.tiles)})\n`;
//         } else {
//             ukeire += `Discard ${tilesToEmoji(group.discards)} -> ${group.value} ukeire (${tilesToEmoji(group.tiles)})\n`;
//         }
//     }

//     if ((response + ukeire).length > 1800) {
//         ukeire = "";
        
//         for (let i = 0; i < groups.length; i++) {
//             let group = groups[i];

//             if (shanten === 1) {
//                 ukeire += `Discard ${tilesToEmoji(group.discards)} -> ${group.value} (${group.good}\\*) ukeire (${convertTilesToTenhouString(group.goodTiles)} \\* ${convertTilesToTenhouString(group.tiles)})\n`;
//             } else if (shanten === 0 && !isComplete) {
//                 ukeire += `Discard ${tilesToEmoji(group.discards)} -> ${group.value} ukeire (${tilesToEmoji(group.tiles)}), ${group.upgrades[0]} upgrades (${convertTilesToTenhouString(group.upgrades[1])})\n`;
//             }else {
//                 ukeire += `Discard ${tilesToEmoji(group.discards)} -> ${group.value} ukeire (${convertTilesToTenhouString(group.tiles)})\n`;
//             }
//         }
//     }

//     if (shanten === 1) {
//         ukeire += "* Resulting in 5+ tile tenpai"
//     }

//     response += ukeire;

//     return sendResponse(message, response);
// }

function createUkeireGroups(discardUkeire, handActuallyHasTon) {
    let groupsObject = {};

    for (let i = 0; i < discardUkeire.length; i++) {
        if (i === 31 && !handActuallyHasTon) continue;
        if (discardUkeire[i].value == 0) continue;

        let tiles = discardUkeire[i].tiles.join(",");

        if (!groupsObject[tiles]) {
            groupsObject[tiles] = {
                discards: [i],
                value: discardUkeire[i].value,
                tiles: discardUkeire[i].tiles
            };
        } else {
            groupsObject[tiles].discards.push(i);
        }
    }

    let groups = [];

    for (key in groupsObject) {
        if(!groupsObject[key].tiles) continue;
        groups.push(groupsObject[key]);
    }

    return groups;
}

function filterBadUkeire(hand, groups, remainingTiles) {
    let adjustedRemainingTiles = Array(38).fill(0);

    // Makes it so the ukeire only checks tiles that are possible to improve the hand
    for(let i = 0; i < groups.length; i++) {
        let tiles = groups[i].tiles;
        for(let j = 0; j < tiles.length; j++) {
            adjustedRemainingTiles[tiles[j]] = remainingTiles[tiles[j]];
        }

        groups[i].good = groups[i].value;
        groups[i].goodTiles = [];
    }

    for(let i = 0; i < groups.length; i++) {
        hand[groups[i].discards[0]]--;
        let tiles = groups[i].tiles.slice();

        for(let j = 0; j < tiles.length; j++) {
            let tile = tiles[j];
            hand[tile]++;
            adjustedRemainingTiles[tile]--;

            let ukeire = calculateDiscardUkeire(hand, adjustedRemainingTiles, calculateStandardShanten, 0);
            let bestUkeire = Math.max(...ukeire.map((u) => u.value));

            if (bestUkeire <= 4) {
                groups[i].good -= remainingTiles[tile];
            } else {
                groups[i].tiles.splice(groups[i].tiles.indexOf(tile), 1);
                groups[i].goodTiles.push(tile);
            }

            hand[tile]--;
            adjustedRemainingTiles[tile]++;
        }
        hand[groups[i].discards[0]]++;
    }

    return groups;
}

function sortGroups(groups) {
    return groups.sort((a, b) => {
        let result = b.value - a.value;
        if (result == 0) {
            result = b.discards.length - a.discards.length;
        }
        if (result == 0) {
            result = a.discards[0] - b.discards[0];
        }
        return result;
    });
}

function tilesToEmoji(tiles) {
    let result = "";

    for (i = 0; i < tiles.length; i++) {
        result += emoji[tiles[i]];
    }

    return result;
}

function calculateDiscardUkeire(hand, remainingTiles, shantenFunction, baseShanten = -2) {
    let results = Array(hand.length).fill(0);
    let convertedHand = hand.slice();

    if (baseShanten === -2) {
        baseShanten = shantenFunction(convertedHand);
    }

    // Check the ukeire of each hand that results from each discard
    for (let handIndex = 0; handIndex < convertedHand.length; handIndex++) {
        if (convertedHand[handIndex] === 0) {
            results[handIndex] = { value: 0, tiles: [] };
            continue;
        }

        convertedHand[handIndex]--;
        let ukeire = calculateUkeire(convertedHand, remainingTiles, shantenFunction, baseShanten);
        convertedHand[handIndex]++;

        results[handIndex] = ukeire;
    }

    return results;
}

export function calculateUkeire(hand, remainingTiles, shantenFunction, baseShanten = -2) {
    let convertedHand = hand.slice();
    let convertedTiles = remainingTiles.slice();

    if (baseShanten === -2) {
        baseShanten = shantenFunction(convertedHand);
    }

    let value = 0;
    let tiles = [];

    let hasManzu = false
    let hasPinzu = false
    let hasSouzu = false

    for (let i = 1; i < 10; i++) {
        if (hand[i] > 0)
            hasManzu = true;
        if (hand[i+10] > 0)
            hasPinzu = true;
        if (hand[i+20] > 0)
            hasSouzu = true;
    }

    // Check adding every tile to see if it improves the shanten
    for (let addedTile = 1; addedTile < convertedHand.length; addedTile++) {
        if (remainingTiles[addedTile] === 0) continue;
        if (addedTile % 10 === 0) continue;
        if (!hasManzu && addedTile > 1 && addedTile < 9) continue;
        if (!hasPinzu && addedTile > 11 && addedTile < 19) continue;
        if (!hasSouzu && addedTile > 21 && addedTile < 29) continue;

        convertedHand[addedTile]++;

        if (shantenFunction(convertedHand, baseShanten - 1) < baseShanten) {
            // Improves shanten. Add the number of remaining tiles to the ukeire count
            value += convertedTiles[addedTile];
            tiles.push(addedTile);
        }

        convertedHand[addedTile]--;
    }

    return {
        value,
        tiles
    };
}

/**
 * Calculates how many tiles can improve the ukeire of a hand.
 * @param {TileCounts} hand The number of each tile in the player's hand.
 * @param {TileCounts} remainingTiles The number of each tile the player cannot see.
 * @param {Function} shantenFunction The function to use to calculate shanten
 * @param {number} baseShanten The hand's current shanten, if precalculated.
 * @param {number} shantenOffset The hand's current shanten offset, if precalculated.
 */
function calculateUkeireUpgrades(hand, remainingTiles, shantenFunction, baseShanten = -2, baseUkeire = -1, handActuallyHasTon = false) {
    if (baseShanten === -2) {
        baseShanten = shantenFunction(hand);
    }

    if (baseUkeire === -1) {
        baseUkeire = calculateUkeire(hand, remainingTiles, shantenFunction, baseShanten).value;
    }

    let value = 0;
    let tiles = [];

    // Check adding every tile to see if it improves the ukeire
    for (let addedTile = 1; addedTile < hand.length; addedTile++) {
        if (remainingTiles[addedTile] === 0) continue;
        if (addedTile % 10 === 0) continue;

        hand[addedTile]++;
        remainingTiles[addedTile]--;

        if (shantenFunction(hand, baseShanten) === baseShanten
            && calculateUkeire(hand, remainingTiles, shantenFunction, baseShanten).value > baseUkeire) {
            // Find the best tile to cut
            let discards = calculateDiscardUkeire(hand, remainingTiles, shantenFunction, baseShanten).map(u => u.value);
            if (!handActuallyHasTon) discards[31] = 0;
            let bestUkeire = Math.max(...discards);
            let bestDiscard = discards.indexOf(bestUkeire);

            if (addedTile !== bestDiscard) {
                // Check the ukeire of the hand after cutting the best tile
                hand[bestDiscard]--;
                let newUkeire = calculateUkeire(hand, remainingTiles, shantenFunction, baseShanten).value;

                if (newUkeire > baseUkeire) {
                    value += remainingTiles[addedTile] + 1;
                    tiles.push({ tile: addedTile, discard: bestDiscard, count: remainingTiles[addedTile] + 1, resultingUkeire: newUkeire });
                }

                hand[bestDiscard]++;
            }
        }

        hand[addedTile]--;
        remainingTiles[addedTile]++;
    }

    return {
        value,
        tiles
    };
}