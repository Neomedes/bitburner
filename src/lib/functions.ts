import { RunOptions, ScriptArg } from "@ns"

/**
 * @param {boolean} expr Expression to test
 * @param {string} msg Error message to throw when the assertion fails.
 */
export function assert(expr: boolean, msg: string = "Assertion failed!") {
  if (expr === false) {
    throw new Error(msg)
  }
}

/**
 * @param {any} valueA Expression to test
 * @param {any} valueB Error message to throw when the assertion fails.
 */
export function assertEqual<T>(actualValue: T, desiredValue: T) {
  assert(
    actualValue === desiredValue || JSON.stringify(actualValue) === JSON.stringify(desiredValue),
    `Assertion failed: ${JSON.stringify(actualValue)} is not ${JSON.stringify(desiredValue)}`
  )
}

export function assert_not_undefined<T>(value: T | undefined, msg?: string): asserts value is T {
  assert(value !== undefined, msg ?? "Assertion failed: Variable is undefined!")
}

/**
 * @param {NS} ns
 * @param {string[]} fns
 */
export function disableLogs(ns: NS, ...fns: string[]) {
  ns.disableLog("disableLog")
  for (let fn of fns) {
    ns.disableLog(fn)
  }
}

export function formatTime(ms: number): string {
  function val(labelSingle: string, labelMultiple: string, factor: number, mod: number = 0) {
    let value = Math.floor(ms / factor)
    if (mod > 1) {
      value = value % mod
    }
    if (value === 0) {
      return ""
    }
    return `${value} ${value === 1 ? labelSingle : labelMultiple}`
  }
  if (ms < 0) ms = -ms;
  const time = {
    day: val("Tag", "Tage", 86400000),
    hour: val("Stunde", "Stunden", 3600000, 24),
    minute: val("Minute", "Minuten", 60000, 60),
    second: val("Sekunde", "Sekunden", 1000, 60),
    millisecond: val("Millisekunde", "Millisekunden", 1, 1000)
  };
  return Object.entries(time)
    .map(([key, val]) => val)
    .filter(val => val !== "")
    .join(', ');
}

/**
 * Calculates how much RAM should be left free.
 * @param {number} available_ram How much RAM is available on the server.
 * @param {number} parameter_man_keep How much RAM is available on the server.
 * @param {boolean} parameter_auto_keep Should the amount be automatically calculated in case of a missing manual keep.
 * @return {number} Amount of RAM to be left free.
 */
export function keep_ram(available_ram: number, parameter_man_keep: number = -1, parameter_auto_keep: boolean = true): number {
  let keepRam = 0
  if (parameter_man_keep >= 0) {
    keepRam = Math.min(parameter_man_keep, available_ram)
  } else if (parameter_auto_keep) {
    if (available_ram > 256) {
      keepRam = 64
    } else {
      keepRam = available_ram / 8
    }
  }
  return keepRam
}

/**
 * Waits until a process is finished.
 * @param {NS} ns NetScript API.
 * @param {number[]} wait_for_pids PIDs to wait for.
 * @param {number} sleep_time How long to sleep between test, if the process ist still running.
 * @param {number} max_wait How long to wait at most. 0 (default) or less means no max wait.
 */
export async function all_finished(ns: NS, wait_for_pids: number[], { sleep_time = 200, max_wait = 0 } = {}) {
  disableLogs(ns, "sleep")
  let remaining_pids = [...wait_for_pids.filter(p => p)]
  let waited = 0
  while (remaining_pids.length > 0) {
    if (max_wait > 0 && waited >= max_wait) {
      ns.tprintf("Abbruch Warten auf PIDs %s nach %d ms", remaining_pids.map(pid => pid.toString()).join(", "), waited)
      break
    }

    await ns.sleep(sleep_time)
    remaining_pids = remaining_pids.filter(p => ns.isRunning(p))
    waited += sleep_time
  }
}

/**
 * Waits until a process is finished.
 * @param {NS} ns NetScript API.
 * @param {number} wait_for_pid PID to wait for.
 * @param {number} sleep_time How long to sleep between test, if the process ist still running.
 * @param {number} max_wait How long to wait at most. 0 (default) or less means no max wait.
 */
export async function finished(ns: NS, wait_for_pid: number, { sleep_time = 200, max_wait = 0 } = {}) {
  await all_finished(ns, [wait_for_pid], { sleep_time, max_wait })
}

export function check_valid_pid(proc_id: number, process_description: string | undefined = undefined, run_on_error: (() => void) | undefined = undefined) {
  if (proc_id === 0) {
    if (run_on_error != null) {
      run_on_error()
    }
    throw new Error(process_description !== undefined ? `Konnte Prozess "${process_description}" nicht starten.` : "Konnte Prozess nicht starten.")
  }
}

/**
 * Returns ThreadsOrRunOptions as a string for calling
 * @param {number|RunOptions|undefined} run_opts Either an integer number of threads for new script, or a  {@link  RunOptions }  object. Threads defaults to 1.
 */
export function run_opts_as_call_param(run_opts?: number | RunOptions | undefined): string {
  if (run_opts === undefined) return ""
  if (typeof run_opts === "number") {
    return run_opts > 1 ? ` -t ${run_opts}` : ""
  }
  if (typeof run_opts.threads === "number") {
    return run_opts.threads > 1 ? ` -t ${run_opts.threads}` : ""
  }
  return ""
}

export function script_args_as_string(script_args: ScriptArg[]) {
  if (script_args.length < 1) return ""
  return ` ${script_args.join(" ")}`
}

/**
 * Starts a new process on the current machine and waits until the process is finished.
 * @param {NS} ns NetScript API.
 * @param {string} script Filename of script to run.
 * @param {number|RunOptions|undefined} threadOrOptions Either an integer number of threads for new script, or a {@link  RunOptions}  object. Threads defaults to 1. 
 * @param {ScriptArg[]} script_args Additional arguments to pass into the new script that is being run. Note that if any arguments are being passed into the new script, then the second argument threadOrOptions must be filled in with a value.  
 */
export async function run_script(ns: NS, script: string, threadOrOptions?: number | RunOptions | undefined, ...script_args: ScriptArg[]) {
  const proc_id = ns.run(script, threadOrOptions, ...script_args)
  check_valid_pid(proc_id, `run ${script}${run_opts_as_call_param(threadOrOptions)}${script_args_as_string(script_args)}`)
  await finished(ns, proc_id)
}

/**
 * Starts a new process on the current machine and waits until the process is finished.
 * @param {NS} ns NetScript API.
 * @param {string} script Filename of script to execute. This file must already exist on the target server.
 * @param {string} hostname Hostname of the `target server` on which to execute the script.
 * @param {number|RunOptions|undefined} threadOrOptions Either an integer number of threads for new script, or a  {@link  RunOptions }  object. Threads defaults to 1.
 * @param {ScriptArg[]} script_args Additional arguments to pass into the new script that is being run. Note that if any arguments are being passed into the new script, then the third argument threadOrOptions must be filled in with a value.
 */
export async function exec_script(ns: NS, script: string, hostname: string, threadOrOptions: number | RunOptions | undefined = undefined, ...script_args: ScriptArg[]) {
  const proc_id = ns.exec(script, hostname, threadOrOptions, ...script_args)
  check_valid_pid(proc_id, `exec ${script} ${hostname}${run_opts_as_call_param(threadOrOptions)}${script_args_as_string(script_args)}`)
  await finished(ns, proc_id)
}

/**
 * Filters only unique values as of Array.indexOf for use in Array.filter
 * @param {any} val
 * @param {number} idx
 * @param {any[]} arr
 * @return {boolean}
 */
export function f_unique<T>(val: T, idx: number, arr: T[]): boolean {
  return arr.indexOf(val) === idx
}

export function is_empty_str(str: string): boolean {
  return (!str || str === "")
}

export function share_entries<T>(ar1: T[], ar2: T[]) {
  return ar1.some(e1 => ar2.includes(e1))
}

export function intersect<T>(ar1: T[], ar2: T[]) {
  return ar1.filter(e1 => ar2.includes(e1))
}

export function union<T>(ar1: T[], ar2: T[]) {
  return [...ar1, ...ar2].filter(f_unique)
}

export function minus<T>(minuend: T[], subtrahend: T[]): T[] {
  return minuend.filter(e1 => !subtrahend.includes(e1))
}

export function same_array<T>(a1: T[], a2: T[]): boolean {
  return a1.length === a2.length && a1.every(e1 => a2.includes(e1))
}

export function reduce_to_min(min: number, val: number): number {
  return (min > val) ? val : min
}

export function reduce_to_max(max: number, val: number): number {
  return (max < val) ? val : max
}

export function reduce_to_sum(sum: number, val: number): number {
  return sum + val
}

export function reduce_to_product(sum: number, val: number): number {
  return sum * val
}

export function add_bit(bits: string): string {
  let result = bits.split("")
  for (let pos = result.length - 1; pos >= 0; pos--) {
    if (result[pos] === "0") {
      return result.with(pos, "1").join("")
    } else {
      result = result.with(pos, "0")
    }
  }
  result.unshift("1")
  return result.join("")
}

export function count_bits(bits: string): number {
  return bits.split("").filter(b => b === "1").length
}

export function combinations<T>(arr: T[], n: number): T[][] {
  const len = arr.length;
  const result: T[][] = [];

  if (n > len || n <= 0) {
    return result; // No combinations possible
  }
  if (n === len) {
    return [[...arr]] // 1 combination: all
  }
  if (n === 1) {
    return arr.map(v => [v]) // len combinations: one per value
  }

  for (let i = 0; i < len - n + 1; i++) {
    const sliced = arr.slice(i + 1)
    //console.log(len, n, arr[i], "sliced", JSON.stringify(sliced))
    const remaining_combinations = combinations(sliced, n - 1)
    //console.log(len, n, arr[i], "remain", JSON.stringify(remaining_combinations))
    const prepended = remaining_combinations.map(c => [arr[i], ...c])
    //console.log(len, n, arr[i], "prepend", JSON.stringify(prepended))
    result.push(...prepended)
  }

  return result
}