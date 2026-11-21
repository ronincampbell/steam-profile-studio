import { describe, expect, it } from "vitest";
import { buildLook, PLACEHOLDER_PROFILE } from "./look";
import type { Cosmetic, Profile } from "@/lib/steam/types";

const frame: Cosmetic = { type: "avatar-frame", appid: 1, name: "Frame", image: "f.png", animatedImage: "f-anim.png" };
const bg: Cosmetic = { type: "background", appid: 2, name: "Bg", image: "bg.jpg", video: { webm: "bg.webm" } };
const otherBg: Cosmetic = { type: "background", appid: 3, name: "Other", image: "other.jpg" };
const purple: Cosmetic = { type: "theme", appid: 4, name: "Purple theme", themeId: "Purple" };
const anim: Cosmetic = { type: "animated-avatar", appid: 5, name: "Blob", image: "blob.jpg", animatedImage: "blob.gif" };

const profile: Profile = {
  ...PLACEHOLDER_PROFILE,
  name: "Fuzzycast",
  avatar: "avatar.jpg",
  level: 75,
  themeId: "Steel",
  equipped: { background: bg, avatarFrame: frame },
};

describe("buildLook", () => {
  it("shows the profile as equipped when nothing is tried on", () => {
    expect(buildLook(profile)).toMatchObject({
      name: "Fuzzycast",
      avatar: "avatar.jpg",
      frame,
      background: { image: "bg.jpg", video: { webm: "bg.webm" } },
      themeId: "Steel",
    });
  });

  it("swaps in tried-on items and empties removed slots", () => {
    const look = buildLook(profile, { background: otherBg, avatarFrame: null, theme: purple, animatedAvatar: anim });
    expect(look.background).toEqual({ image: "other.jpg", video: undefined });
    expect(look.frame).toBeUndefined();
    expect(look.themeId).toBe("Purple");
    expect(look.animatedAvatar).toBe(anim);
  });

  it("removing the theme goes back to Steam's default, not the profile's own", () => {
    expect(buildLook(profile, { theme: null }).themeId).toBeUndefined();
  });

  it("puts custom art over everything in its slot", () => {
    const look = buildLook(profile, { animatedAvatar: anim }, {
      avatar: "blob:avatar",
      background: { url: "blob:bg", kind: "image" },
    });
    expect(look.avatar).toBe("blob:avatar");
    expect(look.animatedAvatar).toBeUndefined();
    expect(look.background).toEqual({ image: "blob:bg" });
    expect(buildLook(profile, {}, { background: { url: "blob:v", kind: "video", mime: "video/mp4" } }).background).toEqual({
      video: { mp4: "blob:v" },
    });
    expect(buildLook(profile, {}, { background: { url: "blob:w", kind: "video", mime: "video/webm" } }).background).toEqual({
      video: { webm: "blob:w" },
    });
  });
});
