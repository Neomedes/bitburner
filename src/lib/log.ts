/*
Constants and functions to format and print messages
*/

import { ScriptArg } from "@ns";

export type Color = string

export function toColor(r: number, g: number, b: number): Color {
    return `\u001b[38;2;${r};${g};${b}m`
}

export function toBgColor(r: number, g: number, b: number): Color {
    return `\u001b[48;2;${r};${g};${b}m`
}

/** Color codes used for formatting terminal messages. */
export enum StandardColors {
    black = '\u001b[30m',
    red = '\u001b[31m',
    green = '\u001b[32m',
    yellow = '\u001b[33m',
    blue = '\u001b[34m',
    magenta = '\u001b[35m',
    cyan = '\u001b[36m',
    white = '\u001b[37m',
    brightBlack = '\u001b[30;1m',
    brightRed = '\u001b[31;1m',
    brightGreen = '\u001b[32;1m',
    brightYellow = '\u001b[33;1m',
    brightBlue = '\u001b[34;1m',
    brightMagenta = '\u001b[35;1m',
    brightCyan = '\u001b[36;1m',
    brightWhite = '\u001b[37;1m',
    default = '\u001b[0m',
};

/**
 * Prepends the script's name for easier recognition of where some output came from.
 */
export function prepend_script(ns: NS, msg: string) {
    return ns.sprintf("%s: %s", ns.getScriptName(), msg)
}

/**
 * Prepends the current time for easier recognition of when something happened.
 */
export function prepend_time(ns: NS, msg: string) {
    return ns.sprintf("%s: %s", new Date(Date.now()).toISOString(), msg)
}

/**
 * Formats a message with the given color (slightly brighter than the terminal color).
 */
export function colored_msg(ns: NS, color: Color, msg: string, ...msg_args: ScriptArg[]) {
    return prepend_script(ns, ns.sprintf(`${color}${msg}`, ...msg_args))
}

/**
 * Prints an message in the given color to the script log.
 */
export function colored(ns: NS, color: Color, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(colored_msg(ns, color, msg, ...msg_args))
}

/**
 * Prints a success message in green to the terminal.
 */
export function colored_t(ns: NS, color: Color, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(colored_msg(ns, color, msg, ...msg_args))
}

/**
 * Formats a message as an error in red.
 */
export function error_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return colored_msg(ns, StandardColors.red, msg, ...msg_args)
}

/**
 * Prints an error message in red to the script log.
 */
export function error(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(error_msg(ns, msg, ...msg_args))
}

/**
 * Prints an error message in red to the terminal.
 */
export function error_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(error_msg(ns, msg, ...msg_args))
}

/**
 * Formats a message as a warning in yellow.
 */
export function warning_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return colored_msg(ns, StandardColors.yellow, msg, ...msg_args)
}

/**
 * Prints an warning message in yellow to the script log.
 */
export function warning(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(warning_msg(ns, msg, ...msg_args))
}

/**
 * Prints a warning message in yellow to the terminal.
 */
export function warning_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(warning_msg(ns, msg, ...msg_args))
}

/**
 * Formats a message as a success in green (slightly brighter than the terminal color).
 */
export function success_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return colored_msg(ns, StandardColors.brightGreen, msg, ...msg_args)
}

/**
 * Prints an success message in green to the script log.
 */
export function success(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(success_msg(ns, msg, ...msg_args))
}

/**
 * Prints a success message in green to the terminal.
 */
export function success_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(success_msg(ns, msg, ...msg_args))
}

/**
 * Formats a message as a info in blue (slightly brighter than the terminal color).
 */
export function info_msg(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    return colored_msg(ns, StandardColors.brightCyan, msg, ...msg_args)
}

/**
 * Prints an info message in blue to the script log.
 */
export function info(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.printf(info_msg(ns, msg, ...msg_args))
}

/**
 * Prints a info message in blue to the terminal.
 */
export function info_t(ns: NS, msg: string, ...msg_args: ScriptArg[]) {
    ns.tprintf(info_msg(ns, msg, ...msg_args))
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
