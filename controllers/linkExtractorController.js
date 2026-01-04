const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");

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
    const SOCIAL_DOMAINS = [
      "instagram.com", "facebook.com", "twitter.com", "x.com", "linkedin.com", 
      "tiktok.com", "youtube.com", "pinterest.com", "snapchat.com", "threads.net",
      "medium.com", "twitch.tv", "reddit.com"
    ];

    const COMMUNITY_DOMAINS = [
      "whatsapp.com", "t.me", "telegram.org", "discord.com", "discord.gg", "slack.com",
      "skype.com", "zoom.us"
    ];

    const SHOP_DOMAINS = [
      "amazon.", "amzn.", "flipkart.com", "myntra.com", "meesho.com", "shopify.com",
      "etsy.com", "ebay.com", "gumroad.com", "patreon.com", "ko-fi.com", "buymeacoffee.com",
      "razorpay.com", "stripe.com", "paypal.com", "paytm.com"
    ];

    for (const link of uniqueLinks) {
      try {
        const u = new URL(link);
        const h = u.hostname.toLowerCase().replace(/^www\./, "");

        let categorized = false;

        // Check Social
        if (SOCIAL_DOMAINS.some(d => h === d || h.endsWith("." + d))) {
          categories.social.push(link);
          categorized = true;
        }
        // Check Community
        else if (COMMUNITY_DOMAINS.some(d => h === d || h.endsWith("." + d))) {
          categories.community.push(link);
          categorized = true;
        }
        // Check Shop/Affiliate OR Others (Website links)
        // User update: "if its webstie links i mean not just amazon etc even website links comes in apffliate links"
        // So if it's NOT Social AND NOT Community, it goes here.
        else {
          categories.affiliate_shop.push(link);
          categorized = true;
        }

        // Previously we skipped uncategorized links. Now all remaining links go to affiliate_shop.
      } catch (e) {}
    }

    res.json({
      success: true,
      source: hostname,
      links: categories // Returns categorized object instead of flat array
    });

  } catch (err) {
    console.error("Link Extraction Error:", err.message);
    res.status(500).json({ success: false, error: "extraction_failed", details: err.message });
  }
};
