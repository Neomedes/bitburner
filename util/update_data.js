import { MyServer, read_server_file } from "lib/servers.js"
import { exec_script } from "lib/functions.js"

/**
 * @param {NS} ns
 * @return {Promise<MyServer[]>} All servers available.
 */
export async function get_updated_server_list(ns) {
  await exec_script(ns, "util/servers_find.js", "home")
  await exec_script(ns, "util/servers_analyze.js", "home")
  return read_server_file(ns)
}

/**
 * @param {NS} ns
 * @param {boolean} complete_update
 * @return {Promise<MyAugment[]>}
 */
export async function get_updated_augment_list(ns, complete_update = false) {
  if (complete_update) {
    await exec_script(ns, "util/sing_augs_list.js", "home")
    await exec_script(ns, "util/sing_augs_fetch_stats.js", "home")
    await exec_script(ns, "util/sing_augs_fetch_price.js", "home")
    await exec_script(ns, "util/sing_augs_fetch_req_rep.js", "home")
    await exec_script(ns, "util/sing_augs_fetch_req_augs.js", "home")
  }
  await exec_script(ns, "util/sing_augs_owned_upd.js", "home")
  return read_augments_file(ns)
}
