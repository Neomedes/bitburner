import { MyPlayer, write_player_file } from "lib/player"

/** @param {NS} ns */
export async function main(ns: NS) {
  const player = ns.getPlayer()
  const my_player = new MyPlayer(player.city, player.location)
  my_player.set_jobs(player.jobs)
  my_player.set_money(player.money)
  my_player.set_skills(player.skills)
  write_player_file(ns, my_player)
}