export type Parsed<T> = ParseSuccess<T> | ParseFailure;

/** Represents a parse success */
export type ParseSuccess<T> = {
  matches: true;
  /** The matched value */
  value: T;
  /**
   * The remaining input after the match.
   *
   * For non-consuming matches use {@link matches}
   */
  remaining: string;
};

/** Represents a parsed failure */
export type ParseFailure = {
  matches: false;
};

/** A parser that expects a string input and produces a parsed result */
export type Parser<T> = (input: string) => Parsed<T>;

/**
 * Matches when the first of the child parsers matches.
 */
export function choice<T>(...options: Parser<T>[]): Parser<T> {
  return (input: string) => {
    for (const option of options) {
      const parsed = option(input);
      if (parsed.matches) {
        return parsed;
      }
    }
    return { matches: false };
  };
}

/**
 * Matchis if both arguments match, a wrapper around {@link sequence}
 */
export function pair<T, U>(left: Parser<T>, right: Parser<U>): Parser<[T, U]> {
  return sequence(left, right);
}

/**
 * Matches if every argument matches in sequence
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary for variadic typing
export function sequence<T extends any[]>(
  ...args: Parser<T[number]>[]
): Parser<[...T]> {
  return (input: string) => {
    let remaining = input;
    const result = [];
    for (const arg of args) {
      const parsed = arg(remaining);
      if (!parsed.matches) {
        return parsed;
      }
      result.push(parsed.value);
      remaining = parsed.remaining;
    }
    return {
      matches: true,
      value: result as [...T],
      remaining,
    };
  };
}

export type TokenOptions = {
  /**
   * Indicates whether token matching should be case sensitive.
   *
   * This defaults to `false`
   *
   * If no locale is provided, case-sensitivity is via {@link String.prototype.toLowerCase}, for more complex string matching
   * use {@link regex}
   */
  caseSensitive: boolean;

  /**
   * Locales to use for case insensitive string matching. This will be passed as the argument to
   * {@link String.prototype.toLocaleLowerCase}
   */
  locales?: string | string[];
};

/**
 * Matches a string token.
 *
 * By default this is a case-insensitive match. use the `options` parameter to change this.
 */
export function token(t: string, options?: TokenOptions): Parser<string> {
  const caseSensitive = options?.caseSensitive ?? false;
  if (caseSensitive) {
    return (input: string) =>
      input.startsWith(t)
        ? { matches: true, value: t, remaining: input.slice(t.length) }
        : { matches: false };
  }

  const locales = options?.locales;
  const toLower =
    locales !== undefined
      ? (v: string) => v.toLocaleLowerCase(locales)
      : (v: string) => v.toLowerCase();
  const lowerToken = toLower(t);
  return (input: string) =>
    toLower(input.slice(0, t.length)).startsWith(lowerToken)
      ? { matches: true, value: t, remaining: input.slice(t.length) }
      : { matches: false };
}

/**
 * Matches a regular expression to the input.
 *
 * This only matches the first match regardless of if the global flag is set on the regular expression.
 *
 * If the regular expression doesn't match at the beginning of the input string then the unmatched
 * portion of the input will be consumed in addition to the matched portion.
 *
 * ## Example
 *
 * This example matches a positive integer less than 256.
 *
 * ```
 * regex(/^\d+/, (m) => {
 *   const value = Number(m[0]);
 *   return (Number.isInteger(value) && value < 256) ? value : undefined;
 * })
 * ```
 *
 * @param r The regular expression object to match
 * @param convert On a regular expression match, this function will be passed the RegExp match
 * object. It should return the result of the match, or undefined to signal a match failure.
 */
export function regex<T>(
  r: RegExp,
  convert: (m: RegExpMatchArray) => T | undefined
): Parser<T> {
  return (input: string) => {
    const match = input.match(r);
    if (match !== null) {
      const value = convert(match);
      if (value !== undefined) {
        return {
          matches: true,
          value,
          remaining: input.slice((match.index ?? 0) + match[0].length),
        };
      }
    }
    return { matches: false };
  };
}

/**
 * Matches one of a set of strings that comprise the union type T.
 *
 * If there are multiple possible matches, then the longest match is taken .
 *
 * @param tokens A set of distinct string values which form a type union.
 * @param options Options that control the case sensitivity of the matching process
 */
export function typeTokens<T extends string>(
  tokens: readonly T[],
  options?: TokenOptions
): Parser<T> {
  // This isn't ordered, we take the longest match
  const longest = tokens.reduce(
    (accum, option) => Math.max(accum, option.length),
    0
  );

  const caseSensitive = options?.caseSensitive ?? false;
  const locales = options?.locales;

  const toLower = caseSensitive
    ? (v: string) => v
    : locales !== undefined
      ? (v: string) => v.toLocaleLowerCase(locales)
      : (v: string) => v.toLowerCase();
  return (input: string) => {
    const prefix = toLower(input.slice(0, longest));
    let best: T | undefined;
    for (const token of tokens) {
      if (best && token.length < best.length) {
        continue;
      }
      if (prefix.length >= token.length && prefix.startsWith(toLower(token))) {
        best = token;
        if (best.length === longest) {
          break;
        }
      }
    }
    if (best) {
      return {
        matches: true,
        value: best,
        remaining: input.slice(best.length),
      };
    }
    return { matches: false };
  };
}

type SomeOptions = {
  /** The minimum number of options to match, default 0. */
  minimum?: number;
  /** The maximum number of options to match, default open-ended. */
  maximum?: number;
};

/**
 * Matches the `item` parser separated by the `separator` parser repeatedly until either there is
 * no further match or until a limit specified by the `options` parameter is reached.
 *
 * ## Examples
 *
 * This will match exactly two integers separated by a comma.
 * ```
 * const uint = regex(/^\d+/, m => Number(m));
 * separated(uint, ",", {minimum:2, maximum:2});
 * ```
 * This will match an arbitrary number of comma separated integers, including none.
 * ```
 * const uint = regex(/^\d+/, m => Number(m));
 * separated(uint, ",");
 * ```
 *
 * @param item The item parser to match for each item. This determines the type of the list returned
 * on a successful match.
 * @param separator The separator parser to match, or a string, which will be handled as a
 * case-insensitive {@link token} parser.
 * @param options Used to control the minimum and maximum number of matches.
 */
export function separated<T, U>(
  item: Parser<T>,
  separator: Parser<U> | string,
  options?: SomeOptions
): Parser<T[]> {
  const minimum = Math.max(options?.minimum ?? 0);
  const maximum = options?.maximum;
  const concreteSeparator =
    typeof separator === "string" ? token(separator) : separator;

  return (input: string) => {
    const first = item(input);
    if (!first.matches) {
      return minimum > 0
        ? first
        : { matches: true, value: [], remaining: input };
    }
    const elements: T[] = [first.value];

    let remaining = first.remaining;
    while (true) {
      if (maximum !== undefined && elements.length === maximum) {
        return { matches: true, value: elements, remaining };
      }
      const preSeparator = remaining;
      const parseSeparator = concreteSeparator(remaining);
      if (!parseSeparator.matches) {
        if (elements.length >= minimum) {
          return { matches: true, value: elements, remaining };
        }
        return parseSeparator;
      }
      remaining = parseSeparator.remaining;
      const parsedItem = item(remaining);
      if (!parsedItem.matches) {
        if (elements.length >= minimum) {
          return { matches: true, value: elements, remaining: preSeparator };
        }
        return parsedItem;
      }
      elements.push(parsedItem.value);
      remaining = parsedItem.remaining;
    }
  };
}

/**
 * Matches the same parser more than once, returning a list of matched items.
 *
 * @param parser  The item parser
 * @param options  Options controlling minimum and maximum matches.
 */
export function some<T>(parser: Parser<T>, options?: SomeOptions): Parser<T[]> {
  const minimum = options?.minimum ?? 0;
  return (input: string) => {
    let remaining = input;
    const result: T[] = [];

    while (remaining.length > 0) {
      const parsed = parser(remaining);
      if (!parsed.matches) {
        if (result.length >= minimum) {
          break;
        }
        return parsed;
      }
      result.push(parsed.value);
      remaining = parsed.remaining;
      if (options?.maximum === result.length) {
        break;
      }
    }
    if (result.length < minimum) {
      return { matches: false };
    }
    return {
      matches: true,
      value: result,
      remaining,
    };
  };
}

/** An alias for {@link some} with no options, matches 0 or more items. */
export function kleeneStar<T>(parser: Parser<T>): Parser<T[]> {
  return some(parser);
}

/** An alias for {@link some} with a minimum of 1, matches 1 or more items. */
export function kleenePlus<T>(parser: Parser<T>): Parser<T[]> {
  return some(parser, { minimum: 1 });
}

/**
 * A wrapper around {@link some}, matching exactly 0 or 1 items.
 *
 * This uses {@link map} to change the return type from `T[]` to `T | undefined`
 */
export function optional<T>(parser: Parser<T>): Parser<T | undefined> {
  return map(some(parser, { minimum: 0, maximum: 1 }), v => v[0]);
}

/**
 * A helper function that maps the result of a successful parse operation from one type to another.
 *
 * This can be used to create concrete types from the parse tree
 *
 * ## Example
 *
 * This parses a coordinates type from two comma separated integers.
 * The types are explicit in the example just to each parser's type.
 *
 * ```
 * function parseCoords(input: string): {x: number, y: number} | undefined {
 *   const uint: Parser<number> = regex(/^\d+/, m => Number(m));
 *   const args: Parser<number[]> = separated(uint, ",", {minimum: 2, maximum: 2});
 *   const coords: Parser<{x:number, y: number}> = map(args, ([x, y]) => ({x, y}));
 *
 *   const parsed = coords(input);
 *   return parsed.matches ? parsed.value : undefined;
 * }
 * ```
 * This could also be expressed as
 * ```
 * const COORD_PARSER = map(
 *   separated(regex(/^\d+/, m => Number(m)), ",", {minimum: 2, maximum: 2})),
 *   ([x, y]) => ({x, y})
 * );
 *
 * function parseCoords(input: string): {x: number, y: number} | undefined {
 *   const parsed = COORDS_PARSER(input);
 *   return parsed.matches ? parsed.value : undefined;
 * }
 * ```
 *
 *
 * @param parser The wrapped parser
 * @param mapFn A function that takes the success type from `parser` and converts it to another type.
 */
export function map<T, U>(
  parser: Parser<T>,
  mapFn: (input: T) => U
): Parser<U> {
  return (input: string) => {
    const parsed = parser(input);
    if (!parsed.matches) {
      return parsed;
    }
    const { value, ...other } = parsed;
    return { value: mapFn(value), ...other };
  };
}

/** Inverts a match result, use for a forward assertion */
export function not<T>(parser: Parser<T>): Parser<void> {
  return (input: string) => {
    const parsed = parser(input);
    return parsed.matches
      ? { matches: false }
      : { matches: true, value: undefined, remaining: input };
  };
}

/** Asserts a match at the current location without consuming the input. */
export function matches<T>(parser: Parser<T>): Parser<void> {
  return (input: string) => {
    const parsed = parser(input);
    return parsed.matches
      ? { matches: true, value: undefined, remaining: input }
      : { matches: false };
  };
}

/** 
 * Matches and consumes surrounding whitespace.
 * 
 * The `options` parameter is used to control whether whitespace is optional (the default), or
 * required.
 */
export function ws<T>(parser: Parser<T>, options?: WhitespaceOptions): Parser<T> {
  const leading = options?.requiredBefore ? /^\s+/ : /^\s*/;
  const trailing = options?.requiredAfter ? /^\s+/ : /^\s*/;
  return map(sequence(regex(leading, () => {}), parser, regex(trailing, () => {})), ([_, v]) => v)
}

export type WhitespaceOptions = {
  /** Indicates whether leading whitespace is required or optional.  */
  requiredBefore?: boolean;
  /** Indicates whether trailing whitespace is required or optional.  */
  requiredAfter?: boolean;
}


// Matches only when the inner parser matches the entire input.
export function everything<T>(parser: Parser<T>): Parser<T> {
  return (input: string) => {
    const parsed = parser(input);
    if (parsed.matches && parsed.remaining !== "") {
      return { matches: false };
    }
    return parsed;
  };
}
