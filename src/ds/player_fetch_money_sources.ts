import { MyPlayer, read_player_file, write_player_file } from "lib/player"

/** @param {NS} ns */
export async function main(ns: NS) {
  const player = read_player_file(ns)
  player.set_money_sources(ns.getMoneySources())
  write_player_file(ns, player)
}