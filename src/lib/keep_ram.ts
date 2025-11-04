const KEEP_RAM_FILE = "/data/keep_ram.txt"

export class KeepRamEntry {
  host: string
  ram: number
  /**
   * @param {string} host On what host should RAM be kept from using.
   * @param {number} ram How much RAM should be kept from using.
   */
  constructor(host: string, ram: number) {
    this.host = host
    this.ram = ram
  }

  static fromJSON(map: any): KeepRamEntry {
    return new KeepRamEntry(map.host!, map.ram!)
  }
}

/**
 * Writes all entries to file.
 * @param {NS} ns
 * @param {KeepRamEntry[]} entries
 */
export function write_keep_ram_file(ns: NS, entries: KeepRamEntry[]) {
  const keep_ram_data = JSON.stringify(entries)
  ns.write(KEEP_RAM_FILE, keep_ram_data, "w")
}

/**
 * Reads all entries from file.
 * @param {NS} ns
 * @return {KeepRamEntry[]} Loaded entries.
 */
export function read_keep_ram_file(ns: NS): KeepRamEntry[] {
  const keep_ram_data = ns.read(KEEP_RAM_FILE)
  const entries = keep_ram_data ? JSON.parse(keep_ram_data).map((l: any) => KeepRamEntry.fromJSON(l)) : []
  return entries
}

/**
 * Retrieves the current setting how much RAM should be kept from using.
 * @param {KeepRamEntry[]} entries All keep RAM entries.
 * @param {string} host The host to check.
 * @return {number} How much RAM to keep.
 */
export function get_keep_ram(entries: KeepRamEntry[], host: string): number {
  const entry = entries.find(e => e.host === host)
  return entry?.ram ?? 0
}

/**
 * Retrieves the current setting how much RAM should be kept from using.
 * @param {NS} ns Netscript API
 * @param {string} host The host to check.
 * @return {number} How much RAM to keep.
 */
export function fetch_keep_ram(ns: NS, host: string): number {
  return get_keep_ram(read_keep_ram_file(ns), host)
}
