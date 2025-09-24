const SERVER_FILE = "/data/server_data.txt"

export class MyServer {
  /**
   * @param {string} host
   * @param {number} level
   * @param {string[]} path
   * @param {string} parent
   */
  constructor(host, level, path, parent) {
    this.host = host
    this.level = level
    this.path = path
    this.parent = parent
    this.is_analyzed = false
    this.status_set = false
  }

  /**
   * @param {number} max_ram
   * @param {number} min_security
   * @param {number} max_money
   * @param {number} hack_needed Hack stat needed to hack this server
   * @param {string} organization
   * @param {number} growth_mult
   * @param {number} ports_needed
   * @param {number} cores
   * @return {MyServer}
   */
  add_analyze_data(max_ram, min_security, max_money, hack_needed, organization, growth_mult, ports_needed, cores) {
    this.is_analyzed = true
    this.max_ram = max_ram
    this.min_security = min_security
    this.max_money = max_money
    this.hack_needed = hack_needed
    this.organization = organization
    this.growth_mult = growth_mult
    this.ports_needed = ports_needed
    this.cores = cores
    return this
  }

  /**
   * @param {boolean} nuked
   * @param {boolean} backdoor_opened
   * @param {number} ram_used
   * @param {number} current_money
   * @param {number} current_security
   * @return {MyServer}
   */
  set_status(nuked, backdoor_opened, ram_used, current_money, current_security) {
    this.status_set = true
    this.nuked = nuked
    this.backdoor = backdoor_opened
    this.ram_used = ram_used
    this.current_money = current_money
    this.current_security = current_security
    return this
  }

  /**
   * @param {any} Object parsed from JSON
   * @return {MyServer} The parsed server.
   */
  static fromJSON(obj) {
    const s = new MyServer(obj.host, obj.level, obj.path, obj.parent)
    if (obj.is_analyzed) {
      s.add_analyze_data(
        obj.max_ram,
        obj.min_security,
        obj.max_money,
        obj.hack_needed,
        obj.organization,
        obj.growth_mult,
        obj.ports_needed,
        obj.cores,
      )
    } if (obj.status_set) {
      s.set_status(obj.nuked, obj.backdoor, obj.ram_used, obj.current_money, obj.current_security)
    }
    return s
  }

  /** Creates a copy of this server. */
  get_copy() {
    return MyServer.fromJSON(JSON.parse(JSON.stringify(this)))
  }

  /**
   * Creates a copy of this server with the given data changed.
   * @param {any[]} keys_n_values Keys and values in succession of the properties to set
   * @return {MyServer} A new server with the given properties and the rest copied from this server.
   */
  copy_with(...keys_n_values) {
    const copy = this.get_copy()
    while (keys_n_values.length >= 2) {
      const key = keys_n_values.shift()
      const value = keys_n_values.shift()
      copy[key] = value
    }
    return copy
  }
}

/**
 * Writes all servers to file.
 * @param {NS} ns
 * @param {MyServer[]} servers
 */
export function write_server_file(ns, servers) {
  const server_data = JSON.stringify(servers)
  ns.write(SERVER_FILE, server_data, "w")
}

/**
 * Reads all servers from file.
 * @param {NS} ns
 * @return {MyServer[]} Loaded servers.
 */
export function read_server_file(ns) {
  const server_data = ns.read(SERVER_FILE)
  const servers = JSON.parse(server_data).map(o => MyServer.fromJSON(o))
  return servers
}