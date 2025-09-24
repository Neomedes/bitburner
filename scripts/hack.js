/**
 * NOTE: Assume that we have root access on the target server.
 *
 * Hack a server and steal its money.  We weaken the server's security as
 * necessary, grow the server in case the amount of money on the server is
 * below our threshold, and hack the server when all conditions are met.  We
 * want one command line argument, i.e. the name of the server to hack.
 *
 * Usage: run hack.js [targetServer]
 * Example: run hack.js n00dles
 *
 * @param {NS} ns The Netscript API.
 */
export async function main(ns) {
  // disable logs
  [
    "disableLog",
    "getServerMaxMoney",
    "getServerMinSecurityLevel",
    "getServerMoneyAvailable",
    "getServerSecurityLevel"
  ].forEach(fn => ns.disableLog(fn))
  // The target server, i.e. the server to hack.
  const target = ns.args[0]
  // How much money a server should have before we hack it.  Even if the
  // server is bankrupt, successfully hacking it would increase our Hack XP,
  // although we would not receive any money.  Set the money threshold at 75%
  // of the server's maximum money.
  const max_money = ns.getServerMaxMoney(target)
  const money_threshold = Math.floor(max_money * 0.75)
  // The threshold for the server's security level.  If the target's
  // security level is higher than the threshold, weaken the target
  // before doing anything else.
  const min_security = ns.getServerMinSecurityLevel(target)
  const security_threshold = min_security + 5
  // Continuously hack/grow/weaken the target server.
  for (; ;) {
    const money = ns.getServerMoneyAvailable(target)
    const security_level = ns.getServerSecurityLevel(target)
    if (security_level > security_threshold) {
      ns.printf("Weaken: %d -> %d", security_level, min_security)
      const weakened = await ns.weaken(target)
      //ns.tprintf("Weaken: Neues Level: %d", security_level - weakened)
    } else if (money < money_threshold) {
      ns.printf("Grow: %d -> %d", money, max_money)
      const multiplier = await ns.grow(target)
      //ns.tprintf("Grow: Gesteigert um %d%% auf %s", multiplier, ns.formatNumber(money * multiplier))
    } else {
      ns.printf("Hack")
      const hacked = await ns.hack(target)
      //ns.tprintf("Hack: %s gestolen", security_level, min_security)
    }
  }
}