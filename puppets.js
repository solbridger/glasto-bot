// Logger configuration
const logger = require('./log');
// Tab class for managing individual browser tabs
const Tab = require('./tab');

class Puppets {
    constructor(url, rateLimitPerMinute, registrationPageInnerText) {
        this.tabs = [];
        this.url = url;
        this.refreshRateInMs = (60 / rateLimitPerMinute) * 1000;
        this.registrationPageInnerText = registrationPageInnerText;
        this.paused = false;
        this.similarityThreshold = 80;
        this.lastHighScorer = -1;
    }

    setPaused(paused) {
        if (paused) {
            logger.info('Pausing operation. Tabs will finish their current page load.');
        } else {
            logger.info('Resuming operation.');
        }
        this.paused = paused;
    }

    getPaused() {
        return this.paused;
    }

    async initializeTabs(tabQuantity) {
        this.tabs = [];
        for (let i = 0; i < tabQuantity; i++) {
            let tab = new Tab(this.url);
            await tab.initialiseTab();
            this.tabs.push(tab);
        }
    }

    async restartTab(tabIndex) {
        await this.tabs[tabIndex].close();
        let tab = new Tab(this.url);
        this.tabs[tabIndex] = tab;
        await this.tabs[tabIndex].initialiseTab();
    }

    async closeTabs() {
        for (let i = 0; i < this.tabs.length; i++) {
            await this.tabs[i].close();
        }
    }

    calculateSimilarity(retrievedText, desiredText) {
        const retrievedTextTokens = retrievedText.replace(/(\r\n|\n|\r)/gm, '').toLowerCase().split(' ');
        const desiredTextTokens = desiredText.replace(/(\r\n|\n|\r)/gm, '').toLowerCase().split(' ');
        let countOfMatchingWords = 0;

        for (let i = 0; i < desiredTextTokens.length; i++) {
            if (retrievedTextTokens.includes(desiredTextTokens[i])) {
                countOfMatchingWords++;
            }
        }

        const score = (countOfMatchingWords / desiredTextTokens.length) * 100;
        return score;
    }

    async getHighestScoringTabIndex() {
        let highestScorer = null;
        for (let i = 0; i < this.tabs.length; i++) {
            if (highestScorer === null) {
                highestScorer = i;
                continue;
            }
            if (await this.tabs[i].getSimilarityScore() > await this.tabs[highestScorer].getSimilarityScore()) {
                highestScorer = i;
            }
        }
        return highestScorer;
    }

    async loadPagesAtRate() {
        while (true) {
            for (let i = 0; i < this.tabs.length; i++) {
                while (this.paused === true) {
                    await this.sleep(10);
                }
                if (i !== await this.getHighestScoringTabIndex() || await this.tabs[i].getSimilarityScore() === -1) {
                    if (await this.tabs[i].getReady() === true) {
                        logger.info({ tab: i, message: 'Loading page' });
                        this.tabs[i].loadPage().then(async page => {
                            logger.info({ tab: i, message: `Loaded page in ${Date.now() - this.tabs[i].getStartTime()}ms` });
                            await this.tabs[i].getInnerHtmlTextOfAllElements().then(async pageInnerHtmlText => {
                                const similarityScore = await this.calculateSimilarity(pageInnerHtmlText, this.registrationPageInnerText);
                                await this.tabs[i].setSimilarityScore(similarityScore);
                                logger.info({ tab: i, message: `${similarityScore.toFixed(2)}% similarity found` });

                                if (similarityScore > this.similarityThreshold) {
                                    this.paused = true;
                                    logger.info({ tab: i, message: `Paused operation as page with > ${this.similarityThreshold}% found` });
                                }
                                const highestScoringTab = await this.getHighestScoringTabIndex();
                                if (highestScoringTab !== this.lastHighScorer) {
                                    this.lastHighScorer = highestScoringTab;
                                    await this.tabs[highestScoringTab].bringToFront();
                                }
                                await this.tabs[i].setReady(true);
                            });
                        }).catch(async error => {
                            logger.error({ tab: i, message: error });
                            await this.tabs[i].setReady(true);
                        });

                        const finishTime = Date.now();
                        if (finishTime - this.tabs[i].getStartTime() < this.refreshRateInMs) {
                            await this.sleep(this.refreshRateInMs - (finishTime - this.tabs[i].getStartTime()));
                        }
                    } else {
                        await this.sleep(10);
                    }
                }
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Puppets;
