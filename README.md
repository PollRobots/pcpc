# pcpc — a minimalist parser-combinator library

`pcpc` is a zero-dependency library that provides a small set of parser combinators that can be used for _adhoc_ parsing.

[![npm version](https://badge.fury.io/js/@pollrobots%2Fpcpc.svg)](https://npmjs.com/package/@pollrobots/pcpc)

## Types

The core types are

``` typescript
type Parser<T> = (input: string) => Parsed<T>;

type Parsed<T> = {
  matches: true,
  value: T,
  remaining: string
} | {
  matches: false
}
```

A parser therefore takes a string input, and on a successful parsing/match returns the parsed value and the remaining unparsed input.

## Primitives

There are only three primitive parsers provided, which parse terminal tokens

### `token`

Matches a single string token.

``` typescript
function token(t: string, options?: TokenOptions): Parser<string>;

type TokenOptions = {
  caseSensitive: boolean;
  locales?: string | string[];
};
```

This creates a parser which will match the token `t` with the head of the input. The `options` parameter is used to control case-sensitivity.

### `typeTokens`

Matches a member of a string type union

``` typescript
function typeTokens<T extends string>(
  tokens: T[], 
  options?: TokenOptions
): Parser<T>;
```

This creates a parser which matches the input against the elements of the `tokens` array, this prefers the longest match, and uses the same `options` argument to control case-sensitivity.

### `regex`

Matches a regular expression

``` typescript
function regex<T>(
  r: RegExp, 
  convert: (m: RegExpMatchArray) => T | undefined
): Parser<T>;
```

Creates a parser which matches the input using the regular expression `r`. The match result, if any, is then passed to the `convert` function, and if that returns a value, that becomes the parse result.

Note: If the regular expression is not anchored to the start of the input (using `^`), then this will skip until the first valid input.

#### Example

``` typescript
const integer = regex(/^-?\d+/, m => Number(m[0]));
```

This creates the parser `integer` which will match an integer at the beginning of the input. `integer` will have the type `Parser<number>`, which is equivalent to `(input: string) => Parsed<number>`.

## Combinators

### `choice`

```typescript
function choice<T>(...args: Parser<T>): Parser<T>;
```

Creates a parser returns the first successful match of the passed in children. The arguments are checked in their natural order, and the first one that matches is returned.

### `sequence`

```typescript
function sequence<T extends any[]>(
  ...args: Parser<T[number]>[]
): Parser<[...T]>;
```

Creates a parser that matches a sequence of other parsers. Only if every child parser succeeds does the sequence succeed.

### `some`

```typescript
function some<T>(
  parser: Parser<T>,
  options?: SomeOptions
): Parser<T[]>;

type SomeOptions = {
  minimum?: number;
  maximum?: number;
}
```

Creates a parser that matches the same child parser repeatedly. The `options` parameter allows control over minimum and maximum repetitions.

### `separated`

```typescript
function separated<T, U>(
    item: Parser<T>,
    separator: Parser<U> | string,
    options?: SomeOptions,
): Parser<T[]>;
```

Creates a parser that matches repeated items with a common separator.  The `separator` parameter can
be provided as a parser, or as a `string` which will be handled as a `token()` parser.  The
`options` parameter allows
control over the minimum and maximmum number of items.

## Other

### `map`

``` typescript
function map<T, U>(
  parser: Parser<T>, 
  mapFn: (m: T) => U | undefined
): Parser<U>;
```

Creates a parser that, when the `parser` parameter is successful, takes the value and passes it to `mapFn`, which can return an object of another type or `undefined` to cause a parse failure.

### `optional`, `kleeneStar`, and `kleenePlus`

```typescript
function optional<T>(parser: Parser<T>): Parser<T|undefined>;
function kleeneStar<T>(parser: Parser<T>): Parser<T[]>;
function kleenePlus<T>(parser: Parser<T>): Parser<T[]>;
```

These are all simple wrappers around the `some` combinator, representing respectively parsers that will match

- 0 or 1 instances of the item parser,
- 0 or more instance of the item parser, or
- 1 or more instance of the items parser.

### `pair`

```typescript
function pair<T,U>(left: Parser<T>, right: Parser<U>): Parser<[T, U]>;
```

A wrapper around `sequence` that creates a parser to match a pair of parsers.

### `not` and `matches`

Non-capturing parsers

```typescript
function not<T>(parser: Parser<T>): Parser<void>;
function matches<T>(parser: Parser<T>): Parser<void>;
```

These match, but don't capture input, when their child parsers respectively fail to match, and do match the input.

### `ws`

``` typescript
export function ws<T>(
  parser: Parser<T>, 
  options?: WhitespaceOptions
): Parser<T>;

export type WhitespaceOptions = {
  requiredBefore?: boolean;
  requiredAfter?: boolean;
}
```

Creates a parser that will match and also consume leading and trailing whitespace. By default the
whitespace is optional, but this can be controlled by providing an `options` parameter.

### `everything`

```typescript
function everything<T>(parser: Parser<T>): Parser<T>;
```

Matches the inner parser only if that parser captures the entire input.
