import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const command = ns.args.shift() as string
    eval(command)
}