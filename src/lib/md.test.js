import { describe, it, expect } from "vitest";
import {
  parseFrontMatter,
  serializeFrontMatter,
  parseSections,
  serializeSections,
} from "./md.js";

describe("parseFrontMatter", () => {
  it("parses string, number, boolean, null, ISO date, inline JSON", () => {
    const src = `---
name: Wake at 6:00 AM
count: 12
active: true
retired: false
note: null
endDate: 2026-12-31
rounds: [{"n":1,"target":"08:00"}]
meta: {"k":"v"}
---
body text
`;
    const { data, body } = parseFrontMatter(src);
    expect(data.name).toBe("Wake at 6:00 AM");
    expect(data.count).toBe(12);
    expect(data.active).toBe(true);
    expect(data.retired).toBe(false);
    expect(data.note).toBe(null);
    expect(data.endDate).toBe("2026-12-31");
    expect(data.rounds).toEqual([{ n: 1, target: "08:00" }]);
    expect(data.meta).toEqual({ k: "v" });
    expect(body).toBe("body text\n");
  });

  it("returns empty data + full source as body when no front-matter", () => {
    const { data, body } = parseFrontMatter("no front matter\nhere\n");
    expect(data).toEqual({});
    expect(body).toBe("no front matter\nhere\n");
  });

  it("handles empty body after front-matter", () => {
    const { data, body } = parseFrontMatter("---\nk: v\n---\n");
    expect(data).toEqual({ k: "v" });
    expect(body).toBe("");
  });
});

describe("serializeFrontMatter", () => {
  it("round-trips string, number, boolean, null, JSON", () => {
    const data = {
      name: "Wake",
      count: 12,
      active: true,
      note: null,
      rounds: [{ n: 1, target: "08:00" }],
    };
    const out = serializeFrontMatter(data, "body\n");
    const back = parseFrontMatter(out);
    expect(back.data).toEqual(data);
    expect(back.body).toBe("body\n");
  });
});

describe("parseSections", () => {
  it("splits body by ## headings, preserving raw content", () => {
    const body = `## Ambition
The user's words.

## Rounds
| # | Target |
| 1 | 08:00 |

## How we get there
Small steps.
`;
    const sec = parseSections(body);
    expect(sec.Ambition.trim()).toBe("The user's words.");
    expect(sec.Rounds).toContain("| 1 | 08:00 |");
    expect(sec["How we get there"].trim()).toBe("Small steps.");
  });

  it("returns empty object when no headings", () => {
    expect(parseSections("just prose\n")).toEqual({});
  });
});

describe("serializeSections", () => {
  it("emits sections in the order given, skips missing keys", () => {
    const out = serializeSections(
      { Ambition: "one line\n", Rounds: "table\n" },
      ["Ambition", "Missing", "Rounds"]
    );
    expect(out).toBe("## Ambition\none line\n\n## Rounds\ntable\n");
  });
});
