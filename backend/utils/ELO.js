// K-factor: how “fast” ratings move. Typical values: 16, 24, 32.
const K = 32;

/**
 * Compute new ratings for a head-to-head match.
 * @param {number} Ra  – current rating of player A (winner)
 * @param {number} Rb  – current rating of player B (loser)
 * @returns {object}   – { newRa, newRb }
 */
function updateEloRatings(Ra, Rb) {
    // expected scores
    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

    // actual scores (winner=1, loser=0)
    const Sa = 1, Sb = 0;

    const newRa = Math.round(Ra + K * (Sa - Ea));
    const newRb = Math.round(Rb + K * (Sb - Eb));

    return { newRa, newRb };
}

module.exports = {
    updateEloRatings
};