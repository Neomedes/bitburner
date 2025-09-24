import { finished, OutputTable } from "lib/functions.js"
import { read_augments_file, MyAugment } from "lib/sing_augs.js"
import { get_updated_augment_list } from "util/update_data.js"

class ResultData {
  constructor(name, score, price, rep, data) {
    this.name = name,
      this.score = score,
      this.price = price,
      this.rep = rep,
      this.data = data
  }
}

/** @param {Player} player @param {PlayerRequirement[]} requirements */
function get_missing_faction_requirements(player, requirements) {
  // requirements:
  /*
    [
      {"type":"numAugmentations","numAugmentations":30},
      {"type":"money","money":150000000000},
      {"type":"skills","skills":{"hacking":1500}},
      {"type":"skills","skills":{"strength":1200}},
      {"type":"skills","skills":{"defense":1200}},
      {"type":"skills","skills":{"dexterity":1200}},
      {"type":"skills","skills":{"agility":1200}}
    ]
   */
}

/** @param {NS} ns @param {MyAugment[]} filtered @param {string[]?} factions @return {ResultData[]} */
function to_facs_data(ns, filtered, factions = null) {
  const grouped_by_fac = {}
  filtered.forEach(a => {
    a.factions.forEach(f => {
      if (factions != null && !factions.includes(f)) return
      if (grouped_by_fac[f] === undefined) {
        grouped_by_fac[f] = []
      }
      grouped_by_fac[f].push(a)
    })
  })
  return Object.entries(grouped_by_fac).map(
    e => new ResultData(
      e[0],
      e[1].reduce((tt, a) => tt + a.score, 0),
      e[1].reduce((tt, a) => tt + a.price, 0),
      e[1].reduce((tt, a) => Math.max(tt, a.req_reputation), 0),
      JSON.stringify(ns.singularity.getFactionInviteRequirements(e[0]))
    )
  )
}

/** @param {MyAugment[]} filtered @param {string[]?} factions @return {ResultData[]} */
function to_augs_data(filtered, factions = null) {
  return filtered.map(
    a => new ResultData(
      a.name,
      a.score,
      a.price,
      a.req_reputation,
      (factions != null ? a.factions.filter(f => factions.includes(f)) : a.factions).join(", ")
    )
  )
}

/** @param {NS} ns */
export async function main(ns) {
  const OPTS = ns.flags([
    ['augs', false], // find best augments
    ['facs', false], // list factions instead of augments
    ['next', false], // find next augments
    ['rep', false], // only consider purchasable augs with current faction reputation
    ['?', false], ['help', false], // get purchase augmentations list
  ])
  OPTS.help = OPTS.help || OPTS['?']

  /**
   * @return {never}
   */
  function printHelpAndExit() {
    ns.tprintf("Ausgabe von sinnvollen Augments und deren Factions für die nächste Installation.")
    ns.tprintf("Diese sind auch bekannt als PAL - der 'Purchase Augmentations List'")
    ns.tprintf(" ")
    ns.tprintf("Folgende Optionen hat das Skript %s:", ns.getScriptName())
    ns.tprintf(" ")
    ns.tprintf("%-16s - %s", "--augs", "Beste Augments finden")
    ns.tprintf("%-16s - %s", "--facs", "Factions mit den besten Augments ausgeben")
    ns.tprintf("%-16s - %s", "--next", "Als nächstes zu kaufende Augments ermitteln")
    ns.tprintf("%-16s - %s", "--rep", "Verfügbare Reputation berücksichtigen")
    ns.tprintf("%-16s - %s", "--help  / -?", "Diese Hilfe ausgeben")
    ns.exit()
  }

  if (OPTS.help) printHelpAndExit()

  const all_augments = await get_updated_augment_list(ns, true)

  if (OPTS.augs) {
    const data = to_augs_data(all_augments.filter(a => !a.owned))
    data.sort((a, b) => b.score - a.score) // sort by score descending

    const ot = new OutputTable(ns, [
      [2],
      [10, OutputTable.DATA_TYPES.CURRENCY],
      [60],
      [10, OutputTable.DATA_TYPES.NUMBER],
      [10, OutputTable.DATA_TYPES.NUMBER],
      [0]]
    )

    ot.separator()
    ot.headline("Nr", "Preis", "Name", "Reputation", "Score", "Requirements")
    data.forEach((l, i) => ot.line(i + 1, l.price, l.name, l.rep, l.score, l.data))
    ot.separator()

  } else if (OPTS.facs) {
    const data = to_facs_data(ns, all_augments.filter(a => !a.owned))
    data.sort((a, b) => b.score - a.score) // sort by score descending

    const ot = new OutputTable(ns, [
      [2],
      [10, OutputTable.DATA_TYPES.CURRENCY],
      [60],
      [10, OutputTable.DATA_TYPES.NUMBER],
      [10, OutputTable.DATA_TYPES.NUMBER],
      [0]]
    )

    ot.separator()
    ot.headline("Nr", "Preis", "Name", "Reputation", "Score", "Factions")
    data.forEach((l, i) => ot.line(i + 1, l.price, l.name, l.rep, l.score, l.data))
    ot.separator()

  } else if (OPTS.next) {
    ns.singularity.getFactionInviteRequirements()
  } else {
    printHelpAndExit()
  }

}