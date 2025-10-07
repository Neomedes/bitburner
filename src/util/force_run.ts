import { NS, RunOptions, ScriptArg } from '@ns'
import { error_t } from '/lib/log'
import { assert_not_undefined, run_opts_as_call_param, script_args_as_string } from '/lib/functions'

export async function main(ns: NS): Promise<void> {
    const OPTS = ns.flags([
        ["max_tries", 24], // how many attempts should be made to run the given script?
        ["wait", 5], // how many seconds should be waited between attempts to run the script?
        ["run_opts", ""], // Stringified JSON: Which run opts (threads, etc.) should be set?
    ]);

    if (((OPTS["_"] as ScriptArg[]).length ?? 0) < 1) error_t(ns, "%s: Kein Skript angegeben!", ns.getScriptName())

    const script = (OPTS["_"] as ScriptArg[]).shift()! as string
    const run_opts = JSON.parse(OPTS.run_opts as string) as RunOptions
    const run_args = (OPTS["_"] as ScriptArg[])

    // run script
    let pid = ns.run(script, run_opts, ...run_args)

    let tries_left = (OPTS.max_tries as number)
    const wait_ms = (OPTS.wait as number) * 1000
    while (pid === 0 && tries_left > 0) {
        await ns.sleep(wait_ms)
        pid = ns.run(script, run_opts, ...run_args)
        tries_left--
    }

    if (pid === 0) {
        error_t(ns, "%s: Konnte Skript mit folgndem Aufruf nicht starten:", ns.getScriptName())
        error_t(ns, "run %s%s%s", script, run_opts_as_call_param(run_opts), script_args_as_string(run_args))
    }
}