import { read_augments_file, write_augments_file } from "lib/sing_augs"

// Update list of owned augmentations.

export async function main(ns: NS) {
  const augments = read_augments_file(ns)
  const owned = ns.singularity.getOwnedAugmentations(true)
  augments.forEach(a => a.update_owned(owned))
  write_augments_file(ns, augments)
}