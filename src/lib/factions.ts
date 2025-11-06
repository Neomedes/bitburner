import { CompanyName, FactionName, FactionWorkType, NodeStats, NS, PlayerRequirement } from '@ns'
import { get_skills_diff, has_skills } from '/lib/player'
import { MyServer } from '/lib/servers'
import { MyAugment } from '/lib/sing_augs'
import { f_unique, reduce_to_max, same_array } from '/lib/functions'

const FACTION_FILE = "/data/faction_data.txt"

export const MAX_DIFFICULTY = 1_000_000_000

export interface RequirementData {
    servers: MyServer[],
    augments: MyAugment[],
    factions: MyFaction[],
}

export function count_hacknet_prop(ns: NS, prop: (stats: NodeStats) => number): number {
    let sum = 0
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        const stats = ns.hacknet.getNodeStats(i)
        sum += prop(stats)
    }
    return sum
}

export function player_meets_faction_req(ns: NS, data: RequirementData, requirement: PlayerRequirement): boolean {
    switch (requirement.type) {
        case "everyCondition":
            return requirement.conditions.every(cond => player_meets_faction_req(ns, data, cond))
        case "someCondition":
            return requirement.conditions.some(cond => player_meets_faction_req(ns, data, cond))
        case "not":
            return !player_meets_faction_req(ns, data, requirement.condition)
        case "backdoorInstalled":
            return data.servers.some(s => s.host === requirement.server && s.backdoor)
        case "city":
            return ns.getPlayer().city === requirement.city
        case "companyReputation":
            return ns.singularity.getCompanyRep(requirement.company) >= requirement.reputation
        case "employedBy":
            return ns.singularity.getCompanyRep(requirement.company) > 0 || ns.singularity.getCompanyFavor(requirement.company) > 0
        case "file":
            return ns.fileExists(requirement.file)
        case "money":
            return ns.getPlayer().money >= requirement.money
        case "location":
            return requirement.location === ns.getPlayer().location
        case "numAugmentations":
            return data.augments.filter(aug => aug.installed).length >= requirement.numAugmentations
        case "skills":
            return has_skills(ns.getPlayer().skills, requirement.skills)
        case "sourceFile":
            return ns.singularity.getOwnedSourceFiles().some(sfl => sfl.n === requirement.sourceFile)
        case "numPeopleKilled":
            return ns.getPlayer().numPeopleKilled >= requirement.numPeopleKilled
        case "karma":
            return (ns.heart.break() / requirement.karma) >= 1
        case "hacknetCores":
            return count_hacknet_prop(ns, s => s.cores) >= requirement.hacknetCores
        case "hacknetLevels":
            return count_hacknet_prop(ns, s => s.level) >= requirement.hacknetLevels
        case "hacknetRAM":
            return count_hacknet_prop(ns, s => s.ram) >= requirement.hacknetRAM
        case "bitNodeN":
            return ns.getResetInfo().currentNode == requirement.bitNodeN
        case "bladeburnerRank":
            try {
                return ns.bladeburner.getRank() >= requirement.bladeburnerRank
            } catch (e) {
                return false
            }
        case "jobTitle":
            return Object.entries(ns.getPlayer().jobs).some(([company, job]) => job === requirement.jobTitle)
        case "numInfiltrations":
        default:
            return false
    }
}

function get_skill_short(skill: string) {
    switch (skill) {
        case "hacking": return "Hack"
        case "strength": return "Str"
        case "defense": return "Def"
        case "dexterity": return "Dex"
        case "agility": return "Agi"
        case "charisma": return "Cha"
        default: return skill
    }
}

function group_skill_req_description(reqs: PlayerRequirement[], any_or_all: "any" | "all"): { skills: string | undefined, remaining_reqs: PlayerRequirement[] } {
    const skill_reqs = reqs.filter(r => r.type === "skills")
    const result: { skills: string | undefined, remaining_reqs: PlayerRequirement[] }
        = { skills: undefined, remaining_reqs: reqs.filter(r => r.type !== "skills") }
    if (skill_reqs.length > 0) {
        const targets = skill_reqs.flatMap(r => Object.values(r.skills)).filter(f_unique)
        const target_desc = targets.map(t => {
            const skills_for_target = skill_reqs
                .flatMap(r => Object.entries(r.skills))
                .filter(([skill, value]) => value === t)
                .map(([skill, value]) => skill)
            if (skills_for_target.length === 6) return `${any_or_all === "any" ? "Ein Skill" : "Alle Skills"} >= ${t}`
            if (same_array(skills_for_target, ["strength", "defense", "dexterity", "agility"])) return `${any_or_all === "any" ? "Kampf-Skill" : "Kampf-Skills"} >= ${t}`
            const skills_desc = skills_for_target
                .map(skill => get_skill_short(skill))
                .join(any_or_all === "any" ? "|" : "+")
            return `${skills_desc} >= ${t}`
        })
        result.skills = target_desc.join(", ")
    }
    return result
}

export function faction_req_to_string(ns: NS, requirement: PlayerRequirement): string {
    switch (requirement.type) {
        case "everyCondition":
            {
                const joiner = ' UND '
                const skills_desc = group_skill_req_description(requirement.conditions, "all")
                const descs: string[] = []
                const part_count = (skills_desc.skills !== undefined ? 1 : 0) + skills_desc.remaining_reqs.length
                if (skills_desc.skills !== undefined) descs.push(skills_desc.skills)
                if (skills_desc.remaining_reqs.length > 0) descs.push(skills_desc.remaining_reqs.map(cond => faction_req_to_string(ns, cond)).join(joiner))
                return part_count > 1 ? `(${descs.join(joiner)})` : descs.join(joiner)
            }
        case "someCondition":
            {
                const joiner = ' ODER '
                const skills_desc = group_skill_req_description(requirement.conditions, "any")
                const descs: string[] = []
                const part_count = (skills_desc.skills !== undefined ? 1 : 0) + skills_desc.remaining_reqs.length
                if (skills_desc.skills !== undefined) descs.push(skills_desc.skills)
                if (skills_desc.remaining_reqs.length > 0) descs.push(skills_desc.remaining_reqs.map(cond => faction_req_to_string(ns, cond)).join(joiner))
                return part_count > 1 ? `(${descs.join(joiner)})` : descs.join(joiner)
            }
        case "not":
            return "NICHT " + faction_req_to_string(ns, requirement.condition)
        case "backdoorInstalled":
            return ns.sprintf("Backdoor auf '%s'", requirement.server)
        case "city":
            return ns.sprintf("Sei in %s", requirement.city)
        case "companyReputation":
            return ns.sprintf("%s Reputation bei %s", requirement.reputation, requirement.company)
        case "employedBy":
            return ns.sprintf("Angestellt bei %s", requirement.company)
        case "file":
            return ns.sprintf("Habe Datei %s", requirement.file)
        case "money":
            return ns.sprintf("Habe $%s", ns.formatNumber(requirement.money))
        case "location":
            return ns.sprintf("Sei bei %s", requirement.location)
        case "numAugmentations":
            return ns.sprintf("Habe %d Augments", requirement.numAugmentations)
        case "skills":
            return ns.sprintf("%s", Object.entries(requirement.skills).filter(([key, val]) => val !== undefined).map(([key, val], idx, ar) => `${ar.length > 1 && idx === 0 ? "(" : ""}${get_skill_short(key)} >= ${val}${ar.length > 1 && idx === ar.length - 1 ? ")" : ""}`).join(", "))
        case "sourceFile":
            return ns.sprintf("Habe SF %d", requirement.sourceFile)
        case "bitNodeN":
            return ns.sprintf("Sei in BN %d", requirement.bitNodeN)
        case "bladeburnerRank":
            return ns.sprintf("Bladeburner Rang %d", requirement.bladeburnerRank)
        case "hacknetCores":
            return ns.sprintf("%d Hacknet Cores", requirement.hacknetCores)
        case "hacknetLevels":
            return ns.sprintf("%d Hacknet Level", requirement.hacknetLevels)
        case "hacknetRAM":
            return ns.sprintf("%d Hacknet RAM", requirement.hacknetRAM)
        case "jobTitle":
            return ns.sprintf("Job Position %s", requirement.jobTitle)
        case "karma":
            return ns.sprintf("%s Karma", ns.formatNumber(requirement.karma))
        case "numInfiltrations":
            return ns.sprintf("%d Infiltrationen", requirement.numInfiltrations)
        case "numPeopleKilled":
            return ns.sprintf("%d Tote", requirement.numPeopleKilled)
        default:
            return ns.sprintf("Unbekannter Typ")
    }
}

export function get_faction_requirements_info(ns: NS, data: RequirementData, requirements: PlayerRequirement[]): string {
    const missing_reqs = requirements.filter(req => !player_meets_faction_req(ns, data, req))
    return missing_reqs.map(req => faction_req_to_string(ns, req)).join(", ")
}

export function get_faction_req_difficulty(ns: NS, data: RequirementData, requirement: PlayerRequirement): number {
    function clamp_rel_0_10(value: number, min: number, max: number): number { return Math.pow(Math.E, (value - min) / max * 10) }
    function get_relative_difficulty(current_value: number, target_value: number, min: number, max: number) {
        if (target_value <= current_value) return 0
        return clamp_rel_0_10(target_value, min, max) - clamp_rel_0_10(current_value, min, max)
    }
    function backdoor_difficulty(host: string): number {
        const target = data.servers.find(s => s.host === host)
        if (target === undefined) return MAX_DIFFICULTY
        if (target.backdoor!) return 0
        return get_relative_difficulty(ns.getPlayer().skills.hacking, target.hack_needed!, 0, 10000)
    }

    switch (requirement.type) {
        case "everyCondition":
            // return sum
            return requirement.conditions.map(cond => get_faction_req_difficulty(ns, data, cond)).reduce((sum, diff) => sum + diff, 0)
        case "someCondition":
            // return min
            return requirement.conditions.map(cond => get_faction_req_difficulty(ns, data, cond)).reduce((sum, diff) => sum > diff ? diff : sum, MAX_DIFFICULTY)
        case "not":
            return get_faction_req_difficulty(ns, data, requirement.condition) > 0 ? 0 : MAX_DIFFICULTY
        case "backdoorInstalled":
            return backdoor_difficulty(requirement.server)
        case "city":
            return ns.getPlayer().city === requirement.city ? 0 : .05
        case "companyReputation":
            const cur_rep = ns.singularity.getCompanyRep(requirement.company)
            return get_relative_difficulty(cur_rep, requirement.reputation, 0, 100_000)
        case "employedBy":
            return (ns.getPlayer().jobs[requirement.company] !== undefined) ? 0 : .05
        case "file":
            return ns.fileExists(requirement.file) ? 0 : 10
        case "money":
            let relative_max = 1
            while (relative_max * 100 < ns.getPlayer().money) relative_max *= 10
            return get_relative_difficulty(ns.getPlayer().money, requirement.money, 0, relative_max)
        case "location":
            return ns.getPlayer().location === requirement.location ? 0 : .05
        case "numAugmentations":
            return data.augments.filter(aug => aug.installed).length >= requirement.numAugmentations ? 0 : MAX_DIFFICULTY
        case "skills":
            let diff = 0
            let skills_diff = get_skills_diff(ns.getPlayer().skills, requirement.skills)
            diff += get_relative_difficulty(0, skills_diff.agility, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.charisma, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.defense, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.dexterity, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.hacking, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.intelligence, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.strength, 0, 100)
            return diff
        case "sourceFile":
            return ns.singularity.getOwnedSourceFiles().some(sfl => sfl.n === requirement.sourceFile) ? 0 : MAX_DIFFICULTY
        case "numPeopleKilled":
            return ns.getPlayer().numPeopleKilled >= requirement.numPeopleKilled ? 0 : (requirement.numPeopleKilled - ns.getPlayer().numPeopleKilled) * 0.05
        case "karma":
            return (ns.heart.break() / requirement.karma) >= 1 ? 0 : Math.log10(Math.abs(requirement.karma - ns.heart.break()))
        case "hacknetCores":
            const core_count = count_hacknet_prop(ns, s => s.cores)
            return core_count >= requirement.hacknetCores ? 0 : (requirement.hacknetCores - core_count) * 0.2
        case "hacknetLevels":
            const level_count = count_hacknet_prop(ns, s => s.level)
            return level_count >= requirement.hacknetLevels ? 0 : (requirement.hacknetLevels - level_count) * 0.001
        case "hacknetRAM":
            const ram_total = count_hacknet_prop(ns, s => s.ram)
            return ram_total >= requirement.hacknetRAM ? 0 : Math.log2(requirement.hacknetRAM - ram_total) * 0.1
        case "bitNodeN":
            return ns.getResetInfo().currentNode == requirement.bitNodeN ? 0 : MAX_DIFFICULTY
        case "bladeburnerRank":
            try {
                return Math.max(0, requirement.bladeburnerRank - ns.bladeburner.getRank())
            } catch (e) {
                return MAX_DIFFICULTY
            }
        case "jobTitle":
            return Object.entries(ns.getPlayer().jobs).some(([company, job]) => job === requirement.jobTitle) ? 0 : 5
        case "numInfiltrations":

        default:
            return 10
    }
}

export function get_faction_difficulty(ns: NS, data: RequirementData, faction: MyFaction): number {
    // Faction is already available
    if (faction.is_available) return 0
    // Player already joined an enemy faction
    if (faction.enemies.some(enemy => data.factions.find(f => f.name === enemy)!.joined_them)) return MAX_DIFFICULTY
    // Calculate difficulty by determining the maximum difficulty of all individual requirements.
    return faction.invite_requirements.map(r => get_faction_req_difficulty(ns, data, r)).reduce(reduce_to_max, 0)
}

export class MyFaction {
    name: FactionName
    invite_requirements: PlayerRequirement[]
    enemies: string[]
    favor: number
    reputation: number
    work_types: FactionWorkType[]
    is_available: boolean
    joined_them: boolean
    augments: string[]

    constructor(name: FactionName) {
        this.name = name
        this.invite_requirements = []
        this.enemies = []
        this.favor = 0
        this.reputation = 0
        this.work_types = []
        this.is_available = false
        this.joined_them = false
        this.augments = []
    }

    set_requirements(reqs: PlayerRequirement[]): MyFaction {
        this.invite_requirements = reqs
        return this
    }

    set_enemies(val: string[]): MyFaction {
        this.enemies = val
        return this
    }

    set_favor(val: number): MyFaction {
        this.favor = val
        return this
    }

    set_reputation(val: number): MyFaction {
        this.reputation = val
        return this
    }

    set_work_types(val: FactionWorkType[]): MyFaction {
        this.work_types = val
        return this
    }

    set_status(joined_them: boolean, is_available: boolean): MyFaction {
        this.is_available = is_available || joined_them // joined factions are also available
        this.joined_them = joined_them
        return this
    }

    set_status_by_lists(invites: string[], joined: string[]): MyFaction {
        this.set_status(joined.includes(this.name), invites.includes(this.name))
        return this
    }

    set_augments(val: string[]): MyFaction {
        this.augments = val
        return this
    }

    /**
     * @param {any} Object parsed from JSON
     * @return {MyFaction} The parsed faction.
     */
    static fromJSON(obj: any): MyFaction {
        const s = new MyFaction(obj.name!)
        s.set_requirements(obj.invite_requirements)
        s.set_enemies(obj.enemies)
        s.set_favor(obj.favor)
        s.set_reputation(obj.reputation)
        s.set_work_types(obj.work_types)
        s.set_status(obj.joined_them, obj.is_available)
        s.set_augments(obj.augments)
        return s
    }
}

/**
 * Writes all factions to file.
 * @param {NS} ns
 * @param {MyFaction[]} factions
 */
export function write_faction_file(ns: NS, factions: MyFaction[]) {
    const faction_data = JSON.stringify(factions)
    ns.write(FACTION_FILE, faction_data, "w")
}

/**
 * Reads all factions from file.
 * @param {NS} ns
 * @return {MyFaction[]} Loaded factions.
 */
export function read_faction_file(ns: NS): MyFaction[] {
    const faction_data = ns.read(FACTION_FILE)
    const factions = JSON.parse(faction_data).map((o: any) => MyFaction.fromJSON(o))
    return factions
}
