import { MyServer, read_server_file } from "lib/servers"
import { MyAugment, read_augments_file } from "lib/sing_augs"
import { exec_script } from "lib/functions"
import { MyJob, read_jobs_file } from "/lib/sing_jobs"

export async function update_server_list(ns: NS) {
  await exec_script(ns, "ds/servers_find.js", "home")
  await exec_script(ns, "ds/servers_analyze.js", "home")
}

export async function get_updated_server_list(ns: NS): Promise<MyServer[]> {
  await update_server_list(ns)
  return read_server_file(ns)
}

export async function get_updated_augment_list(ns: NS, complete_update: boolean = false): Promise<MyAugment[]> {
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

export async function get_updated_job_list(ns: NS): Promise<MyJob[]> {
  await exec_script(ns, "ds/sing_jobs_list.js", "home")
  return read_jobs_file(ns)
}
