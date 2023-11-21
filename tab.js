const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(pluginStealth());
// Logger configuration
const logger = require('./log');

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
        logger.info('Spawning new tab');
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const pages = await this.browser.pages();
        this.page = pages.pop();
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
            waitUntil: 'networkidle2',
            timeout: 30000
        });
    }

    async getInnerHtmlTextOfAllElements() {
        let innerHtmlTextOfAllElements = '';
        const options = await this.page.$$('body *');
        for (const option of options) {
            const label = await this.page.evaluate(el => el.innerText, option);
            if (label !== undefined && label.length > 0) {
                innerHtmlTextOfAllElements += label.trim() + ' ';
            }
        }
        return innerHtmlTextOfAllElements;
    }

    async evaluateSelector(selector) {
        const result = await this.page.evaluate(selector);
        return result || '';
    }

    getStartTime() {
        return this.startTime;
    }
}

module.exports = Tab;
