import { read_augments_file, write_augments_file } from "lib/sing_augs"

// Update list of owned augmentations.

/** @param {NS} ns */
export async function main(ns: NS) {
  const augments = read_augments_file(ns)
  augments.forEach(a => a.set_price(ns.singularity.getAugmentationPrice(a.name)))
  write_augments_file(ns, augments)
}