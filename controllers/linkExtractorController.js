const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const SocialLink = require("../models/socialLink");
const CommunityLink = require("../models/communityLink");
const ShopLink = require("../models/shopLink");

const ALLOWED_DOMAINS = [
  "linktr.ee",
  "link.bio",
  "beacons.ai",
  "bio.site",
  "carrd.co",
  "taplink.cc"
];

const BLOCKED_DOMAINS = [
  "thanks.is",
  "kqzyfj.com",
  "armra.com",
  "omniluxled.com",
  "sjv.io",
  "linksynergy.com",
  "pxf.io",
  "equipfoods.com",
  "clearstem.com",
  "wk5q.net",
  "thezeroproof.com",
  "jlab.com"
];

exports.extractLinks = async (req, res) => {
  try {
    const profileUrl = String(req.body?.profile_url || "").trim();

    // 1. Validate URL
    if (!profileUrl) {
      return res.status(400).json({ success: false, error: "profile_url_required" });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(profileUrl);
    } catch (e) {
      return res.status(400).json({ success: false, error: "invalid_url" });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({ success: false, error: "invalid_protocol" });
    }

    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));

    if (!isAllowed) {
      return res.status(400).json({ 
        success: false, 
        error: "domain_not_supported",
        message: `Allowed domains: ${ALLOWED_DOMAINS.join(", ")}`
      });
    }

    // 2. Fetch HTML
    const response = await axios.get(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      },
      timeout: 10000 // 10s timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const rawLinks = new Set();

    // 3. Extract <a> tags
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) rawLinks.add(href);
    });

    // 4. Extract from JSON blobs (simple regex approach)
    // Matches "url":"https://..." or "url": "https://..."
    const jsonUrlRegex = /"url"\s*:\s*"(https?:\/\/[^"]+)"/g;
    let match;
    while ((match = jsonUrlRegex.exec(html)) !== null) {
      // Decode unicode escapes if any (JSON often has \u002F instead of /)
      let url = match[1];
      try {
        url = JSON.parse(`"${url}"`); 
      } catch (e) {
        // if simple parse fails, use as is or unescape slashes
        url = url.replace(/\\/g, "");
      }
      rawLinks.add(url);
    }

    // 5. Filter and Normalize
    const outboundLinks = [];
    const profileOrigin = parsedUrl.origin; // e.g. https://linktr.ee
    
    // Helper to check if domain matches profile domain
    const isProfileDomain = (urlObj) => {
      const h = urlObj.hostname.toLowerCase().replace(/^www\./, "");
      return h === hostname || h.endsWith("." + hostname);
    };

    for (const link of rawLinks) {
      try {
        // Handle relative links? Usually we only want absolute outbound, but let's see.
        // The requirement says "outbound links". Relative links are usually internal.
        // We will try to construct a full URL just in case, but filter internal ones.
        
        let fullUrlStr = link;
        if (link.startsWith("/")) {
            // Relative link - likely internal, but let's resolve it to check domain
            fullUrlStr = new URL(link, profileOrigin).toString();
        }

        const urlObj = new URL(fullUrlStr);

        // Protocol check
        if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") continue;

        // Domain check (Rule: Remove if domain == profile domain)
        if (isProfileDomain(urlObj)) continue;

        // Blocked Domain check
        const h = urlObj.hostname.toLowerCase().replace(/^www\./, "");
        if (BLOCKED_DOMAINS.some(d => h === d || h.endsWith("." + d))) continue;

        // Path check (Rule: Remove if starts with profile URL)
        // e.g. profileUrl = https://linktr.ee/PWTelugu
        // link = https://linktr.ee/PWTelugu/store -> Removed by domain check anyway
        // But what if it's a subdomain?
        
        // The user requirement: "Remove any link where: Domain == profile domain OR link starts with the profile URL"
        // Domain check covers most, but let's be explicit.
        if (fullUrlStr.startsWith(profileUrl)) continue;

        outboundLinks.push(fullUrlStr);
      } catch (e) {
        // Invalid URL, skip
        continue;
      }
    }

    // 6. Deduplicate and Categorize
    const uniqueLinks = [...new Set(outboundLinks)];

    const categories = {
      social: [],
      community: [],
      affiliate_shop: []
    };

    // Category Rules
    const SOCIAL_MAP = {
      "instagram.com": "instagram",
      "facebook.com": "facebook",
      "linkedin.com": "linkedin",
      "twitter.com": "x",
      "x.com": "x",
      "youtube.com": "youtube",
      "pinterest.com": "pinterest",
      "tiktok.com": "tiktok",
      "snapchat.com": "snapchat",
      "threads.net": "threads",
      "medium.com": "website", // Fallback to website for unlisted
      "twitch.tv": "website",
      "reddit.com": "website"
    };

    const COMMUNITY_MAP = {
      "whatsapp.com": "whatsapp",
      "wa.me": "whatsapp",
      "t.me": "telegram",
      "telegram.org": "telegram",
      "discord.com": "discord",
      "discord.gg": "discord",
      "slack.com": "slack",
      "skype.com": "skype",
      "zoom.us": "zoom"
    };

    const userId = req.user.id;

    for (const link of uniqueLinks) {
      try {
        const u = new URL(link);
        const h = u.hostname.toLowerCase().replace(/^www\./, "");

        // Check Social
        let socialPlatform = null;
        for (const [domain, platform] of Object.entries(SOCIAL_MAP)) {
          if (h === domain || h.endsWith("." + domain)) {
            socialPlatform = platform;
            break;
          }
        }

        if (socialPlatform) {
          categories.social.push({ platform: socialPlatform, url: link });
        }
        // Check Community
        else {
          let communityPlatform = null;
          for (const [domain, platform] of Object.entries(COMMUNITY_MAP)) {
            if (h === domain || h.endsWith("." + domain)) {
              communityPlatform = platform;
              break;
            }
          }

          if (communityPlatform) {
            categories.community.push({ platform: communityPlatform, url: link });
          } else {
             // Affiliate / Shop / Other
             let title = "Check this out";
             // Try to infer title from URL path roughly
             const pathTitle = u.pathname.split("/").filter(p=>p).pop();
             if (pathTitle) title = pathTitle.replace(/[-_]/g, " ");
             
             categories.affiliate_shop.push({
                 url: link,
                 domain: h,
                 title: title
             });
          }
        }
      } catch (e) {
          console.error("Error processing link:", link, e.message);
      }
    }

    res.json({
      success: true,
      source: hostname,
      links: categories // Returns categorized object preview (NOT SAVED YET)
    });

  } catch (err) {
    console.error("Link Extraction Error:", err.message);
    res.status(500).json({ success: false, error: "extraction_failed", details: err.message });
  }
};

exports.fetchMeta = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: "url_required" });

        // Basic validation
        try { new URL(url); } catch (_) { return res.status(400).json({ success: false, error: "invalid_url" }); }

        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            timeout: 5000 // 5s timeout for metadata
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
        const image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || "";
        
        // Price extraction attempts (Schema.org or OG)
        let price = $('meta[property="product:price:amount"]').attr('content') || 
                   $('meta[property="og:price:amount"]').attr('content') || "";
        const currency = $('meta[property="product:price:currency"]').attr('content') || 
                        $('meta[property="og:price:currency"]').attr('content') || "USD";

        if (price && currency) {
            price = `${price} ${currency}`;
        }

        res.json({
            success: true,
            data: {
                url,
                title: title.trim(),
                description: description.trim(),
                imageUrl: image,
                price: price
            }
        });

    } catch (err) {
        // Don't fail hard, just return empty meta if fetch fails
        console.warn("Meta fetch failed for:", req.body?.url, err.message);
        res.json({ success: false, error: "fetch_failed", details: err.message });
    }
};

exports.importLinks = async (req, res) => {
    try {
        const { links } = req.body;
        // links structure expected:
        // {
        //    social: [{ platform, url }, ...],
        //    community: [{ platform, url }, ...],
        //    affiliate_shop: [{ url, title, domain }, ...]
        // }

        if (!links) return res.status(400).json({ success: false, error: "links_required" });
        const userId = req.user.id;

        const results = {
            social: 0,
            community: 0,
            shop: 0
        };

        // 1. Import Social
        if (Array.isArray(links.social)) {
            for (const s of links.social) {
                if (s.platform && s.url) {
                    await SocialLink.findOneAndUpdate(
                        { user: userId, platform: s.platform },
                        { url: s.url, visible: true },
                        { upsert: true, new: true }
                    );
                    results.social++;
                }
            }
        }

        // 2. Import Community
        if (Array.isArray(links.community)) {
            for (const c of links.community) {
                if (c.platform && c.url) {
                    // Avoid duplicates
                    const existing = await CommunityLink.findOne({ user: userId, platform: c.platform, url: c.url });
                    if (!existing) {
                        await CommunityLink.create({ 
                            user: userId, 
                            platform: c.platform, 
                            url: c.url, 
                            title: `Join my ${c.platform}` 
                        });
                        results.community++;
                    }
                }
            }
        }

        // 3. Import Shop
        if (Array.isArray(links.affiliate_shop)) {
            for (const sh of links.affiliate_shop) {
                if (sh.url) {
                    const existing = await ShopLink.findOne({ user: userId, url: sh.url });
                    if (!existing) {
                        await ShopLink.create({
                            user: userId,
                            url: sh.url,
                            domain: sh.domain || new URL(sh.url).hostname.replace(/^www\./, ""),
                            title: sh.title || "Check this out",
                            imageUrl: sh.imageUrl || null,
                            price: sh.price || null,
                            description: sh.description || null
                        });
                        results.shop++;
                    }
                }
            }
        }

        res.json({ success: true, imported: results });

    } catch (err) {
        console.error("Import Error:", err);
        res.status(500).json({ success: false, error: "import_failed", details: err.message });
    }
};

exports.trackShopClick = async (req, res) => {
    try {
        const { linkId } = req.params;
        if (!linkId) return res.status(400).json({ success: false, error: "link_id_required" });

        const link = await ShopLink.findByIdAndUpdate(linkId, { $inc: { clicks: 1 } }, { new: true });
        if (!link) return res.status(404).json({ success: false, error: "link_not_found" });

        res.json({ success: true, clicks: link.clicks });
    } catch (err) {
        res.status(500).json({ success: false, error: "tracking_failed" });
    }
};

