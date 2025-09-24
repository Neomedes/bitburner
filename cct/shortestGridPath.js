import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Shortest Path in a Grid")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[[number]]} */
  const rect = contract.data
  const rows = rect.length
  const columns = rect[0].length
  const dstRow = rows - 1
  const dstCol = columns - 1

  /**
   * @param {[number, number]} target
   * @return {bool}
   */
  function isInRect(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < columns
  }
  /**
   * @param {[number, number]} target
   * @return {bool}
   */
  function canGo(r, c) {
    return isInRect(r, c) && rect[r][c] === 0
  }
  /** 
   * @param {number} r Row
   * @param {number} c Column
   * @return {Generator<[number, number]>}
   */
  function* neighbors(r, c) {
    if (canGo(r - 1, c)) yield [r - 1, c] // Up
    if (canGo(r + 1, c)) yield [r + 1, c] // Down
    if (canGo(r, c - 1)) yield [r, c - 1] // Left
    if (canGo(r, c + 1)) yield [r, c + 1] // Right
  }

  /** @type {[[number]]} distances to final tile */
  const distance = new Array(rows).fill(0).map(() => new Array(columns).fill(Infinity))
  /** @type {[number, number][]} */
  distance[0][0] = 0
  const queue = []
  queue.push([0, 0])

  // Take next-nearest position and expand potential paths from there
  while (queue.length > 0) {
    const [r, c] = queue.shift()
    for (const [rN, cN] of neighbors(r, c)) {
      if (distance[rN][cN] === Infinity) {
        queue.push([rN, cN]);
        distance[rN][cN] = distance[r][c] + 1;
      }
    }
  }

  function getDirectionLabel(dr, dc) {
    if (dr === 0) {
      return (dc === -1) ? 'L' : 'R'
    }
    return (dr === -1) ? 'U' : 'D'
  }

  let result = ""
  if (Number.isFinite(distance[dstRow][dstCol])) {
    // we have a valid path...
    // now backtrack from the destination
    let r = dstRow, c = dstCol
    let backtrackDistance = distance[r][c]
    searchPreviousTile: while (r !== 0 || c !== 0) {
      // search for previous neighbor
      for (const [rP, cP] of neighbors(r, c)) {
        if (distance[rP][cP] === backtrackDistance - 1) {
          const label = getDirectionLabel(r - rP, c - cP)
          ns.printf("Backtrack to neighbor %s from %s: Label %s", JSON.stringify([rP, cP]), JSON.stringify([r, c]), label)
          result = `${label}${result}`
          r = rP
          c = cP
          backtrackDistance--
          continue searchPreviousTile
        }
      }
    }
  }

  contract.setSolution(result)
}