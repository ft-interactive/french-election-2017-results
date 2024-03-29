// Type definitions for babyparse
// Project: https://github.com/Rich-Harris/BabyParse
// Definitions by: Charles Parker <https://github.com/cdiddy77>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare namespace BabyParse {
    interface Static {
        /**
         * Parse a csv string or a csv file
         */
        parse(csvString: string, config?: ParseConfig): ParseResult;

        /**
         * Parse single file or multiple files
         */
        parseFiles(input: string | string[] | FileObject | FileObject[], config?: ParseConfig): ParseResult;

        /**
         * Unparses javascript data objects and returns a csv string
         */
        unparse(data: UnparseObject | Array<Object> | Array<Array<any>>, config?: UnparseConfig): string;

        /**
         * Read-Only Properties
         */
        // An array of characters that are not allowed as delimiters.
        BAD_DELIMETERS: Array<string>;

        // The true delimiter. Invisible. ASCII code 30. Should be doing the job we strangely rely upon commas and tabs for.
        RECORD_SEP: string;

        // Also sometimes used as a delimiting character. ASCII code 31.
        UNIT_SEP: string;

        // Whether or not the browser supports HTML5 Web Workers. If false, worker: true will have no effect.
        WORKERS_SUPPORTED: boolean;

        // The relative path to Papa Parse. This is automatically detected when Papa Parse is loaded synchronously.
        SCRIPT_PATH: string;

        /**
         * Configurable Properties
         */
        // The size in bytes of each file chunk. Used when streaming files obtained from the DOM that exist on the local computer. Default 10 MB.
        LocalChunkSize: string;

        // Same as LocalChunkSize, but for downloading files from remote locations. Default 5 MB.
        RemoteChunkSize: string;

        // The delimiter used when it is left unspecified and cannot be detected automatically. Default is comma.
        DefaultDelimiter: string;

        /**
         * On Papa there are actually more classes exposed
         * but none of them are officially documented
         * Since we can interact with the Parser from one of the callbacks
         * I have included the API for this class.
         */
        Parser: ParserConstructor;
    }
    interface ParseConfig {
        delimiter?: string;            // default: ""
        newline?: string;              // default: ""
        header?: boolean;              // default: false
        dynamicTyping?: boolean;       // default: false
        preview?: number;              // default: 0
        encoding?: string;             // default: ""
        worker?: boolean;              // default: false
        comments?: boolean;            // default: false
        download?: boolean;            // default: false
        skipEmptyLines?: boolean;      // default: false
        fastMode?: boolean;            // default: undefined

        // Callbacks
        step?(results: ParseResult, parser: Parser): void;  // default: undefined
        complete?(results: ParseResult): void; // default: undefined
    }

    interface UnparseConfig {
        quotes?: boolean|boolean[];    // default: false
        delimiter?: string;  // default: ","
        newline?: string;    // default: "\r\n"
        header?: boolean;    // default false
    }

    interface UnparseObject {
        fields: Array<any>;
        data: string | Array<any>;
    }

    interface FileObject {
        file: string
        config?: ParseConfig
    }

    interface ParseError {
        type: string;     // A generalization of the error
        code: string;     // Standardized error code
        message: string;  // Human-readable details
        row: number;      // Row index of parsed data where error is
    }

    interface ParseMeta {
        delimiter: string;     // Delimiter used
        linebreak: string;     // Line break sequence used
        aborted: boolean;      // Whether process was aborted
        fields: Array<string>; // Array of field names
        truncated: boolean;    // Whether preview consumed all input
    }

    /**
     * @interface ParseResult
     *
     * data: is an array of rows. If header is false, rows are arrays; otherwise they are objects of data keyed by the field name.
     * errors: is an array of errors
     * meta: contains extra information about the parse, such as delimiter used, the newline sequence, whether the process was aborted, etc. Properties in this object are not guaranteed to exist in all situations
     */
    interface ParseResult {
        data: Array<any>;
        errors: Array<ParseError>;
        meta: ParseMeta;
    }
    interface ParserConstructor { new (config: ParseConfig): Parser; }
    interface Parser {
        // Parses the input
        parse(input: string): any;

        // Sets the abort flag
        abort(): void;

        // Gets the cursor position
        getCharIndex(): number;
    }

}

declare var Baby:BabyParse.Static;

declare module "babyparse"{
    var Baby:BabyParse.Static;
    export = Baby;
}
