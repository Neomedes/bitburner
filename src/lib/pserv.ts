import { NS } from '@ns'
import { is_empty_str } from '/lib/functions'

const PSERV_FILE = "/data/pserv_data.txt"

export class RamLevel {
    lv: number
    ram: number
    cost: number

    static MAX_LV = 20 // default
    /** @type {RamLevel[]} */
    static ALL: RamLevel[] = [] // already defined levels

    /**
     * @param {number} lv The level
     */
    constructor(lv: number) {
        this.lv = lv
        this.ram = 2 ** lv
        this.cost = -1
    }

    greater_than(other: RamLevel): boolean {
        return other == null || (this.lv > other.lv)
    }

    /**
     * @return {boolean} Is this the max level
     */
    is_max(): boolean {
        return this.lv >= RamLevel.MAX_LV
    }

    /**
     * @return {RamLevel} The next level
     */
    next_level(): RamLevel {
        if (this.is_max()) {
            throw new Error("Level kann nicht übers Maximum hinaus erhöht werden.")
        }
        return RamLevel.get_level(this.lv + 1)
    }

    set_cost(value: number): RamLevel {
        this.cost = value
        return this
    }

    toString(): string {
        return "Lv" + String(this.lv).padStart(2, "0")
    }

    /**
     * @param {number} lv The desired level.
     * @return {RamLevel}
     */
    static get_level(lv: number): RamLevel {
        const defined = RamLevel.ALL.find(level => level.lv === lv)
        if (defined !== undefined) {
            return defined
        }
        const new_level = new RamLevel(lv)
        RamLevel.ALL.push(new_level)
        return new_level
    }

    static by_level(lv: number): RamLevel {
        return RamLevel.get_level(lv)
    }

    static by_ram(ram: number): RamLevel {
        return RamLevel.get_level(RamLevel.ram2lv(ram))
    }

    /**
     * Calculates the server level by its RAM.
     * @param {number} ram The RAM to calculate the level for.
     * @return {number} The corresponding server level.
     */
    static ram2lv(ram: number): number {
        let lv = 1
        while (2 ** lv < ram) {
            lv++
        }
        return lv
    }

    /**
     * Gets the maximum server level
     * @param {NS} ns Netscript API
     * @return {number} The maximum server level.
     */
    static get_max_lv(ns: NS): number {
        RamLevel.MAX_LV = RamLevel.ram2lv(ns.getPurchasedServerMaxRam())
        return RamLevel.MAX_LV
    }

    static BASE_LEVEL(): RamLevel {
        return RamLevel.get_level(1)
    }

    static fromJSON(obj: any): RamLevel {
        const level = RamLevel.get_level(obj.lv)
        level.set_cost(obj.cost)
        return level
    }

}

export class MyPurchasedServer {
    host: string
    current_level: RamLevel
    /**
     * @param {string} host
     * @param {RamLevel} current_level
     */
    constructor(host: string, current_level: RamLevel) {
        this.host = host
        this.current_level = current_level
    }

    get_cost(target_level: RamLevel) {
        if (!target_level.greater_than(this.current_level)) {
            //ns.tprintf("get_cost(%s): %s <= %s so cost is 0", this.host, level.toString(), this.current_level.toString())
            return 0
        }
        const cost = target_level.cost - this.current_level.cost
        //ns.tprintf("get_cost(%s): from %s to %s = %s", this.host, this.current_level.toString(), level.toString(), ns.formatNumber(cost))
        return cost
    }

    compare_to(other: MyPurchasedServer): number {
        return MyPurchasedServer.compare(this, other)
    }

    /**
     * Tries to upgrade the server to a given level.
     * @param ns Netscript API.
     * @param to_level RamLevel to upgrade to.
     * @returns Whether upgrading was successful or not.
     */
    upgrade(ns: NS, to_level: RamLevel): boolean {
        ns.tprintf("Upgrade %s to %s RAM", this.host, ns.formatRam(to_level.ram))
        if (ns.upgradePurchasedServer(this.host, to_level.ram)) {
            this.current_level = to_level
            return true
        }
        return false
    }

    /**
     * Registers a server.
     * @param ns Netscript API.
     * @param host Hostname of new server.
     * @returns An instance representing the server.
     */
    static register(ns: NS, host: string): MyPurchasedServer {
        const server = ns.getServer(host)
        const current_level = RamLevel.by_ram(server.maxRam)
        return new MyPurchasedServer(host, current_level)
    }

    /**
     * Registers a server.
     * @param ns Netscript API.
     * @param host Hostname of new server.
     * @returns An instance representing the server.
     */
    static build(ns: NS, host: string, lv: number): MyPurchasedServer | undefined {
        const current_level = RamLevel.by_level(lv)
        const hostname = ns.purchaseServer(host, current_level.ram)
        return is_empty_str(hostname) ? undefined : new MyPurchasedServer(hostname, current_level)
    }

    /**
     * Compares two owned servers.
     * @param {MyPurchasedServer} a
     * @param {MyPurchasedServer} b
     * @param {{order_by: ("lv"|"host")[], ascending: {"lv": boolean, "host": boolean}}} options
     */
    static compare(a: MyPurchasedServer, b: MyPurchasedServer, options = { order_by: ["lv", "host"], ascending: { "lv": true, "host": true } }): number {
        if (a === b) {
            return 0
        }
        if (a == null) {
            return -1
        }
        if (b == null) {
            return 1
        }
        for (let i = 0; i < options.order_by.length; i++) {
            const order_field = options.order_by[i]
            let order_value: number = 0
            let sorting: boolean = true
            switch (order_field) {
                case "lv":
                    order_value = a.current_level.lv - b.current_level.lv
                    sorting = options.ascending.lv
                    break;
                case "host":
                    order_value = a.host.localeCompare(b.host)
                    sorting = options.ascending.host
                    break;
            }
            if (sorting === false) {
                order_value *= -1
            }
            if (order_value !== 0) {
                return order_value
            }
        }
        return 0
    }


    static fromJSON(obj: any): MyPurchasedServer {
        const current_level = RamLevel.fromJSON(obj.current_level)
        const psrv = new MyPurchasedServer(obj.host, current_level)
        return psrv
    }
}

/**
 * Writes all purchased servers to file.
 */
export function write_pserv_file(ns: NS, p_servers: MyPurchasedServer[]) {
    const combined = { pserv: p_servers, levels: RamLevel.ALL }
    const pserv_data = JSON.stringify(combined)
    ns.write(PSERV_FILE, pserv_data, "w")
}

/**
 * Reads all purchased servers from file.
 * @return Loaded purchased servers.
 */
export function read_pserv_file(ns: NS): MyPurchasedServer[] {
    const pserv_data = ns.read(PSERV_FILE)
    const combined = JSON.parse(pserv_data)
    if (combined?.levels) combined.levels.forEach((lo: any) => RamLevel.fromJSON(lo))
    const p_servers = combined?.pserv?.map?.((o: any) => MyPurchasedServer.fromJSON(o)) || []
    return p_servers
}
