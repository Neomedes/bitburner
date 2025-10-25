import { MyServer, read_server_file } from "lib/servers"
import { MyAugment, read_augments_file } from "lib/sing_augs"
import { exec_script, disableLogs } from "lib/functions"
import { MyJob, read_jobs_file } from "/lib/sing_jobs"
import { MyFaction, read_faction_file } from "/lib/factions"
import { MyPlayer, read_player_file } from "/lib/player"
import { MyPurchasedServer, read_pserv_file } from "/lib/pserv"

export async function update_server_list(ns: NS) {
  disableLogs(ns, "exec")
  await exec_script(ns, "ds/servers_find.js", "home")
  await exec_script(ns, "ds/servers_analyze.js", "home")
}

export async function get_updated_server_list(ns: NS): Promise<MyServer[]> {
  disableLogs(ns, "exec")
  await update_server_list(ns)
  return read_server_file(ns)
}

export async function get_updated_augment_list(ns: NS, complete_update: boolean = false): Promise<MyAugment[]> {
  disableLogs(ns, "exec")
  if (complete_update) {
    await exec_script(ns, "ds/sing_augs_list.js", "home")
    await exec_script(ns, "ds/sing_augs_fetch_stats.js", "home")
    await exec_script(ns, "ds/sing_augs_fetch_price.js", "home")
    await exec_script(ns, "ds/sing_augs_fetch_req_rep.js", "home")
    await exec_script(ns, "ds/sing_augs_fetch_req_augs.js", "home")
  }
  await exec_script(ns, "ds/sing_augs_owned_upd.js", "home")
  return read_augments_file(ns)
}

export async function player_must_focus(ns: NS) {
  const augments = await get_updated_augment_list(ns, true)
  const focus_augment = augments.find(a => a.name === MyAugment.unique_aug_no_focus().name)
  const must_focus = !(focus_augment?.owned ?? false)
  return must_focus
}

export async function get_updated_job_list(ns: NS): Promise<MyJob[]> {
  disableLogs(ns, "exec")
  await exec_script(ns, "ds/sing_jobs_list.js", "home")
  return read_jobs_file(ns)
}

export async function get_updated_faction_list(ns: NS, complete_update: boolean = false): Promise<MyFaction[]> {
  disableLogs(ns, "exec")
  if (complete_update) {
    await exec_script(ns, "ds/factions_list.js", "home")
    await exec_script(ns, "ds/factions_fetch_enemies.js", "home")
    await exec_script(ns, "ds/factions_fetch_favor.js", "home")
    await exec_script(ns, "ds/factions_fetch_augments.js", "home")
    await exec_script(ns, "ds/factions_fetch_work_types.js", "home")
  }
  await exec_script(ns, "ds/factions_fetch_reputation.js", "home")
  await exec_script(ns, "ds/factions_fetch_status.js", "home")
  return read_faction_file(ns)
}

export async function get_updated_player(ns: NS): Promise<MyPlayer> {
  disableLogs(ns, "exec")
  await exec_script(ns, "ds/player_init.js", "home")
  await exec_script(ns, "ds/player_fetch_money_sources.js", "home")
  await exec_script(ns, "ds/player_fetch_source_files.js", "home")
  return read_player_file(ns)
}

export async function get_updated_pserv_list(ns: NS): Promise<MyPurchasedServer[]> {
  disableLogs(ns, "exec")
  await exec_script(ns, "ds/pserv_init.js", "home")
  return read_pserv_file(ns)
}
