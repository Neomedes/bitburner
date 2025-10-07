/**
 * Share our home server with a faction.  Doing so would increase our
 * reputation gains within that faction.  Run this script using as high a number
 * of threads as possible to increase our reputation gains even further.
 *
 * Usage: run share.js -t [numThread]
 * Example: run share.js -t 3
 *
 * @param ns The Netscript API.
 */
export async function main(ns: NS) {
    for (;;) {
        await ns.share();
    }
}