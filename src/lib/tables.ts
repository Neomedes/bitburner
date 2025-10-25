import { NS } from '@ns'
import { property } from 'lodash'
import { assert, reduce_to_max } from '/lib/functions'

const EMPTY_TITLE: string = ""

export type boolean_translations = [string, string, string?]

function number_to_string(ns: NS, value: number): string { return ns.formatNumber(value) }
function percentage_to_string(ns: NS, value: number): string { return value === 0 ? "-" : ns.formatPercent(value) }
function ram_to_string(ns: NS, value: number): string { return ns.formatRam(value) }
function integer_to_string(ns: NS, value: number): string { return `${value}` }
function currency_to_string(ns: NS, value: number): string { return `$${ns.formatNumber(value)}` }
function boolean_to_string(ns: NS, value: boolean, translations: boolean_translations): string {
    const index = value === true ? 0 : (value == null && translations.length > 2 ? 2 : 1)
    return translations[index]!
}

/** Data types for constructing the table (used in formatting the data per line) */
export enum OutputTableColumnType {
    /** Data type for strings. */
    String = "str",
    /** Data type for numbers. */
    Number = "num",
    /** Data type for percentages. */
    Percentage = "pct",
    /** Data type for RAM numbers. */
    Ram = "ram",
    /** Data type for integers (no formatting). */
    Integer = "int",
    /** Data type for currency numbers. */
    Currency = "cur",
    /** Data type for booleans. */
    Boolean = "bool",
}


/**
 * @param type Type of value.
 * @param ns NetScript API.
 * @param value The value to format.
 * @param boolean_translations Boolean translations if the value is a boolean.
 * @return The formatted value.
 */
function column_value_to_string(type: OutputTableColumnType, ns: NS, value: any, boolean_translations: boolean_translations): string {
    switch (type) {
        case OutputTableColumnType.Number:
            return number_to_string(ns, value)
        case OutputTableColumnType.Percentage:
            return percentage_to_string(ns, value)
        case OutputTableColumnType.Ram:
            return ram_to_string(ns, value)
        case OutputTableColumnType.Integer:
            return integer_to_string(ns, value)
        case OutputTableColumnType.Currency:
            return currency_to_string(ns, value)
        case OutputTableColumnType.Boolean:
            return boolean_to_string(ns, value, boolean_translations)
        default:
            return String(value)
    }
}

/** Configuration for a single column */
export interface OutputTableColumnConfig {
    /** property to use for the column content */
    property: string,
    /** title of this column */
    title: string,
    /** Fixed width of column */
    width: number,
    /** output type of property */
    type: OutputTableColumnType,
    /** Should column be left aligned */
    left_aligned: boolean,
    /** Should the column width be automatically determined */
    auto_width: boolean,
    /** Individual boolean translations */
    boolean_translations: boolean_translations
}

function get_values(ns: NS, config: OutputTableColumnConfig[], value: any): string[] {
    const entries = Object.entries(value)
    const values = config.map(cfg => {
        const entry = (entries.find(e => cfg.property === e[0])?.[1]) ?? ""
        return typeof (entry) === "string" ? entry : column_value_to_string(cfg.type, ns, entry, cfg.boolean_translations)
    })
    return values
}

/** Configuration for the whole table */
interface OutputTableConfig {
    /** How many (counted) lines should there be in a block that will be wrapped between separator-lines. Defaults to 3. */
    lines_per_block: number,
    /** Should lines be drawn around the whole table? Defaults to false. */
    outer_lines: boolean,
    /** How to translate boolean values. First for true, second for false. Defaults are the German "Ja" and "Nein". */
    boolean_translations: boolean_translations,
}

interface OutputLine {
    content: string[],
    counts: boolean,
    is_title: boolean,
}

function fill_partial_config(column: Partial<OutputTableColumnConfig>, index: number, default_boolean_translations: boolean_translations): OutputTableColumnConfig {
    const width = column.width ?? 0
    const is_auto_width = width < 1
    return {
        property: column.property ?? `${index}`,
        title: column.title ?? EMPTY_TITLE,
        width: width,
        type: column.type ?? OutputTableColumnType.String,
        left_aligned: (column.left_aligned ?? false) === !is_auto_width,
        auto_width: column.auto_width ?? is_auto_width,
        boolean_translations: column.boolean_translations ?? default_boolean_translations
    }
}

function to_column_config(columns: Partial<OutputTableColumnConfig>[], default_boolean_translations: boolean_translations): OutputTableColumnConfig[] {
    return columns.map((c, i) => fill_partial_config(c, i, default_boolean_translations))
}

function validate_config(columns: OutputTableColumnConfig[]) {
    assert(columns.every(c => c.auto_width || c.width > 0), "Auto-length must be set or a fixed width given.")
}

function build_column_template(config: OutputTableColumnConfig): string {
    // `%${c.left_aligned ? '-' : ''}${c[0] > 0 ? `${c[0]}` : ""}s`
    let col = "%"
    if (config.left_aligned) col += "-"
    if (config.width > 0) col += `${config.width}`
    col += "s"
    return col
}

function build_separator_template(config: OutputTableColumnConfig): string {
    return "-".repeat(config.width > 0 ? config.width : 40)
}

export class OutputTable<T> {
    /**
     * Adds a headline with the given titles.
     * @param titles The column titles
     */
    headline: (...titles: string[]) => void
    /**
     * Adds a new line with the given content.
     * @param value The content
     * @param counts Should this line count towards the block count
     */
    line: (value: Partial<T>, counts?: boolean) => void
    /**
     * Flushes the content registered so far.
     */
    flush: () => void

    /**
     * Creates a new table definition for outputting to console
     * @param ns NetScript API.
     * @param columns Column definitions
     * @param lines_per_block After how many lines should a separator be drawn. 0 or less means no separator lines. Default: 3.
     * @param outer_lines Should outer lines be drawn? Default: False.
     * @param boolean_translations Translations for boolean values. First for true, second for false. Default: ["Ja", "Nein"]
     */
    constructor(ns: NS, columns: Partial<OutputTableColumnConfig>[], table_config?: Partial<OutputTableConfig>) {
        const _table_config: OutputTableConfig = {
            lines_per_block: table_config?.lines_per_block ?? 3,
            outer_lines: table_config?.outer_lines ?? false,
            boolean_translations: table_config?.boolean_translations ?? ["Ja", "Nein"],
        }
        const lines: OutputLine[] = []

        const config = to_column_config(columns, _table_config.boolean_translations)
        validate_config(config)

        this.headline = (...titles: string[]) => {
            assert(titles.length === config.length, `Headline: ${titles.length} titles given but ${config.length} columns registered.`)
            lines.push({ content: titles, counts: false, is_title: true })
        }
        this.line = (value: Partial<T>, counts: boolean = true) => {
            const values = get_values(ns, config, value)
            lines.push({ content: values, counts: counts, is_title: false })
        }

        this.flush = () => {
            // calculate automatic width column
            let split_long_lines = false
            config.filter(cfg => cfg.auto_width).forEach(cfg => {
                const index = config.indexOf(cfg)
                const max_width = lines.map(l => l.content[index].length).reduce(reduce_to_max)
                if (max_width > 80) {
                    // oversized line
                    cfg.width = 80
                    split_long_lines = true
                } else {
                    cfg.width = max_width
                }
            })
            function wrap_oversize_lines(line: string[]): string[][] {
                if (!split_long_lines) return [line]
                const splitted_lines: string[][] = []
                let remainder = [...line]
                while (remainder.some(cv => cv.length > 0)) {
                    splitted_lines.push(remainder.map(cv => cv.substring(0, 80)))
                    remainder = remainder.map(cv => cv.substring(80))
                }
                return splitted_lines
            }
            function wrap_format(builder_fn: (config: OutputTableColumnConfig) => string, padding: string, line: string) {
                const result = padding + config.map(builder_fn).join(padding + line + padding) + padding
                return _table_config.outer_lines ? line + result + line : result
            }
            // build line formats
            const line_template = wrap_format(build_column_template, " ", "|")
            const separator_line = wrap_format(build_separator_template, "-", "+")

            if (_table_config.outer_lines) ns.tprintf(separator_line)

            const automatic_header = config.some(cfg => cfg.title !== EMPTY_TITLE)
            if (automatic_header) {
                ns.tprintf(line_template, ...config.map(cfg => cfg.title))
                ns.tprintf(separator_line)
            }

            let line_count_for_block = 0
            lines.forEach(line => {
                const block_ended_before = _table_config.lines_per_block > 0 && line_count_for_block > 0 && (line_count_for_block % _table_config.lines_per_block) === 0
                if (block_ended_before && line.counts) ns.tprintf(separator_line)
                wrap_oversize_lines(line.content).forEach(subline => ns.tprintf(line_template, ...subline))
                if (line.is_title) ns.tprintf(separator_line)
                if (line.counts) line_count_for_block++
            })

            if (_table_config.outer_lines) ns.tprintf(separator_line)
        }
    }
}