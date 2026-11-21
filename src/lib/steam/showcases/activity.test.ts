import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";
import { parseProfilePage } from "./parse";
import { parseComments } from "./activity";

// Fuzzycast's public profile, captured 21 Nov 2026 (friends and comments redacted).
const html = readFileSync(join(__dirname, "../../../../reference/html/fuzzycast-profile.html"), "utf8");
const page = parseProfilePage(html);

describe("parseRecentActivity on Fuzzycast", () => {
  const activity = page.recentActivity!;

  it("reads the two-week playtime and the three games", () => {
    expect(activity.playtime).toBe("11.2 hours past 2 weeks");
    expect(activity.games.map((g) => [g.name, g.hours, g.lastPlayed])).toEqual([
      ["Deadlock", "396 hrs on record", "last played on Nov 14"],
      ["Detroit: Become Human", "8.7 hrs on record", "last played on Nov 10"],
      ["Lumines Arise", "6.9 hrs on record", "last played on Nov 7"],
    ]);
  });

  it("reads each game's link and capsule", () => {
    expect(activity.games[0]).toMatchObject({
      href: "https://steamcommunity.com/app/1422450",
      capsule:
        "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1422450/88b400eca727f0547232b49b3e62827f07900c77/capsule_184x69.jpg?t=1790716179",
    });
  });

  it("leaves out the stats strip for a game without achievements", () => {
    expect(activity.games[0].info).toBeUndefined();
  });

  it("reads achievement progress like a Favorite Game", () => {
    const ach = activity.games[1].info!.achievements!;
    expect(ach.summary).toBe("19 / 48 Achievements");
    expect(ach.rare).toBe("2 Rare");
    expect(ach.bar).toEqual({ segments: [{ variant: "base", weight: 19 }], locked: 29 });
    expect(ach.icons).toHaveLength(5);
    expect(ach.icons[0].name).toBe("BURN THE PLACE");
    expect(ach.more).toEqual({ text: "+14", href: "https://steamcommunity.com/id/Fuzzycast/achievements/1222140" });
  });

  it("reads the links under the games", () => {
    expect(activity.links).toEqual([
      { text: "All Recently Played", href: "https://steamcommunity.com/id/Fuzzycast/games/" },
      { text: "Wishlist", href: "https://steamcommunity.com/id/Fuzzycast/wishlist/" },
      { text: "Reviews", href: "https://steamcommunity.com/id/Fuzzycast/recommended/" },
    ]);
  });
});

describe("parseComments on Fuzzycast", () => {
  const comments = page.comments!;

  it("reads the count, page size and View all link", () => {
    expect(comments.total).toBe(27);
    expect(comments.pageSize).toBe(6);
    expect(comments.allHref).toBe("https://steamcommunity.com/id/Fuzzycast/allcomments");
  });

  it("reads the first page of six comments", () => {
    expect(comments.list).toHaveLength(6);
    expect(comments.list.map((c) => c.author.state)).toEqual([
      "offline",
      "offline",
      "online",
      "offline",
      "online",
      "online",
    ]);
  });

  it("reads a commenter's avatar frame, still and animated", () => {
    expect(comments.list[0].author.frame).toBeUndefined();
    expect(comments.list[1].author.frame).toEqual({
      image:
        "https://shared.fastly.steamstatic.com/community_assets/images/items/1594460/025c3ce6fae160eb1b6fcb644eebbdb8a7b3700b.png",
      animatedImage:
        "https://shared.fastly.steamstatic.com/community_assets/images/items/1594460/3c64a25739fd5669308c2027feefc3a5c2badaf9.png",
    });
  });
});

// The capture's comments are redacted, so this one is written by hand in
// Steam's markup (as served 21 Nov 2026) with a made-up commenter.
const COMMENT = `
<div class="profile_comment_area">
<script>InitializeCommentThread( "Profile", "Profile_1", {"total_count":2,"start":0,"pagesize":6}, '', 40 );</script>
<div class="commentthread_area">
  <div class="commentthread_comments">
  <div class="commentthread_comment responsive_body_text" id="comment_123">
    <div class="commentthread_comment_content">
      <div class="commentthread_comment_author">
        <div class="commentthread_comment_avatar playerAvatar online">
          <a href="https://steamcommunity.com/id/example"><img src="https://avatars.fastly.steamstatic.com/abc.jpg" srcset="https://avatars.fastly.steamstatic.com/abc.jpg 1x, https://avatars.fastly.steamstatic.com/abc_medium.jpg 2x"></a>
        </div>
        <div class="author_name_group">
          <div class="flex_row"><a class="hoverunderline commentthread_author_link" href="https://steamcommunity.com/id/example"><bdi>Example Player</bdi></a></div>
          <div class="commentthread_comment_timestamp"></div>
          <div class="commentthread_comment_timestamp" title="February 7, 2026 @ 5:27:49 am PST" data-timestamp="1770470869">
            Feb 7 @ 5:27am&nbsp;
          </div>
        </div>
      </div>
      <div class="commentthread_comment_text" id="comment_content_123">
        +Rep<img src="https://community.fastly.steamstatic.com/economy/emoticon/PuroAmazed" alt=":PuroAmazed:" class="emoticon"> <script>alert(1)</script><img src="https://evil.example/x.png" class="emoticon">
      </div>
    </div>
  </div>
  </div>
</div>
</div>`;

describe("parseComments on one comment", () => {
  const comments = parseComments(parse(COMMENT))!;

  it("reads the author, time and count", () => {
    expect(comments.total).toBe(2);
    expect(comments.list[0]).toMatchObject({
      id: "123",
      author: {
        name: "Example Player",
        href: "https://steamcommunity.com/id/example",
        avatar: "https://avatars.fastly.steamstatic.com/abc.jpg",
        avatar2x: "https://avatars.fastly.steamstatic.com/abc_medium.jpg",
        state: "online",
      },
      time: "Feb 7 @ 5:27am",
      timeTitle: "February 7, 2026 @ 5:27:49 am PST",
    });
  });

  it("keeps Steam emoticons and drops scripts and other images", () => {
    const { html } = comments.list[0];
    expect(html).toContain('<img class="emoticon" src="https://community.fastly.steamstatic.com/economy/emoticon/PuroAmazed"');
    expect(html).not.toContain("script");
    expect(html).not.toContain("evil.example");
  });
});
