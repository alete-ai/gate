import FirecrawlApp from '@mendable/firecrawl-js';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Auto-Curator: Automated structural data acquisition for PrivacyGatekeeper.
 * 
 * Target Balance:
 * - 25+ Sensitive (Heavier on Healthcare, Utilities, Disability, Banking)
 * - 25+ Digestible (Heavier on User Content: Substack, Medium, AND Digestible Finance)
 * - 25+ Noise (Search, Landing Pages)
 */

const RAW_DIR = 'data/raw';
const API_KEY = 'local-no-key-required';
const API_URL = 'http://localhost:3002';

const app = new FirecrawlApp({ apiKey: API_KEY, apiUrl: API_URL });

const SENSITIVE_URLS = [
  // --- HEALTHCARE & DISABILITY (10+) ---
  "https://www.medicare.gov/plan-compare/",
  "https://www.healthcare.gov/see-plans/",
  "https://www.socialsecurity.gov/OACT/anypia/anypia.html",
  "https://www.cigna.com/individuals-families/plans-services/dental-insurance-plans/quote",
  "https://www.aetna.com/individuals-families/find-a-doctor.html",
  "https://www.kp.org/health-plans/shop-plans",
  "https://www.unitedhealthcare.com/health-insurance-plans/individual-family-plans",
  "https://www.humana.com/insurance-quotes",
  "https://www.bluecrossnc.com/shopping/individual-family",
  "https://www.oscarhealth.com/get-a-quote",
  "https://www.wellcare.com/Medicare",
  "https://www.ssa.gov/benefits/disability/",
  "https://www.benefits.gov/benefit-finder",
  "https://www.irs.gov/payments",
  "https://studentaid.gov/fsa-id/sign-in/landing",
  "https://www.mychart.org/",
  "https://www.questdiagnostics.com/patients/get-results",
  
  // --- UTILITIES & BILLS ---
  "https://www.pge.com/en/my-home/your-account/manage-your-account/billing-and-payments.html",
  "https://www.coned.com/en/accounts-billing/how-to-pay-your-bill",
  "https://www.duke-energy.com/home/billing",
  "https://www.southerncompany.com/billing-and-payment.html",
  "https://www.nationalgridus.com/MA-Home/Billing-and-Payments/",
  "https://www.xfinity.com/overview/billing",
  "https://www.att.com/pay-bill/",
  "https://www.t-mobile.com/pay-bill",
  "https://www.verizon.com/digital/nsa/secure/ui/acct/paybill/home",
  "https://www.spectrum.net/login/",
  "https://www.cox.com/resbusiness/my-account.html",
  "https://reg.usps.com/entreg/LoginAction_input",

  // --- FINANCIAL/SENSITIVE OTHERS ---
  "https://tailwindui.com/components/application-ui/page-examples/settings-screens",
  "https://www.bankofamerica.com/mortgage/mortgage-calculator/",
  "https://www.fidelity.com/calculators-tools/retirement-calculator/overview",
  "https://www.chase.com/personal/auto-loans/calculator",
  "https://www.hrblock.com/tax-calculator/",
  "https://turbotax.intuit.com/tax-tools/calculators/taxcaster/",
  "https://www.nerdwallet.com/mortgages/mortgage-calculator",
  "https://www.americanexpress.com/us/customer-service/faq.login-and-password.html",
  "https://www.wealthfront.com/login",
  "https://investor.vanguard.com/home"
];

const DIGESTIBLE_URLS = [
  // --- DIGESTIBLE FINANCE (Distinguish from Portals) ---
  "https://www.bloomberg.com/markets",
  "https://www.wsj.com/finance",
  "https://www.ft.com/world",
  "https://www.cnbc.com/finance/",
  "https://www.marketwatch.com/",
  "https://www.reuters.com/business/finance/",
  "https://www.investopedia.com/financial-term-dictionary-4769738",
  "https://www.kiplinger.com/retirement",
  "https://www.barrons.com/",
  "https://seekingalpha.com/",
  "https://www.fool.com/",

  // --- USER CONTENT (Substack, Medium, etc.) ---
  "https://substack.com/discover",
  "https://pragmaticengineer.substack.com/",
  "https://sinocism.substack.com/",
  "https://platformer.news/",
  "https://lenny.substack.com/",
  "https://medium.com/",
  "https://medium.com/topic/technology",
  "https://medium.com/topic/data-science",
  "https://medium.com/topic/mental-health",
  "https://medium.com/topic/creativity",
  "https://dev.to/",
  "https://hashnode.com/",
  "https://ghost.org/showcase/",
  "https://newsletter.banklesshq.com/",
  "https://money.substack.com/",
  
  // --- TECH & NEWS ---
  "https://techcrunch.com/",
  "https://www.statnews.com/",
  "https://daringfireball.net/",
  "https://www.theverge.com/",
  "https://stratechery.com/",
  "https://www.wired.com/",
  "https://arstechnica.com/",
  "https://www.nytimes.com/section/technology",
  "https://krebsonsecurity.com/",
  "https://schneier.com/",
  "https://www.eff.org/deeplinks",
  "https://privacyinternational.org/news-analysis",
  "https://en.wikipedia.org/wiki/Privacy_policy",
  "https://www.theatlantic.com/technology/",
  "https://www.newyorker.com/news/tech",
  "https://www.scientificamerican.com/",
  "https://www.nationalgeographic.com/",
  "https://nautil.us/",
  "https://aeon.co/",
  "https://www.theguardian.com/technology",
  "https://www.bbc.com/future",
  "https://www.technologyreview.com/",
  "https://www.economist.com/science-and-technology",
  "https://www.cnn.com/",
  "https://www.foxnews.com/"
];

const NOISE_URLS = [
  "https://www.google.com/search?q=weather",
  "https://www.google.com/search?q=alete+ai",
  "https://duckduckgo.com/?q=apple+stocks",
  "https://www.bing.com/search?q=today+news",
  "https://github.com/trending",
  "https://github.com/explore",
  "https://www.reddit.com/r/technology/",
  "https://www.reddit.com/r/privacy/",
  "https://www.amazon.com/best-sellers/zf",
  "https://www.ebay.com/globaldeals",
  "https://www.craigslist.org/about/sites",
  "https://www.yelp.com/search?find_desc=Restaurants&find_loc=San+Francisco%2C+CA",
  "https://www.booking.com/searchresults.html?ss=London",
  "https://www.expedia.com/Destinations",
  "https://www.zillow.com/homes/for_sale/",
  "https://www.redfin.com/city/17151/CA/San-Francisco",
  "https://www.realtor.com/realestateandhomes-search/San-Francisco_CA",
  "https://www.glassdoor.com/Job/san-francisco-jobs-SRCH_IL.0,13_IC1147401.htm",
  "https://www.indeed.com/q-Software-Engineer-l-San-Francisco,-CA-jobs.html",
  "https://www.linkedin.com/jobs/search/?keywords=software%20engineer",
  "https://news.ycombinator.com/",
  "https://news.ycombinator.com/show",
  "https://news.ycombinator.com/jobs",
  "https://www.producthunt.com/",
  "https://www.kickstarter.com/discover",
  "https://www.indiegogo.com/explore/all",
  "https://www.etsy.com/featured/holiday-gift-guide",
  "https://www.pinterest.com/categories/technology/",
  "https://www.quora.com/",
  "https://stackexchange.com/sites",
  "https://twitter.com/explore",
  "https://mastodon.social/explore",
  "https://www.tiktok.com/explore",
  "https://www.instagram.com/explore/",
  "https://en.wikipedia.org/wiki/Main_Page",
  "https://www.imdb.com/chart/moviemeter/",
  "https://www.goodreads.com/quotes",
  "https://weather.com/",
  "https://www.behance.net/galleries",
  "https://dribbble.com/shots",
  "https://www.artstation.com/channels/all",
  "https://store.steampowered.com/search/",
  "https://www.chess.com/play/online",
  "https://www.canva.com/templates/",
  "https://www.tripadvisor.com/Hotels",
  "https://www.imdb.com/chart/top/",
  "https://www.deviantart.com/topic/digital-art",
  "https://www.shutterstock.com/search/nature",
  "https://unsplash.com/t/nature",
  "https://www.spotify.com/us/home/",
  "https://www.roblox.com/discover",
  "https://www.behance.net/search/projects?sort=appreciations",
  "https://www.dribbble.com/popular",
  "https://vimeo.com/watch"
];

async function curate() {
  await fs.mkdir('data', { recursive: true });
  await fs.mkdir(RAW_DIR, { recursive: true });

  console.log(`🚀 Starting Auto-Curator (Powered by Local Firecrawl at ${API_URL})...`);

  const processUrl = async (url: string, prefix: string) => {
    const slug = url.replace(/https?:\/\//, '').replace(/[\/.]/g, '_').replace(/[?=&]/g, '-').slice(0, 50);
    const filename = `${prefix}_${slug}.html`;
    const filePath = path.join(RAW_DIR, filename);

    console.log(`📡 Scraping: ${url}`);
    
    try {
      const result = await app.scrape(url, { formats: ['html'] });
      
      if (result && result.html) {
        await fs.writeFile(filePath, result.html);
        console.log(`✅ Saved: ${filename}`);
      } else {
        console.warn(`⚠️  No content returned for: ${url}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed: ${url} - ${error.message}`);
    }
  };

  console.log("\n🏦 Gathering Sensitive Portals (Healthcare, Utilities, Finance)...");
  for (const url of SENSITIVE_URLS) {
    await processUrl(url, 'portal');
  }

  console.log("\n📰 Gathering Digestible Articles (Substack, Medium, Finance News)...");
  for (const url of DIGESTIBLE_URLS) {
    await processUrl(url, 'article');
  }

  console.log("\n🧹 Gathering Noise Samples...");
  for (const url of NOISE_URLS) {
    await processUrl(url, 'noise');
  }

  console.log("\n✨ Data curation complete!");
}

curate().catch(console.error);
