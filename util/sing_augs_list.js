import { MyAugment, write_augments_file } from "lib/sing_augs.js"

/** @param {NS} ns */
export async function main(ns) {
  // collect all augmentations of these factions
  /** @type {MyAugment[]} */
  const augments = []
  for (const faction of Object.values(ns.enums.FactionName)) {
    const faction_augments = ns.singularity.getAugmentationsFromFaction(faction)
    for (const augment of faction_augments) {
      const present_aug = augments.find(a => a.name === augment)
      if (present_aug) {
        present_aug.add_faction(faction)
      } else {
        augments.push(new MyAugment(augment, faction))
      }
    }
  }

  write_augments_file(ns, augments)
}