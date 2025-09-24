const CCTS_FILE = "data/ccts.txt"

BigInt.prototype.toJSON = function () {
  return this.toString()
}

export class MyContract {
  /**
   * @param {string} host
   * @param {string} file
   */
  constructor(host, file) {
    this.host = host
    this.file = file
  }

  /**
   * @param {string} type
   */
  setType(type) {
    this.type = type
    return this
  }

  /**
   * @param {any} data
   */
  setData(data) {
    this.data = data
    return this
  }

  /**
   * @param {string} description
   */
  setDescription(description) {
    this.description = description
    return this
  }

  /**
   * @param {any} debugData
   */
  setDebugData(debugData) {
    this.debug_data = debugData
    console.log("Debug Data set")
    return this
  }

  /**
   * @param {any} solution
   */
  setSolution(solution) {
    this.solution = solution
    this.test_multiple_solutions = false
    return this
  }

  /**
   * @param {any[]} solutions Possible soultions to test
   */
  setSolutions(solutions) {
    this.solution = solutions
    this.test_multiple_solutions = true
    return this
  }

  /**
   * @param {MyContract} other
   * @return {boolean} Is this the same as the other?
   */
  same_as(other) {
    return other.host === this.host && other.file === this.file
  }

  static from_json_object(obj) {
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
export function write_cct_file(ns, ccts) {
  const cct_data = JSON.stringify(ccts)
  ns.write(CCTS_FILE, cct_data, "w")
}

/**
 * Reads all contracts from file.
 * @param {NS} ns
 * @return {MyContract[]} Loaded contracts.
 */
export function read_cct_file(ns) {
  const cct_data = ns.read(CCTS_FILE)
  const ccts = JSON.parse(cct_data).map(l => MyContract.from_json_object(l))
  return ccts
}

/**
 * Reads contract file and gets all contracts of a given type
 * @param {NS} ns
 * @param {string} type
 * @return {MyContract[]}
 */
export function get_unsolved_contracts(ns, type) {
  const all_ccts = read_cct_file(ns)
  return all_ccts.filter(c => c.type === type).filter(c => c.solution === undefined)
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
export function update_contract(ns, contract) {
  const ccts = read_cct_file(ns).map(c => c.same_as(contract) ? contract : c)
  write_cct_file(ns, ccts)
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
export function remove_contract(ns, contract) {
  const remaining_ccts = read_cct_file(ns).filter(c => !c.same_as(contract))
  write_cct_file(ns, remaining_ccts)
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 * @return {never}
 */
export function just_describe(ns, contract) {
  ns.tprintf("Description:\n%s", contract.description)
  ns.tprintf("Data:\n%s", JSON.stringify(contract.data))
  ns.exit()
}
