import { FactionName, Multipliers } from "@ns"
import { f_unique } from "/lib/functions"

const AUGMENTS_FILE = "/data/augments_data.txt"

interface UniqueAugmentInfo {
  name: string,
  faction: string,
  info: string
}

export class MyAugment {
  name: string
  factions: FactionName[]
  is_unique: boolean

  stats: Multipliers
  price: number
  req_reputation: number
  req_augments: string[]
  /** All required augments, also those which are indirectly required. */
  req_augments_indirect: string[]

  installed: boolean
  owned: boolean
  hack_factor: number
  reputation_factor: number
  charisma_factor: number
  physical_factor: number
  overall_factor: number
  score: number

  constructor(name: string, faction: FactionName) {
    this.name = name
    this.factions = [faction]

    this.is_unique = MyAugment.unique_aug_names().includes(this.name)

    this.stats = { agility: 1, agility_exp: 1, bladeburner_analysis: 1, bladeburner_max_stamina: 1, bladeburner_stamina_gain: 1, bladeburner_success_chance: 1, charisma: 1, charisma_exp: 1, company_rep: 1, crime_money: 1, crime_success: 1, defense: 1, defense_exp: 1, dexterity: 1, dexterity_exp: 1, faction_rep: 1, hacking: 1, hacking_chance: 1, hacking_exp: 1, hacking_grow: 1, hacking_money: 1, hacking_speed: 1, hacknet_node_core_cost: 1, hacknet_node_level_cost: 1, hacknet_node_money: 1, hacknet_node_purchase_cost: 1, hacknet_node_ram_cost: 1, strength: 1, strength_exp: 1, work_money: 1 }
    this.price = 0
    this.req_reputation = 0
    this.req_augments = []
    this.req_augments_indirect = []

    this.installed = false
    this.owned = false

    this.hack_factor = 1
    this.reputation_factor = 1
    this.charisma_factor = 1
    this.physical_factor = 1
    this.overall_factor = 1

    this.score = 0
  }

  add_faction(faction: FactionName): MyAugment {
    if (!this.factions.includes(faction)) this.factions.push(faction)
    return this
  }

  set_stats(stats: Multipliers): MyAugment {
    this.stats = stats
    if (this.stats == null) return this

    const s = this.stats
    this.hack_factor = s.hacking * s.hacking_chance * s.hacking_exp * s.hacking_grow * s.hacking_money * s.hacking_speed
    this.reputation_factor = s.company_rep * s.faction_rep
    this.charisma_factor = s.charisma * s.charisma_exp
    this.physical_factor = s.strength * s.strength_exp * s.defense * s.defense_exp * s.dexterity * s.dexterity_exp * s.agility * s.agility_exp
    this.overall_factor = this.hack_factor * this.reputation_factor * this.charisma_factor * this.physical_factor

    this.score = MyAugment.calculate_score([this])
    return this
  }

  set_factions(factions: FactionName[]): MyAugment { this.factions = factions; return this }
  set_price(price: number): MyAugment { this.price = price; return this }
  set_req_reputation(req_reputation: number): MyAugment { this.req_reputation = req_reputation; return this }
  set_req_augments(req_augments: string[]): MyAugment { this.req_augments = req_augments; return this }
  set_req_augments_indirect(req_augments_indirect: string[]): MyAugment { this.req_augments_indirect = req_augments_indirect; return this }
  set_owned(owned: boolean): MyAugment { this.owned = owned; return this }

  fill_indirect_required_augments(all_augments: MyAugment[]): MyAugment {
    let indirect_requirements = this.req_augments
    for (; ;) {
      const last_size = indirect_requirements.length
      indirect_requirements = all_augments
        .filter(a => indirect_requirements.includes(a.name))
        .flatMap(a => [a.name, ...a.req_augments])
        .filter(f_unique)
      if (indirect_requirements.length <= last_size) break
    }
    this.req_augments_indirect = indirect_requirements
    return this
  }

  update_owned(owned_augs: string[]): MyAugment {
    if (Array.isArray(owned_augs) && owned_augs.length > 0 && owned_augs.includes) {
      this.owned = owned_augs.includes(this.name)
    }
    return this
  }

  update_installed(installed_augs: string[]): MyAugment {
    if (Array.isArray(installed_augs) && installed_augs.length > 0 && installed_augs.includes) {
      this.installed = installed_augs.includes(this.name)
    }
    return this
  }

  static unique_aug_ssh_1m(): UniqueAugmentInfo {
    return { name: "CashRoot Starter Kit", faction: "Sector-12", info: "Starting money 1m, programs: BruteSSH" }
  }

  static unique_aug_no_focus(): UniqueAugmentInfo {
    return { name: "Neuroreceptor Management Implant", faction: "Tian Di Hui", info: "No penalty for not focussing" }
  }

  static unique_aug_ftp_smtp(): UniqueAugmentInfo {
    return { name: "BitRunners Neurolink", faction: "BitRunners", info: "programs: ftpCrack, relaySMTP" }
  }

  static unique_aug_world_deamon(): UniqueAugmentInfo {
    return { name: "The Red Pill", faction: "Deadalus", info: "Revealing the WorldDeamon" }
  }

  static unique_aug_names(): string[] {
    return [
      MyAugment.unique_aug_ssh_1m(),
      MyAugment.unique_aug_no_focus(),
      MyAugment.unique_aug_ftp_smtp(),
      MyAugment.unique_aug_world_deamon(),
    ].map(info => info.name)
  }

  static calculate_score(augs: MyAugment[]): number {
    let power = 10
    let score = 0

    const unique_index = augs
      .filter(a => a.is_unique)
      .map(a => MyAugment.unique_aug_names().indexOf(a.name))
      .reduce((m, idx) => m > -1 && m < idx ? m : idx, -1)
    score += (unique_index + 1) * 10 ** power
    power -= 2

    const hack_factor = augs.reduce((f, a) => a.hack_factor * f, 1)
    score += (hack_factor - 1) * 10 ** power
    power--

    const reputation_factor = augs.reduce((f, a) => a.reputation_factor * f, 1)
    score += (reputation_factor - 1) * 10 ** power
    power--

    const charisma_factor = augs.reduce((f, a) => a.charisma_factor * f, 1)
    score += (charisma_factor - 1) * 10 ** power
    power--

    const physical_factor = augs.reduce((f, a) => a.physical_factor * f, 1)
    score += (physical_factor - 1) * 10 ** power
    power--

    return score
  }

  static fromJSON(o: any) {
    return new MyAugment(o.name, o.factions[0])
      .set_factions(o.factions)
      .set_stats(o.stats)
      .set_price(o.price)
      .set_req_reputation(o.req_reputation)
      .set_req_augments(o.req_augments)
      .set_req_augments_indirect(o.req_augments_indirect)
      .set_owned(o.owned)
  }
}

/**
 * Writes all known Augmentations to file.
 * @param {NS} ns
 * @param {MyAugment[]} augments
 */
export function write_augments_file(ns: NS, augments: MyAugment[]): void {
  const server_data = JSON.stringify(augments)
  ns.write(AUGMENTS_FILE, server_data, "w")
}

/**
 * Reads all servers from file.
 * @param {NS} ns
 * @return {MyAugment[]} Loaded augmentations.
 */
export function read_augments_file(ns: NS): MyAugment[] {
  const augments_data = ns.read(AUGMENTS_FILE)
  const augments = JSON.parse(augments_data).map((o: any) => MyAugment.fromJSON(o))
  return augments
}