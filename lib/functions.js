export const COLOR = {
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
  brightBlack: '\u001b[30;1m',
  brightRed: '\u001b[31;1m',
  brightGreen: '\u001b[32;1m',
  brightYellow: '\u001b[33;1m',
  brightBlue: '\u001b[34;1m',
  brightMagenta: '\u001b[35;1m',
  brightCyan: '\u001b[36;1m',
  brightWhite: '\u001b[37;1m',
  default: '\u001b[0m',
};

/**
 * Prints an error message in red to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function error(ns, msg, ...msg_args) {
  ns.printf(`${COLOR.red}${msg}`, ...msg_args)
}

/**
 * Prints an error message in red to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function error_t(ns, msg, ...msg_args) {
  ns.tprintf(`${COLOR.red}${msg}`, ...msg_args)
}

/**
 * Prints an warning message in yellow to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function warning(ns, msg, ...msg_args) {
  ns.printf(`${COLOR.yellow}${msg}`, ...msg_args)
}

/**
 * Prints a warning message in yellow to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function warning_t(ns, msg, ...msg_args) {
  ns.tprintf(`${COLOR.yellow}${msg}`, ...msg_args)
}

/**
 * Prints an success message in green to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function success(ns, msg, ...msg_args) {
  ns.printf(`${COLOR.green}${msg}`, ...msg_args)
}

/**
 * Prints a success message in green to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function success_t(ns, msg, ...msg_args) {
  ns.tprintf(`${COLOR.green}${msg}`, ...msg_args)
}

/**
 * Prints a log message with timestamp
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function log(ns, msg, ...msg_args) {
  ns.printf(`${new Date(Date.now()).toISOString()}: ${msg}`, ...msg_args)
}

/**
 * Prints a log message with timestamp
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function log_t(ns, msg, ...msg_args) {
  ns.tprintf(`${new Date(Date.now()).toISOString()}: ${msg}`, ...msg_args)
}

/**
 * @param {boolean} expr Expression to test
 * @param {string} msg Error message to throw when the assertion fails.
 */
export function assert(expr, msg = "Assertion failed!") {
  if (expr === false) {
    throw new Error(msg)
  }
}

/**
 * @param {any} valueA Expression to test
 * @param {any} valueB Error message to throw when the assertion fails.
 */
export function assertEqual(actualValue, desiredValue) {
  assert(
    actualValue === desiredValue || JSON.stringify(actualValue) === JSON.stringify(desiredValue),
    `Assertion failed: ${JSON.stringify(actualValue)} is not ${JSON.stringify(desiredValue)}`
  )
}

/**
 * @param {NS} ns
 * @param {string[]} fns
 */
export function disableLogs(ns, ...fns) {
  ns.disableLog("disableLog")
  for (let fn of fns) {
    ns.disableLog(fn)
  }
}

export function formatTime(ms) {
  function val(labelSingle, labelMultiple, factor, mod = 0) {
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
export function keep_ram(available_ram, parameter_man_keep = -1, parameter_auto_keep = true) {
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
export async function all_finished(ns, wait_for_pids, { sleep_time = 200, max_wait = 0 } = {}) {
  disableLogs(ns, "sleep")
  let remaining_pids = [...wait_for_pids.filter(p => p)]
  let waited = 0
  while (remaining_pids.length > 0) {
    if (max_wait > 0 && waited >= max_wait) {
      ns.tprintf("Abbruch Warten auf PID %d nach %d ms", wait_for_pid, waited)
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
export async function finished(ns, wait_for_pid, { sleep_time = 200, max_wait = 0 } = {}) {
  await all_finished(ns, [wait_for_pid], { sleep_time, max_wait })
}

export function check_valid_pid(proc_id, process_description = null, run_on_error = null) {
  if (proc_id === 0) {
    if (run_on_error != null) {
      run_on_error()
    }
    throw new Error(process_description != null ? `Konnte Prozess "${process_description}" nicht starten.` : "Konnte Prozess nicht starten.")
  }
}

/**
 * Returns ThreadsOrRunOptions as a string for calling
 * @param {number|RunOptions|undefined} run_opts Either an integer number of threads for new script, or a  {@link  RunOptions }  object. Threads defaults to 1.
 */
export function run_opts_as_call_param(run_opts = undefined) {
  if (typeof run_opts === "number") {
    return `-t ${run_opts}`
  }
  if (typeof run_opts?.threads === "number") {
    return `-t ${run_opts.threads}`
  }
  return "-t 1"
}

/**
 * Starts a new process on the current machine and waits until the process is finished.
 * @param {NS} ns NetScript API.
 * @param {string} script Filename of script to run.
 * @param {number|RunOptions|undefined} threadOrOptions Either an integer number of threads for new script, or a {@link  RunOptions}  object. Threads defaults to 1. 
 * @param {ScriptArg[]} script_args Additional arguments to pass into the new script that is being run. Note that if any arguments are being passed into the new script, then the second argument threadOrOptions must be filled in with a value.  
 */
export async function run_script(ns, script, threadOrOptions = undefined, ...script_args) {
  const proc_id = ns.run(script, threadOrOptions, ...script_args)
  check_valid_pid(proc_id, `run ${script} ${run_opts_as_call_param(threadOrOptions)} ${script_args.join(" ")}`)
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
export async function exec_script(ns, script, hostname, threadOrOptions = undefined, ...script_args) {
  const proc_id = ns.exec(script, hostname, threadOrOptions, ...script_args)
  check_valid_pid(proc_id, `exec ${script} ${hostname} ${run_opts_as_call_param(threadOrOptions)} ${script_args.join(" ")}`)
  await finished(ns, proc_id)
}

/**
 * Filters only unique values as of Array.indexOf for use in Array.filter
 * @param {any} val
 * @param {number} idx
 * @param {any[]} arr
 * @return {boolean}
 */
export function f_unique(val, idx, arr) {
  return arr.indexOf(val) === idx
}

/** @param {string} str */
export function is_empty_str(str) {
  return (!str || str === "")
}

/** @param {any[]} ar1 @param {any[]} ar2 */
export function share_entries(ar1, ar2) {
  return ar1.some(e1 => ar2.includes(e1))
}

/** @param {any[]} ar1 @param {any[]} ar2 */
export function intersect(ar1, ar2) {
  return ar1.filter(e1 => ar2.includes(e1))
}

/** @param {any[]} ar1 @param {any[]} ar2 */
export function union(ar1, ar2) {
  return [...ar1, ...ar2].filter(f_unique)
}

/** @param {string} bits @return {string} */
export function add_bit(bits) {
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

/** @param {string} bits @return {number} */
export function count_bits(bits) {
  return bits.split("").filter(b => b === "1").length
}

/** @param {any[]} arr @param {number} n @return {any[][]} */
export function combinations(arr, n) {
  const len = arr.length;
  const result = [];

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

export class OutputTable {
  /** Data types for constructing the table (used in formatting the data per line) */
  static DATA_TYPES = {
    /** Data type for strings. */
    STRING: "str",
    /** Data type for numbers. */
    NUMBER: "num",
    /** Data type for percentages. */
    PERCENTAGE: "pct",
    /** Data type for RAM numbers. */
    RAM: "ram",
    /** Data type for integers (no formatting). */
    INTEGER: "int",
    /** Data type for currency numbers. */
    CURRENCY: "cur",
    /** Data type for booleans. */
    BOOLEAN: "bool",
  }

  /**
   * Creates a new table definition for outputting to console
   * @param {NS} ns NetScript API.
   * @param {[number, string, boolean?][]} columns
   * Column definitions
   * 
   * Index 0: Length (0 or less for as wide as needed, but might destroy layout)
   * Index 1: (Optional) Type of column for corresponding automatic conversion to string.
   *          If no type is given the standard conversion to string is used.
   * Index 2: (Optional) Possible left alignment.
   * @param {number} lines_per_block After how many lines should a separator be drawn. 0 or less means no separator lines. Default: 3.
   * @param {boolean} outer_lines Should outer lines be drawn? Default: False.
   * @param {string[]} boolean_translate Translations for boolean values. First for true, second for false. Default: ["Ja", "Nein"]
   */
  constructor(ns, columns, { lines_per_block = 3, outer_lines = false, boolean_translate = ["Ja", "Nein"] } = {}) {
    this._ns = ns

    this._column_value_to_string = (column_index, value) => OutputTable.transform_value(columns[column_index][1], ns, value, boolean_translate)
    this._line_template = columns.map(c => `%${(c[2] ?? false) === (c[0] > 0) ? '-' : ''}${c[0] > 0 ? c[0] : 40}s`).join(" | ")
    this._separator_line = columns.map(c => "-".repeat(c[0] > 0 ? c[0] : 40)).join("-+-")
    if (outer_lines) {
      this._line_template = `| ${this._line_template} |`
      this._separator_line = `+-${this._separator_line}-+`
    }
    this._lines_per_block = lines_per_block ?? 0

    this.reset()
  }

  reset() {
    this._line = 0
  }

  separator() {
    this._ns.tprintf(this._separator_line)
  }

  headline(...values) {
    this._ns.tprintf(this._line_template, ...values)
    this.separator()
  }

  /**
   * Prints a new line with the given values.
   * @param {any[]} values 
   */
  line(...values) {
    const col_values = values.map((v, i) => this._column_value_to_string(i, v))
    if (this._lines_per_block > 0 && this._line > 0 && this._line % this._lines_per_block === 0) {
      this.separator()
    }
    this._ns.tprintf(this._line_template, ...col_values)
    this._line += 1
  }

  /** @param {NS} ns NetScript API. @param {number} value The value to format. @return {string} The formatted value. */
  static tv_num(ns, value) { return ns.formatNumber(value) }
  /** @param {NS} ns NetScript API. @param {number} value The value to format. @return {string} The formatted value. */
  static tv_pct(ns, value) { return value === 0 ? "-" : ns.formatPercent(value) }
  /** @param {NS} ns NetScript API. @param {number} value The value to format. @return {string} The formatted value. */
  static tv_ram(ns, value) { return ns.formatRam(value) }
  /** @param {NS} ns NetScript API. @param {number} value The value to format. @return {string} The formatted value. */
  static tv_int(ns, value) { return `${value}` }
  /** @param {NS} ns NetScript API. @param {number} value The value to format. @return {string} The formatted value. */
  static tv_cur(ns, value) { return `$${ns.formatNumber(value)}` }
  /** @param {NS} ns NetScript API. @param {number} value The value to format. @return {string} The formatted value. */
  static tv_bool(ns, value, boolean_translate) { return boolean_translate[value === true ? 0 : 1] }
  /** @param {string} type Type of value. @param {NS} ns NetScript API. @param {any} value The value to format. @return {string} The formatted value. */
  static transform_value(type, ns, value, boolean_translate) {
    switch (type) {
      case OutputTable.DATA_TYPES.NUMBER:
        return OutputTable.tv_num(ns, value)
      case OutputTable.DATA_TYPES.PERCENTAGE:
        return OutputTable.tv_pct(ns, value)
      case OutputTable.DATA_TYPES.RAM:
        return OutputTable.tv_ram(ns, value)
      case OutputTable.DATA_TYPES.INTEGER:
        return OutputTable.tv_int(ns, value)
      case OutputTable.DATA_TYPES.CURRENCY:
        return OutputTable.tv_cur(ns, value)
      case OutputTable.DATA_TYPES.BOOLEAN:
        return OutputTable.tv_bool(ns, value, boolean_translate)
      default:
        return String(value)
    }
  }
}