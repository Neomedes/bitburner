import { MyServer, read_server_file } from "lib/servers.js"
import { error_t, warning_t } from "lib/functions.js"

/**
 * Connects to a server
 * @param {NS} ns 
 * @param {MyServer} target_server 
 * @param {boolean} silent 
 */
async function connect_to(ns, target_server, silent) {
  for (let p of target_server.path) {
    if (ns.singularity.connect(p)) {
    } else {
      if (!silent) warning_t(ns, "%s - %s: Verbindung zu %s fehlgeschlagen", p)
      ns.singularity.connect("home")
      return false
    }
    await ns.sleep(0)
  }
  return true
}

/** @param {NS} ns */
export async function main(ns) {
  const OPTS = ns.flags([
    ['silent', false], // silent
    ['?', false], ['help', false], // flag to display help
  ])
  const [target_host] = OPTS["_"]
  OPTS.help = OPTS.help || OPTS['?']

  /** @return {never} */
  function print_help_and_exit() {
    ns.tprintf("Connected zum angegeben Server.")
    ns.tprintf("Aufruf:")
    ns.tprintf("%s [--silent] ZIEL", ns.getScriptName())
    ns.tprintf("%-16s - %s", "--silent", "Rein informative Ausgaben unterdrücken")
    ns.tprintf("%-16s - %s", "--help|-?", "Nur diese Hilfe ausgeben und Skript beenden.")
    ns.exit()
  }

  if (OPTS.help) {
    print_help_and_exit()
  }

  if (!target_host || target_host === "") {
    error_t(ns, "%s: Fehlerhafter Aufruf: Kein Ziel-Server angegeben!", ns.getScriptName())
    if (!OPTS.silent) {
      print_help_and_exit()
    }
    ns.exit()
  }

  const servers = read_server_file(ns)
  const target_server = servers.find(s => s.host === target_host)

  if (!target_server) {
    error_t(ns, "%s: Ziel-Server %s unbekannt.", ns.getScriptName(), target)
    ns.exit()
  }

  await connect_to(ns, target_server, OPTS.silent)
}