import { Multipliers } from "@ns"

const AUGMENTS_FILE = "/data/augments_data.txt"

interface UniqueAugmentInfo {
  name: string,
  faction: string,
  info: string
}

export class MyAugment {
  name: string
  factions: string[]
  is_unique: boolean

  stats: Multipliers | undefined
  price: number | undefined
  req_reputation: number | undefined
  req_augments: string[] | undefined
  owned: boolean
  hack_factor: number | undefined
  reputation_factor: number | undefined
  charisma_factor: number | undefined
  physical_factor: number | undefined
  score: number | undefined

  constructor(name: string, faction: string) {
    this.name = name
    this.factions = [faction]

    this.is_unique = MyAugment.unique_aug_names().includes(this.name)

    this.stats = undefined
    this.price = undefined
    this.req_reputation = undefined
    this.req_augments = undefined
    this.owned = false
  }

  add_faction(faction: string): MyAugment {
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

    this.score = MyAugment.calculate_score([this])
    return this
  }

  set_factions(factions: string[]): MyAugment { this.factions = factions; return this }
  set_price(price: number): MyAugment { this.price = price; return this }
  set_req_reputation(req_reputation: number): MyAugment { this.req_reputation = req_reputation; return this }
  set_req_augments(req_augments: string[]): MyAugment { this.req_augments = req_augments; return this }
  set_owned(owned: boolean): MyAugment { this.owned = owned; return this }

  update_owned(owned_augs: string[]): MyAugment {
    if (Array.isArray(owned_augs) && owned_augs.length > 0 && owned_augs.includes) {
      this.owned = owned_augs.includes(this.name)
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

    const hack_factor = augs.reduce((f, a) => (a.hack_factor ?? 1) * f, 1)
    score += (hack_factor - 1) * 10 ** power
    power--

    const reputation_factor = augs.reduce((f, a) => (a.reputation_factor ?? 1) * f, 1)
    score += (reputation_factor - 1) * 10 ** power
    power--

    const charisma_factor = augs.reduce((f, a) => (a.charisma_factor ?? 1) * f, 1)
    score += (charisma_factor - 1) * 10 ** power
    power--

    const physical_factor = augs.reduce((f, a) => (a.physical_factor ?? 1) * f, 1)
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