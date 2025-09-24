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
  ns.printf(`${COLOR.red}${msg}`, msg_args)
}

/**
 * Prints an error message in red to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function error_t(ns, msg, ...msg_args) {
  ns.tprintf(`${COLOR.red}${msg}`, msg_args)
}

/**
 * Prints an warning message in yellow to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function warning(ns, msg, ...msg_args) {
  ns.printf(`${COLOR.yellow}${msg}`, msg_args)
}

/**
 * Prints a warning message in yellow to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function warning_t(ns, msg, ...msg_args) {
  ns.tprintf(`${COLOR.yellow}${msg}`, msg_args)
}

/**
 * Prints a log message with timestamp
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function log(ns, msg, ...msg_args) {
  ns.printf(`${new Date(Date.now()).toISOString()}: ${msg}`, msg_args)
}

/**
 * Prints a log message with timestamp
 * @param {NS} ns
 * @param {string} msg
 * @param {string[]} msg_args
 */
export function log_t(ns, msg, ...msg_args) {
  ns.tprintf(`${new Date(Date.now()).toISOString()}: ${msg}`, msg_args)
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