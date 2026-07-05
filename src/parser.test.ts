import { describe, test, expect } from "vitest";
import {
  choice,
  everything,
  kleenePlus,
  kleeneStar,
  map,
  matches,
  not,
  optional,
  regex,
  separated,
  sequence,
  some,
  token,
  typeTokens,
} from "./parser";

const TEST_TOKENS = ["Foo", "Bar", "Baz", "FooBar"] as const;
type TestToken = (typeof TEST_TOKENS)[number];
type Point = {
  x: number;
  y: number;
};

describe("token", () => {
  test.for<[string, string, string]>([
    ["foo", "foo", ""],
    ["FOO", "foo", ""],
    ["foo", "foobar", "bar"],
    ["foo", "FOO", ""],
    ["foo", "FooBar", "Bar"],
    ["FOO", "FooBar", "Bar"],
  ])('case insensitive token(%s) matches "%s"', ([t, input, remaining]) => {
    const parsed = token(t)(input);
    expect(parsed).toEqual({ matches: true, value: t, remaining });
  });

  test.each<[string, string, string]>([
    ["foo", "foo", ""],
    ["FOO", "FOO", ""],
    ["foo", "foobar", "bar"],
    ["Foo", "FooBar", "Bar"],
    ["Foo", "FooBar", "Bar"],
  ])(
    "case Sensitive token(%j) matches %j (%j remaining)",
    (t, input, remaining) => {
      const parsed = token(t, { caseSensitive: true })(input);
      expect(parsed).toEqual({ matches: true, value: t, remaining });
    }
  );
});

describe("regex", () => {
  test.each<[string, number, string]>([
    ["123", 123, ""],
    ["123foo", 123, "foo"],
    ["foo123bar", 123, "bar"],
  ])("input %j produces %i (%j remaining) ", (input, expected, remaining) => {
    const parsed = regex(/\d+/, m => Number(m))(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("typeTokens", () => {
  test.each<[string, TestToken, string]>([
    ["foo", "Foo", ""],
    ["FOO", "Foo", ""],
    ["FooBar", "FooBar", ""],
    ["FooBaz", "Foo", "Baz"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = typeTokens(TEST_TOKENS)(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("separated", () => {
  test.each<[string, TestToken[], string]>([
    ["", [], ""],
    ["foo", ["Foo"], ""],
    ["foo,bar", ["Foo", "Bar"], ""],
    ["foo,bar,Baz", ["Foo", "Bar", "Baz"], ""],
    ["foo,bar,Frog", ["Foo", "Bar"], ",Frog"],
    ["foo,bar,Frog", ["Foo", "Bar"], ",Frog"],
    ["foo,barFrog", ["Foo", "Bar"], "Frog"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = separated(typeTokens(TEST_TOKENS), ",")(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("some", () => {
  test.each<[string, TestToken[], string]>([
    ["", [], ""],
    ["foo", ["Foo"], ""],
    ["foobar", ["FooBar"], ""],
    ["foobazfrog", ["Foo", "Baz"], "frog"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = some(typeTokens(TEST_TOKENS))(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("kleeneStar", () => {
  test.each<[string, TestToken[], string]>([
    ["", [], ""],
    ["foo", ["Foo"], ""],
    ["foobar", ["FooBar"], ""],
    ["foobazfrog", ["Foo", "Baz"], "frog"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = kleeneStar(typeTokens(TEST_TOKENS))(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("kleenePlus", () => {
  test.each<[string, TestToken[], string]>([
    ["foo", ["Foo"], ""],
    ["foobar", ["FooBar"], ""],
    ["foobazfrog", ["Foo", "Baz"], "frog"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = kleenePlus(typeTokens(TEST_TOKENS))(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });

  test.each<[string]>([[""], ["frog"]])(
    "input %j produces doesnt parse",
    input => {
      const parsed = kleenePlus(typeTokens(TEST_TOKENS))(input);
      expect(parsed).toEqual({ matches: false });
    }
  );
});

describe("optional", () => {
  test.each<[string, TestToken | undefined, string]>([
    ["", undefined, ""],
    ["frog", undefined, "frog"],
    ["foo", "Foo", ""],
    ["foobar", "FooBar", ""],
    ["bazfrog", "Baz", "frog"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = optional(typeTokens(TEST_TOKENS))(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("not", () => {
  test.each([["frog"], ["bag"], ["six"], ["seven"]])(
    "input %j doesn't match",
    input => {
      const parsed = not(typeTokens(TEST_TOKENS))(input);
      expect(parsed).toEqual({
        matches: true,
        value: undefined,
        remaining: input,
      });
    }
  );

  test.each([["Foo"], ["foo"], ["bar"], ["Foobar"]])(
    "input %j fails",
    input => {
      const parsed = not(typeTokens(TEST_TOKENS))(input);
      expect(parsed).toEqual({ matches: false });
    }
  );
});

describe("matches", () => {
  test.each([["Foo"], ["foo"], ["bar"], ["Foobar"]])(
    "input %j matches",
    input => {
      const parsed = matches(typeTokens(TEST_TOKENS))(input);
      expect(parsed).toEqual({
        matches: true,
        value: undefined,
        remaining: input,
      });
    }
  );

  test.each([["frog"], ["bag"], ["six"], ["seven"]])(
    "input %j doesn't match",
    input => {
      const parsed = matches(typeTokens(TEST_TOKENS))(input);
      expect(parsed).toEqual({ matches: false });
    }
  );
});

describe("everything", () => {
  test.each<[string, TestToken]>([
    ["Foo", "Foo"],
    ["foo", "Foo"],
    ["bar", "Bar"],
    ["Foobar", "FooBar"],
  ])("input %j matches", (input, expected) => {
    const parsed = everything(typeTokens(TEST_TOKENS))(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining: "" });
  });

  test.each<[string]>([["Foofrog"], ["fooFoo"], [""]])(
    "input %j fails",
    input => {
      const parsed = everything(typeTokens(TEST_TOKENS))(input);
      expect(parsed).toEqual({ matches: false });
    }
  );
});

describe("choice", () => {
  const integer = regex(/^-?\d+/, m => Number(m));
  const testToken = typeTokens(TEST_TOKENS);

  test.each<[string, number | TestToken, string]>([
    ["123", 123, ""],
    ["foo", "Foo", ""],
    ["foo123", "Foo", "123"],
    ["123foo", 123, "foo"],
  ])("input %j produces %j (%j remaining)", (input, expected, remaining) => {
    const parsed = choice<number | TestToken>(integer, testToken)(input);
    expect(parsed).toEqual({ matches: true, value: expected, remaining });
  });
});

describe("map", () => {
  const integer = regex(/^-?\d+/, m => Number(m));
  const coordinate = map(
    sequence(
      token("("),
      separated(integer, ",", { minimum: 2, maximum: 2 }),
      token(")")
    ),
    ([_, [x, y]]): Point => ({
      x,
      y,
    })
  );

  test.each<[string, Point, string]>([
    ["(1,2)", { x: 1, y: 2 }, ""],
    ["(1,-2)", { x: 1, y: -2 }, ""],
    ["(1,2)frog", { x: 1, y: 2 }, "frog"],
  ])("input %j -> %j (%j remaining)", (input, expected, remaining) => {
    expect(coordinate(input)).toEqual({
      matches: true,
      value: expected,
      remaining,
    });
  });
});
