import { BackdoorRequirement, FactionName, NS, Player, PlayerRequirement } from "@ns"
import { OutputTable } from "lib/functions"
import { MyAugment } from "lib/sing_augs"
import { get_updated_augment_list, get_updated_server_list } from "util/update_data"
import { MyServer } from "/lib/servers"

interface ResultData {
  name: string
  score: number
  price: number
  rep: number
  data: string
}

function player_meets_faction_req(player: Player, servers: MyServer[], requirement: PlayerRequirement): boolean {
  switch (requirement.type) {
    case "backdoorInstalled":
      const req: BackdoorRequirement = requirement
      return servers.some(s => s.host === req.server && s.backdoor)
      break;

    case "bitNodeN":
    case "bladeburnerRank":
    case "city":
    case "companyReputation":
    case "employedBy":
    case "everyCondition":
    case "file":
    case "hacknetCores":
    case "hacknetLevels":
    case "hacknetRAM":
    case "jobTitle":
    case "karma":
    case "location":
    case "money":
    case "not":
    case "numAugmentations":
    case "numInfiltrations":
    case "numPeopleKilled":
    case "skills":
    case "someCondition":
    case "sourceFile":
    default:
      return false
  }
}

async function get_faction_requirements_info(ns: NS, requirements: PlayerRequirement[]): Promise<string> {
  const player = ns.getPlayer()
  const servers = await get_updated_server_list(ns)
  const missing_reqs = requirements.filter(req => !player_meets_faction_req(player, servers, req))
  return JSON.stringify(requirements)
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
async function to_facs_data(ns: NS, filtered: MyAugment[], factions: string[] | null = null) {
  const grouped_by_fac = new Map<string, MyAugment[]>()
  filtered.forEach(a => {
    a.factions.forEach(f => {
      // skip nonvalid factions if any are given
      if (factions != null && !factions.includes(f)) return

      if (grouped_by_fac.has(f)) {
        grouped_by_fac.get(f)!.push(a)
      } else {
        grouped_by_fac.set(f, [a])
      }
    })
  })
  return await Promise.all(Object.entries(grouped_by_fac).map(
    async ([key, value]) => {
      return await (async () => {
        const faction_name = key as FactionName
        const augment_list = value as MyAugment[]
        const result: ResultData = {
          name: faction_name,
          score: augment_list.reduce((tt, a) => tt + (a.score ?? 0), 0),
          price: augment_list.reduce((tt, a) => tt + (a.price ?? 0), 0),
          rep: augment_list.reduce((tt, a) => Math.max(tt, a.req_reputation ?? 0), 0),
          data: await get_faction_requirements_info(ns, ns.singularity.getFactionInviteRequirements(faction_name as FactionName)),
        }
        return result
      })()
    }
  ))
}

/** @param {MyAugment[]} filtered @param {string[]?} factions @return {ResultData[]} */
function to_augs_data(filtered: MyAugment[], factions: string[] | null = null): ResultData[] {
  return filtered.map(
    a => {
      return {
        name: a.name,
        score: a.score ?? 0,
        price: a.price ?? 0,
        rep: a.req_reputation ?? 0,
        data: (factions != null ? a.factions.filter(f => factions.includes(f)) : a.factions).join(", "),
      }
    }
  )
}

/** @param {NS} ns */
export async function main(ns: NS) {
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
    const data = await to_facs_data(ns, all_augments.filter(a => !a.owned))
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

  } else {
    printHelpAndExit()
  }

}