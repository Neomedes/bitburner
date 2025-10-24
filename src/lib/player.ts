import { CityName, CompanyName, JobName, LocationName, MoneySource, MoneySources, NS, Skills, SourceFileLvl } from '@ns'

const PLAYER_FILE = "/data/player_data.txt"

export function has_skills(player_skills: Skills, required_skills: Partial<Skills>): boolean {
    function has_skill(value: number, req: number | undefined) {
        return req === undefined || req <= value
    }
    return has_skill(player_skills.agility, required_skills.agility)
        && has_skill(player_skills.charisma, required_skills.charisma)
        && has_skill(player_skills.defense, required_skills.defense)
        && has_skill(player_skills.dexterity, required_skills.dexterity)
        && has_skill(player_skills.hacking, required_skills.hacking)
        && has_skill(player_skills.intelligence, required_skills.intelligence)
        && has_skill(player_skills.strength, required_skills.strength)
}

export function get_skills_diff(player_skills: Skills, required_skills: Partial<Skills>): Skills {
    const diff: Skills = {
        agility: (required_skills.agility ?? 0) - player_skills.agility,
        charisma: (required_skills.charisma ?? 0) - player_skills.charisma,
        defense: (required_skills.defense ?? 0) - player_skills.defense,
        dexterity: (required_skills.dexterity ?? 0) - player_skills.dexterity,
        hacking: (required_skills.hacking ?? 0) - player_skills.hacking,
        intelligence: (required_skills.intelligence ?? 0) - player_skills.intelligence,
        strength: (required_skills.strength ?? 0) - player_skills.strength,
    }
    return diff
}

export class MyPlayer {
    skills: Skills
    city: CityName
    location: LocationName
    money: number
    bitnode: number
    jobs: Partial<Record<CompanyName, JobName>>
    source_files: SourceFileLvl[]
    money_sources: MoneySources

    constructor(city: CityName, location: LocationName) {
        this.skills = { agility: 0, charisma: 0, defense: 0, dexterity: 0, hacking: 0, intelligence: 0, strength: 0 }
        this.city = city
        this.location = location
        this.money = 0
        this.bitnode = 0
        this.source_files = []
        this.jobs = {}
        const empty_money_source: MoneySource = { augmentations: 0, bladeburner: 0, casino: 0, class: 0, codingcontract: 0, corporation: 0, crime: 0, gang: 0, gang_expenses: 0, hacking: 0, hacknet: 0, hacknet_expenses: 0, hospitalization: 0, infiltration: 0, other: 0, servers: 0, sleeves: 0, stock: 0, total: 0, work: 0, }
        this.money_sources = { sinceInstall: { ...empty_money_source }, sinceStart: { ...empty_money_source } }
    }

    set_skills(val: Skills): MyPlayer {
        this.skills = val
        return this
    }

    set_city(val: CityName): MyPlayer {
        this.city = val
        return this
    }

    set_location(val: LocationName): MyPlayer {
        this.location = val
        return this
    }

    set_money(val: number): MyPlayer {
        this.money = val
        return this
    }

    set_bitnode(val: number): MyPlayer {
        this.bitnode = val
        return this
    }

    set_jobs(val: Partial<Record<CompanyName, JobName>>): MyPlayer {
        this.jobs = val
        return this
    }

    set_source_files(val: SourceFileLvl[]): MyPlayer {
        this.source_files = val
        return this
    }

    set_money_sources(val: MoneySources): MyPlayer {
        this.money_sources = val
        return this
    }

    /**
     * @param {any} Object parsed from JSON
     * @return {MyPlayer} The parsed player.
     */
    static fromJSON(obj: any): MyPlayer {
        const s = new MyPlayer(obj.city, obj.location)
        s.set_skills(obj.skills)
        s.set_money(obj.money)
        s.set_bitnode(obj.bitnode)
        s.set_jobs(obj.jobs)
        s.set_source_files(obj.source_files)
        s.set_money_sources(obj.money_sources)
        return s
    }
}

/**
 * Writes all player to file.
 * @param {NS} ns
 * @param {MyPlayer} player
 */
export function write_player_file(ns: NS, player: MyPlayer) {
    const player_data = JSON.stringify(player)
    ns.write(PLAYER_FILE, player_data, "w")
}

/**
 * Reads all player from file.
 * @param {NS} ns
 * @return {MyPlayer} Loaded player.
 */
export function read_player_file(ns: NS): MyPlayer {
    const player_data = ns.read(PLAYER_FILE)
    const player = MyPlayer.fromJSON(JSON.parse(player_data))
    return player
}
