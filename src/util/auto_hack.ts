import { NS } from '@ns'
import { get_updated_player } from '/util/update_data'

export async function main(ns : NS) : Promise<void> {
    let player = await get_updated_player(ns)

    // wait until hacking >= 50
    // hack best available server
    // if own RAM >= 
}