const SERVER_FILE = "/data/server_data.txt"

export class MyServer {
  host: string
  level: number
  path: string[]
  parent: string | null

  is_analyzed: boolean
  max_ram: number | undefined
  min_security: number | undefined
  max_money: number | undefined
  hack_needed: number | undefined
  organization: string | undefined
  growth_mult: number | undefined
  ports_needed: number | undefined
  cores: number | undefined

  status_set: boolean
  nuked: boolean | undefined
  backdoor: boolean | undefined
  ram_used: number | undefined
  current_money: number | undefined
  current_security: number | undefined

  /**
   * @param {string} host
   * @param {number} level
   * @param {string[]} path
   * @param {string | null} parent
   */
  constructor(host: string, level: number, path: string[], parent: string | null) {
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
  add_analyze_data(max_ram: number, min_security: number, max_money: number, hack_needed: number, organization: string, growth_mult: number, ports_needed: number, cores: number): MyServer {
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
  set_status(nuked: boolean, backdoor_opened: boolean, ram_used: number, current_money: number, current_security: number): MyServer {
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
  static fromJSON(obj: any): MyServer {
    const s = new MyServer(obj.host!, obj.level!, obj.path!, obj.parent!)
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
  get_copy(): MyServer {
    return MyServer.fromJSON(JSON.parse(JSON.stringify(this)))
  }
}

/**
 * Writes all servers to file.
 * @param {NS} ns
 * @param {MyServer[]} servers
 */
export function write_server_file(ns: NS, servers: MyServer[]) {
  const server_data = JSON.stringify(servers)
  ns.write(SERVER_FILE, server_data, "w")
}

/**
 * Reads all servers from file.
 * @param {NS} ns
 * @return {MyServer[]} Loaded servers.
 */
export function read_server_file(ns: NS): MyServer[] {
  const server_data = ns.read(SERVER_FILE)
  const servers = JSON.parse(server_data).map((o: any) => MyServer.fromJSON(o))
  return servers
}