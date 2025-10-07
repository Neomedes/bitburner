//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.Proper2ColoringOfAGraph)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  /** @type {[number, [number, number][]]} */
  const [vertexCount, edges] = contract.data as [number, [number, number][]]

  function* neighbors(vertex: number): Generator<number> {
    for (let v = 0; v < vertexCount; v++) {
      if (vertex == v) {
        // skip the main vertice
        continue
      }
      if (edges.some(e => (e[0] == vertex && e[1] == v) || (e[1] == vertex && e[0] == v))) {
        yield v
      }
    }
  }

  const coloredGraph: number[] = new Array(vertexCount).fill(-1)
  let currentColor = 0
  let currentBatch = [0] // start with the first vertex
  let nextBatch: number[] = []

  coloring: while (currentBatch.length > 0) {
    for (let vertex of currentBatch) {
      if (coloredGraph[vertex] === currentColor) {
        // vertey already has the right color
        continue
      } else if (coloredGraph[vertex] === 1 - currentColor) {
        // vertey already has the wrong color
        coloredGraph[vertex] = -1 // state the error
        break coloring
      } else {
        // the current vertex can be colored and neighbors colored in the next iteration
        coloredGraph[vertex] = currentColor
        for (let n of neighbors(vertex)) {
          nextBatch.push(n)
        }
      }
    }

    // re-fill the batch for the next iteration
    currentBatch = nextBatch
    if (currentBatch.length < 1) {
      // no need for coloring under all previous neighbors
      // but maybe we have a seperate graph unconnected to the current network
      // so search for an uncolored node and start again
      currentBatch = [coloredGraph.findIndex(v => v === -1)]
      // the starting color of this new graph doesn't matter
    }
    nextBatch = []
    currentColor = 1 - currentColor
  }

  const result = coloredGraph.some(v => v === -1) ? [] : coloredGraph

  contract.setSolution(JSON.stringify(result))
}