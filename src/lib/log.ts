/*
Constants and functions to format and print messages
*/

import { ScriptArg } from "@ns";

/** Color codes used for formatting terminal messages. */
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
 * Formats a message as an error in red.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function error_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return ns.sprintf(`${COLOR.red}${msg}`, ...msg_args)
}

/**
 * Formats a message as a warning in yellow.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function warning_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return ns.sprintf(`${COLOR.yellow}${msg}`, ...msg_args)
}

/**
 * Formats a message as a success in green (slightly brighter than the terminal color).
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function success_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return ns.sprintf(`${COLOR.green}${msg}`, ...msg_args)
}

/**
 * Prepends the script's name for easier recognition of where some output came from.
 * @param {NS} ns
 * @param {string} msg
 */
export function prepend_script(ns: NS, msg: string) {
    return ns.sprintf("%s: %s", ns.getScriptName(), msg)
}

/**
 * Prepends the current time for easier recognition of when something happened.
 * @param {NS} ns
 * @param {string} msg
 */
export function prepend_time(ns: NS, msg: string) {
    return ns.sprintf("%s: %s", new Date(Date.now()).toISOString(), msg)
}

/**
 * Prints an error message in red to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function error(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(error_msg(ns, msg, ...msg_args))
}

/**
 * Prints an error message in red to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function error_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(error_msg(ns, msg, ...msg_args))
}

/**
 * Prints an warning message in yellow to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function warning(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(warning_msg(ns, msg, ...msg_args))
}

/**
 * Prints a warning message in yellow to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function warning_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(warning_msg(ns, msg, ...msg_args))
}

/**
 * Prints an success message in green to the script log.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function success(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(success_msg(ns, msg, ...msg_args))
}

/**
 * Prints a success message in green to the terminal.
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function success_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(success_msg(ns, msg, ...msg_args))
}

/**
 * Prints a log message with timestamp
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function log(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(prepend_time(ns, ns.sprintf(msg, ...msg_args)))
}

/**
 * Prints a log message with timestamp
 * @param {NS} ns
 * @param {string} msg
 * @param {ScriptArg[]} msg_args
 */
export function log_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(prepend_time(ns, ns.sprintf(msg, ...msg_args)))
}
