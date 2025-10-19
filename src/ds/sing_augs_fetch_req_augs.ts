import { read_augments_file, write_augments_file } from "lib/sing_augs"

// Update list of owned augmentations.

/** @param {NS} ns */
export async function main(ns: NS) {
  const augments = read_augments_file(ns)
  augments.forEach(a => a.set_req_augments(ns.singularity.getAugmentationPrereq(a.name)))
  augments.forEach(a => a.fill_indirect_required_augments(augments))
  write_augments_file(ns, augments)
}