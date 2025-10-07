import { CodingContractName } from "@ns"

const CCTS_FILE = "data/ccts.txt"

/*BigInt.prototype.toJSON = function (): string {
  return this.toString()
}*/

export class MyContract {
  host: string
  file: string
  type: CodingContractName | undefined
  data: any | undefined
  description: string | undefined
  debug_data: any | undefined
  solution: any | undefined
  test_multiple_solutions: boolean
  /**
   * @param {string} host
   * @param {string} file
   */
  constructor(host: string, file: string) {
    this.host = host
    this.file = file
    this.test_multiple_solutions = false
  }

  setType(type: CodingContractName): MyContract {
    this.type = type
    return this
  }

  setData(data: any): MyContract {
    this.data = data
    return this
  }

  setDescription(description: string): MyContract {
    this.description = description
    return this
  }

  setDebugData(debugData: any): MyContract {
    this.debug_data = debugData
    console.log("Debug Data set")
    return this
  }

  setSolution(solution: any): MyContract {
    this.solution = solution
    this.test_multiple_solutions = false
    return this
  }

  setSolutions(solutions: any[]): MyContract {
    this.solution = solutions
    this.test_multiple_solutions = true
    return this
  }

  /**
   * Checks if both contracts are the same (same file on the same server)?
   */
  same_as(other: MyContract): boolean {
    return other.host === this.host && other.file === this.file
  }

  static from_json_object(obj: any): MyContract {
    const c = new MyContract(obj.host, obj.file)

    if (obj.type) c.setType(obj.type)
    if (obj.data) c.setData(obj.data)
    if (obj.description) c.setDescription(obj.description)
    if (obj.debug_data) c.setDebugData(obj.debug_data)

    if (obj.test_multiple_solutions) { c.setSolutions(obj.solution) }
    else { c.setSolution(obj.solution) }

    return c
  }
}

/**
 * Writes all contracts to file.
 * @param {NS} ns
 * @param {MyContract[]} ccts
 */
export function write_cct_file(ns: NS, ccts: MyContract[]): void {
  const cct_data = JSON.stringify(ccts, (_, v) => typeof v === 'bigint' ? v.toString() : v)
  ns.write(CCTS_FILE, cct_data, "w")
}

/**
 * Reads all contracts from file.
 * @param {NS} ns
 * @return {MyContract[]} Loaded contracts.
 */
export function read_cct_file(ns: NS): MyContract[] {
  const cct_data = ns.read(CCTS_FILE)
  const ccts = JSON.parse(cct_data).map((l: any) => MyContract.from_json_object(l))
  return ccts
}

/**
 * Determines if a contract is unresolved.
 * @param {MyContract} cct Contract to check whether its unresolved or not
 * @returns True when unresolved, false otherwise.
 */
export function is_unresolved(cct: MyContract): boolean {
  return cct.solution === undefined
}

/**
 * Filter function for only keeping contracts of a given type.
 * @param type Contract type to pass
 * @returns A filter function to only let contracts through with the given type.
 */
export function filter_type(type: CodingContractName): (cct: MyContract) => boolean {
  return (c => c.type === type)
}

/**
 * Reads contract file and gets all contracts of a given type
 * @param {NS} ns
 * @param {string} type
 * @return {MyContract[]}
 */
export function get_unsolved_contracts(ns: NS, type: CodingContractName): MyContract[] {
  return read_cct_file(ns).filter(filter_type(type)).filter(is_unresolved)
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
export function update_contract(ns: NS, contract: MyContract) {
  const ccts = read_cct_file(ns).map(c => c.same_as(contract) ? contract : c)
  write_cct_file(ns, ccts)
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
export function remove_contract(ns: NS, contract: MyContract) {
  const remaining_ccts = read_cct_file(ns).filter(c => !c.same_as(contract))
  write_cct_file(ns, remaining_ccts)
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 * @return {never}
 */
export function just_describe(ns: NS, contract: MyContract): never {
  ns.tprintf("Description:\n%s", contract.description)
  ns.tprintf("Data:\n%s", JSON.stringify(contract.data, (_, v) => typeof v === 'bigint' ? v.toString() : v))
  ns.exit()
}
