import { describe, expect, it } from "vitest";
import { parseBrowseParams } from "./browseParams";

const parse = (q: string) => parseBrowseParams(new URLSearchParams(q));

describe("parseBrowseParams", () => {
  it("defaults to Popular", () => {
    expect(parse("type=avatar-frame")).toMatchObject({
      type: "avatar-frame",
      sort: "popular",
    });
  });
  it("reads every filter", () => {
    expect(
      parse(
        "type=background&sort=new&motion=still&vibe=anime&app=730&q=%20cat%20&owner=76561198220645184&cursor=100",
      ),
    ).toEqual({
      type: "background",
      sort: "new",
      motion: "still",
      vibe: "anime",
      app: 730,
      q: "cat",
      owner: "76561198220645184",
      cursor: "100",
    });
  });
  it("rejects bad values", () => {
    for (const q of [
      "type=sticker",
      "type=theme&sort=cheap",
      "type=theme&vibe=spooky",
      "type=theme&app=-1",
      "type=theme&owner=me",
      "type=theme&cursor=%3Cscript%3E",
      "type=theme&motion=fast",
    ]) {
      expect(typeof parse(q)).toBe("string");
    }
  });
});
