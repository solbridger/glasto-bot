const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
puppeteer.use(pluginStealth());
const logger = require("./log");

class Tab {
  constructor(url) {
    this.url = url;
    this.page = null;
    this.browser = null;
    this.innerHtmlText = null;
    this.similarityScore = -1;
    this.ready = false;
    this.startTime = null;
  }

  getReady() {
    return this.ready;
  }

  setReady(ready) {
    this.ready = ready;
  }

  getSimilarityScore() {
    return this.similarityScore;
  }

  setSimilarityScore(similarityScore) {
    this.similarityScore = similarityScore;
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  async initialiseTab() {
    logger.info("Spawning new tab");
    this.browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--enable-experimental-web-platform-features",
        "--disable-infobars"
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    const pages = await this.browser.pages();
    this.page = pages.pop();

    // Add a random delay to prevent the server detecting the bot
    await this.page.waitFor(Math.random() * 1500);

    // Add a normal looking user agent to prevent the server detecting the bot
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.70 Safari/537.36"
    );

    // Add a fake webdriver property to prevent the server detecting the bot
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-UK', 'en']
      });
    });

    // Add some normal looking hardware details to prevent the server detecting the bot
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => Math.floor(Math.random() * 8) + 2,
      });
      Object.defineProperty(navigator, "deviceMemory", {
        get: () => Math.floor(Math.random() * 32) + 2,
      });
    });

    // Do a random mouse move to prevent the server detecting the bot
    await this.page.mouse.move(Math.random() * 100, Math.random() * 100);

    this.ready = true;
  }

  async close() {
    await this.browser.close();
    return await this.page.close();
  }

  async loadPage() {
    this.startTime = Date.now();
    await this.setReady(false);
    return await this.page.goto(this.url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
  }

  async getInnerHtmlTextOfAllElements() {
    let innerHtmlTextOfAllElements = "";
    const options = await this.page.$$("body *");
    for (const option of options) {
      const label = await this.page.evaluate((el) => el.innerText, option);
      if (label !== undefined && label.length > 0) {
        innerHtmlTextOfAllElements += label.trim() + " ";
      }
    }
    return innerHtmlTextOfAllElements;
  }

  async evaluateSelector(selector) {
    const result = await this.page.evaluate(selector);
    return result || "";
  }

  getStartTime() {
    return this.startTime;
  }
}

module.exports = Tab;
