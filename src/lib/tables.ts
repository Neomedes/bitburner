import { NS } from '@ns'
import { assert, reduce_to_max } from '/lib/functions'
import { StandardColors, toBgColor } from '/lib/log'

export const EMPTY_TITLE = ""

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

export enum OutputTableColumnTotalCalculationMethod {
    NoCalculation = "-",
    NumberSum = "sum",
    NumberMin = "min",
    NumberMax = "max",
    NumberAvg = "avg",
    BooleanCountTrue = "count_true",
    BooleanCountFalse = "count_false",
}

type OutputTableTotals = ([string, number | number[] | null | ""])[]


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
            return typeof (value) === "number" ? number_to_string(ns, value) : String(value)
        case OutputTableColumnType.Percentage:
            return typeof (value) === "number" ? percentage_to_string(ns, value) : String(value)
        case OutputTableColumnType.Ram:
            return typeof (value) === "number" ? ram_to_string(ns, value) : String(value)
        case OutputTableColumnType.Integer:
            return typeof (value) === "number" ? integer_to_string(ns, value) : String(value)
        case OutputTableColumnType.Currency:
            return typeof (value) === "number" ? currency_to_string(ns, value) : String(value)
        case OutputTableColumnType.Boolean:
            return typeof (value) === "boolean" ? boolean_to_string(ns, value, boolean_translations) : String(value)
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
    boolean_translations: boolean_translations,
    /** Method, how to calculate the total, if needed */
    total_calculation: OutputTableColumnTotalCalculationMethod,
}

function get_values(ns: NS, config: OutputTableColumnConfig[], value: any): string[] {
    const entries = Object.entries(value)
    const values = config.map(cfg => {
        const entry: any = (entries.find(e => cfg.property === e[0])?.[1]) ?? ""
        return typeof (entry) === "string" ? entry : column_value_to_string(cfg.type, ns, entry, cfg.boolean_translations)
    })
    return values
}

const counting_totals = [
    OutputTableColumnTotalCalculationMethod.BooleanCountFalse,
    OutputTableColumnTotalCalculationMethod.BooleanCountTrue,
    OutputTableColumnTotalCalculationMethod.NumberSum,
]
const numeric_totals = [
    OutputTableColumnTotalCalculationMethod.NumberMax,
    OutputTableColumnTotalCalculationMethod.NumberMin,
]
const rolling_totals = [
    OutputTableColumnTotalCalculationMethod.NumberAvg
]
function init_totals(config: OutputTableColumnConfig[]): OutputTableTotals {
    return config.map(cfg => {
        if (numeric_totals.includes(cfg.total_calculation)) return [cfg.property, null]
        if (counting_totals.includes(cfg.total_calculation)) return [cfg.property, 0]
        if (rolling_totals.includes(cfg.total_calculation)) return [cfg.property, []]
        return [cfg.property, ""]
    })
}
function add_to_totals(config: OutputTableColumnConfig[], value: any, totals: OutputTableTotals) {
    const entries = Object.entries(value)
    config.forEach((cfg, idx) => {
        const entry: any = (entries.find(e => cfg.property === e[0])?.[1]) ?? ""
        switch (cfg.total_calculation) {
            case OutputTableColumnTotalCalculationMethod.NumberSum:
                if (typeof entry === "number") totals[idx][1] = (totals[idx][1] as number) + entry
                break;
            case OutputTableColumnTotalCalculationMethod.NumberMin:
                if (typeof entry === "number") totals[idx][1] = totals[idx][1] === null ? entry : Math.min(entry, totals[idx][1] as number)
                break;
            case OutputTableColumnTotalCalculationMethod.NumberMax:
                if (typeof entry === "number") totals[idx][1] = totals[idx][1] === null ? entry : Math.max(entry, totals[idx][1] as number)
                break;
            case OutputTableColumnTotalCalculationMethod.NumberAvg:
                if (typeof entry === "number") (totals[idx][1] as number[]).push(entry)
                break;
            case OutputTableColumnTotalCalculationMethod.BooleanCountTrue:
                if (typeof entry === "boolean") totals[idx][1] = (totals[idx][1] as number) + (entry ? 1 : 0)
                break;
            case OutputTableColumnTotalCalculationMethod.BooleanCountFalse:
                if (typeof entry === "number") totals[idx][1] = (totals[idx][1] as number) + (entry ? 0 : 1)
                break;
            case OutputTableColumnTotalCalculationMethod.NoCalculation:
            default:
                break;
        }
    })
}

/** Configuration for the whole table */
interface OutputTableConfig {
    /** How many (counted) lines should there be in a block that will be wrapped between separator-lines. Defaults to 3. */
    lines_per_block: number,
    /** Should lines be drawn around the whole table? Defaults to false. */
    outer_lines: boolean,
    /** How to translate boolean values. First for true, second for false. Defaults are the German "Ja" and "Nein". */
    boolean_translations: boolean_translations,
    /** Repeat the header every X lines, if number is > 0. Default is 0 (i.e. no intermediate headlines) */
    repeat_header: number,
    /** Print a line at the bottom containing the columns totals. Default is false. */
    print_totals: boolean,
}

interface OutputLine {
    content: string[],
    counts: boolean,
    is_title: boolean,
    is_separator: boolean,
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
        boolean_translations: column.boolean_translations ?? default_boolean_translations,
        total_calculation: column.total_calculation ?? OutputTableColumnTotalCalculationMethod.NoCalculation
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
     * Adds a separator line.
    */
    separator: () => void
    /**
     * Prints all totals so far
     */
    totals: () => void
    /**
     * Flushes the content registered so far.
     */
    flush: () => void

    /**
     * Creates a new table definition for outputting to console
     * @param ns NetScript API.
     * @param columns Column definitions
     * @param lines_per_block After how many lines should a separator be drawn. 0 or less means no separator lines. Default: 5.
     * @param outer_lines Should outer lines be drawn? Default: True.
     * @param boolean_translations Translations for boolean values. First for true, second for false. Default: ["Ja", "Nein"]
     */
    constructor(ns: NS, columns: Partial<OutputTableColumnConfig>[], table_config?: Partial<OutputTableConfig>) {
        const _table_config: OutputTableConfig = {
            lines_per_block: table_config?.lines_per_block ?? 5,
            outer_lines: table_config?.outer_lines ?? true,
            boolean_translations: table_config?.boolean_translations ?? ["Ja", "Nein"],
            repeat_header: table_config?.repeat_header ?? 0,
            print_totals: table_config?.print_totals ?? false,
        }
        const lines: OutputLine[] = []

        /** Adds a line and returns the index of this last line */
        function push_line(line: Partial<OutputLine>) {
            return lines.push({
                content: line.content ?? [],
                counts: line.counts ?? false,
                is_title: line.is_title ?? false,
                is_separator: line.is_separator ?? false
            }) - 1
        }

        const config = to_column_config(columns, _table_config.boolean_translations)
        validate_config(config)
        const automatic_header = config.some(cfg => cfg.title !== EMPTY_TITLE)

        let line_in_block_counter = 0
        this.separator = () => {
            const empty_content = config.map(cfg => EMPTY_TITLE)
            push_line({ content: empty_content, is_separator: true })
            line_in_block_counter = 0
        }

        let lines_since_last_headline = 0
        let last_saved_titles: string[]
        this.headline = (...titles: string[]) => {
            assert(titles.length === config.length, `Headline: ${titles.length} titles given but ${config.length} columns registered.`)
            push_line({ content: titles, is_title: true })
            last_saved_titles = titles
            this.separator()
            lines_since_last_headline = 0
        }

        const totals = init_totals(config)
        this.totals = () => {
            if (lines.length > 0 && !lines[lines.length - 1].is_separator) this.separator()
            const totals_obj = Object.fromEntries(totals)
            const values = get_values(ns, config, totals_obj)
            push_line({ content: values })
        }

        this.line = (value: Partial<T>, counts: boolean = true) => {
            // Add an automatic headline if possible
            if (last_saved_titles === undefined && automatic_header) this.headline(...config.map(cfg => cfg.title))
            // Automatic intermediate headlines and separators, if this line counts
            if (counts) {
                // add a separator line before this one, if the last block is already full
                if (_table_config.lines_per_block > 0 && line_in_block_counter >= _table_config.lines_per_block) {
                    this.separator()
                }
                // Intermediate headline only after a separator and before a line that counts
                if (_table_config.repeat_header > 0
                    && last_saved_titles !== undefined
                    && lines[lines.length - 1].is_separator
                    && lines_since_last_headline >= _table_config.repeat_header) {
                    this.headline(...last_saved_titles)
                }
            }
            const values = get_values(ns, config, value)
            push_line({ content: values, counts: counts })
            add_to_totals(config, value, totals)
            if (counts) {
                lines_since_last_headline++
                line_in_block_counter++
            }
        }

        this.flush = () => {
            // test if a last header should be printed
            if (_table_config.repeat_header > 0 && last_saved_titles !== undefined && lines_since_last_headline > _table_config.repeat_header / 2) {
                if (lines.length > 0 && !lines[lines.length - 1].is_separator) this.separator()
                this.headline(...last_saved_titles)
            }
            // test if column totals should be printed
            if (_table_config.print_totals) {
                this.totals()
            }
            // test if non-auto-width-columns already exceed their width
            let split_long_lines = config.filter(cfg => !cfg.auto_width).some(cfg => {
                const index = config.indexOf(cfg)
                const max_width = Math.max(lines.map(l => l.content[index].length).reduce(reduce_to_max), cfg.title.length)
                return max_width > cfg.width
            })
            // calculate automatic width column
            config.filter(cfg => cfg.auto_width).forEach(cfg => {
                const index = config.indexOf(cfg)
                const max_width = Math.max(lines.map(l => l.content[index].length).reduce(reduce_to_max), cfg.title.length)
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
                    const splitted_line = remainder.map((cv, idx) => {
                        const cfg = config.at(idx)!
                        if (cv.length > cfg.width) {
                            const split_at = cv.lastIndexOf(" ", cfg.width + 1)
                            return split_at > (cfg.width / 2) ? [cv.substring(0, split_at), cv.substring(split_at + 1)] : [cv.substring(0, cfg.width), cv.substring(cfg.width)]
                        }
                        return [cv, ""]
                    })
                    splitted_lines.push(splitted_line.map(([cur, nxt]) => cur))
                    remainder = splitted_line.map(([cur, nxt]) => nxt)
                }
                return splitted_lines
            }
            function wrap_format(builder_fn: (config: OutputTableColumnConfig) => string, padding: string | [string, string], line: string) {
                const padding_left = typeof (padding) === "string" ? padding : padding[0]
                const padding_right = typeof (padding) === "string" ? padding : padding[1]
                const result = padding_left + config.map(builder_fn).join(padding_right + line + padding_left) + padding_right
                return _table_config.outer_lines ? line + result + line : result
            }
            // build line formats
            const tpl_line = wrap_format(build_column_template, " ", "|")
            const tpl_separator = wrap_format(build_separator_template, "-", "+")
            const tpl_header = wrap_format(build_column_template, [` ${StandardColors.cyan}`, `${StandardColors.default} `], "|")

            if (_table_config.outer_lines) ns.tprintf(tpl_separator)

            lines.forEach((line, idx) => {
                if (line.is_separator) {
                    ns.tprintf(tpl_separator)
                } else {
                    wrap_oversize_lines(line.content).forEach(subline => ns.tprintf(line.is_title ? tpl_header : tpl_line, ...subline))
                }
            })

            if (_table_config.outer_lines && !lines[lines.length - 1].is_separator) ns.tprintf(tpl_separator)
        }
    }
}