import { CodingContractName } from "@ns"
import { is_unresolved, read_cct_file } from "lib/cct"
import { all_finished, f_unique, run_script } from "lib/functions"
import { error_t, log, prepend_time } from "lib/log"

function get_solver_script(type: CodingContractName): string | undefined {
    switch (type) {
        case "Encryption I: Caesar Cipher": return "cct/caesar.js"
        case "Compression I: RLE Compression": return "cct/compression1.js"
        case "Compression II: LZ Decompression": return "cct/compression2.js"
        case "Compression III: LZ Compression": return "cct/compression3.js"
        case "Find All Valid Math Expressions": return "cct/findMathExpressions.js"
        case "Proper 2-Coloring of a Graph": return "cct/graph2color.js"
        case "HammingCodes: Encoded Binary to Integer": return "cct/hammingDecode.js"
        case "HammingCodes: Integer to Encoded Binary": return "cct/hammingInt2Bin.js"
        case "Generate IP Addresses": return "cct/ips.js"
        case "Array Jumping Game": return "cct/jump.js"
        case "Array Jumping Game II": return "cct/jump2.js"
        case "Merge Overlapping Intervals": return "cct/merge.js"
        case "Find Largest Prime Factor": return "cct/primes.js"
        case "Sanitize Parentheses in Expression": return "cct/sanitizeParentheses.js"
        case "Shortest Path in a Grid": return "cct/shortestGridPath.js"
        case "Spiralize Matrix": return "cct/spiralize.js"
        case "Square Root": return "cct/sqrt.js"
        case "Algorithmic Stock Trader I": return "cct/stocks1.js"
        case "Algorithmic Stock Trader II": return "cct/stocks2.js"
        case "Algorithmic Stock Trader III": return "cct/stocks3.js"
        case "Algorithmic Stock Trader IV": return "cct/stocks4.js"
        case "Subarray with Maximum Sum": return "cct/subsum.js"
        case "Minimum Path Sum in a Triangle": return "cct/trianglePathSum.js"
        case "Unique Paths in a Grid I": return "cct/uniqueGridPaths.js"
        case "Unique Paths in a Grid II": return "cct/uniqueGridPaths2.js"
        case "Encryption II: Vigenère Cipher": return "cct/vigenere.js"
        case "Total Ways to Sum": return "cct/ways2sum.js"
        case "Total Ways to Sum II": return "cct/ways2sum2.js"
    }
    return undefined
}

/** @param {NS} ns */
export async function main(ns: NS) {
    const types: CodingContractName[] = read_cct_file(ns)
        .filter(is_unresolved)
        .map(cct => cct.type)
        .filter(t => t !== undefined)
        .filter(f_unique)

    if (types.length > 0) log(ns, "Try solving %d types", types.length)

    const scripts: [CodingContractName, string | undefined][] = types.map(t => [t, get_solver_script(t)])
    scripts.filter(([t, s]) => s === undefined).forEach(([t, s]) => error_t(ns, "Kein CCT-Solver-Skript bekannt für '%s'", t))
    const pids = scripts.filter(([t, s]) => s !== undefined).map(([t, s]) => ns.run(s!))

    await all_finished(ns, pids.filter(p => p !== 0))
}
