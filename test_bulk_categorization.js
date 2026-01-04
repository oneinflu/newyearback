const controller = require("./controllers/linkExtractorController");
const axios = require("axios");

// User provided links
const testLinks = [
  "https://thanks.is/direct/plat7850a264-716e-4c31-9ac5-16e9f13e/int_13b2ead4-3743-4a65-8515-0fda7d40",
  "https://thanks.is/direct/plat7850a264-716e-4c31-9ac5-16e9f13e/int_69fdb724-9185-4f25-b27c-ff1815a2",
  "https://www.kqzyfj.com/click-101093762-17072556",
  "https://armra.com",
  "https://omniluxled.com",
  "https://ritual.sjv.io/09RK9N",
  "https://thanks.is/direct/plat7850a264-716e-4c31-9ac5-16e9f13e/int_edcd813c-ccc5-492d-bd92-15719cc1",
  "https://click.linksynergy.com/fs-bin/click?id=5lRxBRhs1h0&offerid=1643829.7189369&type=3",
  "https://click.linksynergy.com/fs-bin/click?id=5lRxBRhs1h0&offerid=1802779.23&type=3",
  "https://thanks.is/direct/plat7850a264-716e-4c31-9ac5-16e9f13e/int_6815c7b1-69e3-4fea-bc29-20a1ef08",
  "https://headspace.pxf.io/c/5163860/2494442/13686",
  "https://thanks.is/direct/plat7850a264-716e-4c31-9ac5-16e9f13e/int_9b1ab8ef-fcb3-4c4e-abbb-9f25409c",
  "https://thanks.is/direct/plat7850a264-716e-4c31-9ac5-16e9f13e/int_411e3a4f-5b48-470a-b849-1c894b10",
  "https://www.equipfoods.com",
  "https://click.linksynergy.com/fs-bin/click?id=5lRxBRhs1h0&offerid=1429891.8&type=3&subid=0",
  "https://fabletics.sjv.io/c/5163860/951477/12340",
  "https://clearstem.com",
  "https://click.linksynergy.com/fs-bin/click?id=5lRxBRhs1h0&offerid=1802780.9&type=3",
  "https://purple-carrot.wk5q.net/c/5163860/2060141/9141?u=https%3A%2F%2Fwww.purplecarrot.com%2Fpages%2Fitsgoodfood%3Fcoupon%3Dfresh50",
  "https://dailyharvest.pxf.io/c/5163860/2928823/20086",
  "https://gobble.sjv.io/c/5163860/2907410/5084",
  "https://maevinc.sjv.io/c/5163860/2929162/27953",
  "https://thezeroproof.com",
  "https://www.jlab.com",
  "https://talkspace.pxf.io/c/5163860/2548680/14729",
  "https://babbel.sjv.io/c/5163860/1432288/13589"
];

// Mock axios
axios.get = async (url) => {
  if (url.includes("linktr.ee/TestProfile")) {
    const linksHtml = testLinks.map(link => `<a href="${link}">Link</a>`).join("\n");
    return {
      data: `
        <html>
        <body>
          ${linksHtml}
          <a href="https://instagram.com/user">Instagram</a>
        </body>
        </html>
      `
    };
  }
  throw new Error("404");
};

// Mock Res
const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

// Run Test
async function run() {
  console.log("--- Test Bulk Link Categorization ---");
  const req = { body: { profile_url: "https://linktr.ee/TestProfile" } };
  const res = mockRes();
  
  await controller.extractLinks(req, res);

  const links = res.body.links;
  
  console.log("Affiliate/Shop Links Count:", links.affiliate_shop.length);
  console.log("Expected Count:", testLinks.length);
  
  // Verify all test links are in affiliate_shop
  const missing = testLinks.filter(l => !links.affiliate_shop.includes(l));
  
  if (missing.length === 0) {
    console.log("✅ All provided links were correctly categorized as affiliate_shop");
  } else {
    console.error("❌ Some links were missing from affiliate_shop:");
    console.error(missing);
  }

  // Double check no contamination in other categories
  if (links.social.length === 1 && links.social[0].includes("instagram")) {
    console.log("✅ Social category clean");
  } else {
    console.log("⚠️ Social category unexpected content:", links.social);
  }
  
  if (links.community.length === 0) {
     console.log("✅ Community category clean (empty)");
  } else {
    console.log("⚠️ Community category unexpected content:", links.community);
  }
}

run();
