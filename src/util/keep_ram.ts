import { KeepRamEntry, read_keep_ram_file, write_keep_ram_file } from "lib/keep_ram"
import { error_t, warning_t } from "lib/log"

/** @param {NS} ns */
export async function main(ns: NS) {
  const OPTS = ns.flags([
    ['reset', false], // reset all keep RAM settings
    ['l', false], // lists current settings
    ['a', 0], // sets RAM for all servers to the desired amount (or the maximum RAM, if the server has less)
    ['?', false], ['help', false], // prints help and exits
  ])
  OPTS.help = OPTS.help || OPTS['?']
  /** @type {[string, string]} */
  const [host, ramParam] = OPTS["_"] as string[]
  const ram = parseInt(ramParam)

  /** @return {never} */
  function printHelpAndExit(): never {
    ns.tprintf("Hilfe:")
    ns.tprintf(" ")
    ns.tprintf("Aufruf: %s [OPTIONEN] [HOST NUM]", ns.getScriptName())
    ns.tprintf("  Sichert [NUM] GB RAM auf Server [HOST].")
    ns.tprintf(" ")
    ns.tprintf("Folgende Optionen sind verfügbar:")
    ns.tprintf("  %-16s - %s", "--reset", "Setzt alle Einstellungen zurück")
    ns.tprintf("  %-16s - %s", "-l", "Listet alle Server mit gesetztem Wert auf.")
    ns.tprintf("  %-16s - %s", "-a NUM", "Sichert [NUM] GB auf allen Servern (sofern verfügbar).")
    ns.tprintf("  %-16s - %s", "-?/--help", "Diese Hilfe ausgeben")
    ns.exit()
  }

  if (OPTS.help) {
    printHelpAndExit()
  }

  let entries: KeepRamEntry[]
  let changed: boolean = false
  if (OPTS.reset === true) {
    entries = []
    changed = true
  } else {
    entries = read_keep_ram_file(ns)
  }

  if (OPTS.l === true) {
    entries.sort((a, b) => a.host.localeCompare(b.host))
    ns.tprintf("Folgende RAM-Bereiche werden aktuell gesichert:")
    entries.forEach(e => {
      ns.tprintf("%-30s: %s", e.host, ns.formatRam(e.ram))
    })
  } else if (OPTS.a === true) {
    error_t(ns, "Dieses Feature ist aktuell noch nicht umgesetzt.")
  } else if (host) {
    if (ram === 0) {
      // delete entry (if any can be found)
      const filteredEntries = entries.filter(e => e.host === host)
      changed = (filteredEntries.length !== entries.length)
      entries = filteredEntries
    } else if (ram) {
      // overwrite current setting or add a new one
      // only if enough RAM is installed on the machine
      const serverRam = ns.getServerMaxRam(host)
      if (serverRam <= 0) {
        error_t(ns, "Server %s stellt keinerlei RAM zur Verfügung oder ist unbekannt.", host)
      } else {
        const new_ram = Math.min(serverRam, ram)
        if (new_ram !== ram) {
          warning_t(ns, "Server %s hat nicht genug RAM, um %d GB zu sichern. Sichere %d GB.", host, ram, new_ram)
        }
        const present_entry = entries.find(e => e.host === host)
        if (present_entry !== undefined) {
          if (present_entry.ram !== new_ram) {
            present_entry.ram = new_ram
            changed = true
          }
        } else {
          entries.push(new KeepRamEntry(host, new_ram))
          changed = true
        }
      }
    }
  } else {
    printHelpAndExit()
  }

  if (changed) {
    write_keep_ram_file(ns, entries)
  } else {
    // there were no changes
    warning_t(ns, "Es wurden keine Änderungen vorgenommen.")
  }

}