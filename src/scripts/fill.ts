import { keep_ram } from "lib/functions"
import { error_t } from "lib/log"

/** @param {NS} ns */
export async function main(ns: NS) {
  const OPTS = ns.flags([
    ['keep', -1], // how much ram should be kept from using
    ['k', false], // disable auto keep ram
  ])
  const [target, script] = OPTS["_"] as string[]
  const targetServer = ns.getServer(target)
  if (!targetServer) {
    error_t(ns, "Kein Server mit Namen \"%s\" gefunden.", target)
    return
  }
  const scriptFile = `scripts/${script}.js`
  if (!ns.fileExists(scriptFile, "home")) {
    error_t(ns, "Kein Script mit Namen \"%s\" (%s) gefunden.", script, scriptFile)
    return
  }
  ns.scp(scriptFile, target, "home")

  const scriptRam = ns.getScriptRam(scriptFile, "home")
  const keepRam = keep_ram(targetServer.maxRam, OPTS.keep as number, target === "home" && !OPTS.k)
  const ramAvailable = Math.max(targetServer.maxRam - keepRam - targetServer.ramUsed, 0)
  if (ramAvailable >= scriptRam) {
    const threads = Math.floor(ramAvailable / scriptRam)
    ns.exec(scriptFile, target, threads, ...ns.args.slice(2))
  } else {
    error_t(ns, "Nicht genug RAM auf %s um Script %s zu starten.", target, scriptFile)
  }
}