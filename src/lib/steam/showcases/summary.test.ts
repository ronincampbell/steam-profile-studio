import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProfilePage } from "./parse";

const html = readFileSync(join(__dirname, "../../../../reference/html/fuzzycast-profile.html"), "utf8");

/** A profile page with just a header summary, in Steam's markup. */
function page(summary: string) {
  return `<div class="profile_page"><div class="profile_header">
    <div class="profile_header_summary desktop"><div class="profile_summary">${summary}</div>
      <div class="profile_summary_footer"><span class="whiteLink">View more info</span></div></div>
    <div class="profile_header_summary mobile"><div class="profile_summary">mobile copy</div></div>
  </div></div>`;
}

describe("profile summary", () => {
  it("reads Fuzzycast's spoiler", () => {
    expect(parseProfilePage(html).summary).toBe(
      '<span class="bb_spoiler"><span> //NO SIGNAL// </span></span>',
    );
  });

  it("keeps BBCode, links and emoticons, and reads the desktop copy", () => {
    const summary = parseProfilePage(
      page(
        'Hi<br><b>bold</b> <a class="bb_link" href="https://steamcommunity.com/linkfilter/?u=https%3A%2F%2Fexample.com" target="_blank" rel=" noopener">link</a>' +
          ' <img src="https://community.fastly.steamstatic.com/economy/emoticon/steamhappy" alt=":steamhappy:" class="emoticon">',
      ),
    ).summary;
    expect(summary).toBe(
      'Hi<br><b>bold</b> <a class="bb_link" href="https://steamcommunity.com/linkfilter/?u=https%3A%2F%2Fexample.com" target="_blank" rel="noreferrer">link</a>' +
        ' <img class="emoticon" src="https://community.fastly.steamstatic.com/economy/emoticon/steamhappy" alt=":steamhappy:">',
    );
  });

  it("drops script tags, handlers and non-http links", () => {
    const summary = parseProfilePage(
      page('<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">x</a><img src="https://evil.example/a.png" onerror="x()">'),
    ).summary;
    expect(summary).toBe("alert(1)<a>x</a>");
  });

  it("is missing when the summary is empty", () => {
    expect(parseProfilePage(page("   ")).summary).toBeUndefined();
  });
});
