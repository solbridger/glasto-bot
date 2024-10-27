// Logger configuration
const logger = require("./log");
// Tab class for managing individual browser tabs
const Tab = require("./tab");

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
      logger.info(
        "Pausing operation. Tabs will finish their current page load."
      );
    } else {
      logger.info("Resuming operation.");
    }
    this.paused = paused;
  }

  getPaused() {
    return this.paused;
  }

  async initializeTabs(tabQuantity) {
    this.tabs = [];
    for (let i = 0; i < tabQuantity; i++) {
      let retries = 3;
      let delay = 1000; // Start with a 1-second delay

      while (retries > 0) {
        try {
          await this.sleep(delay); // Add delay before each initialization attempt
          let tab = new Tab(this.url);
          await tab.initialiseTab();
          this.tabs.push(tab);
          logger.info({ tab: i, message: "Tab initialized successfully" });
          break; // Success, exit the retry loop
        } catch (error) {
          retries -= 1;
          if (retries === 0) {
            logger.error({
              tab: i,
              message: `Failed to initialize tab after 3 attempts: ${error}`,
            });
          } else {
            logger.warn({
              tab: i,
              message: `Tab initialization failed, retrying... (${retries} attempts left)`,
            });
            delay *= 2; // Exponential backoff
          }
        }
      }
    }
  }

  async restartTab(tabIndex) {
    try {
      await this.tabs[tabIndex].close();
    } catch (error) {
      logger.warn({
        tab: tabIndex,
        message: `Error closing tab: ${error.message}`,
      });
    }

    let retries = 3;
    while (retries > 0) {
      try {
        let tab = new Tab(this.url);
        await tab.initialiseTab();
        this.tabs[tabIndex] = tab;
        logger.info({ tab: tabIndex, message: "Tab restarted successfully" });
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          logger.error({
            tab: tabIndex,
            message: `Failed to restart tab after 3 attempts: ${error.message}`,
          });
        } else {
          logger.warn({
            tab: tabIndex,
            message: `Tab restart failed, retrying... (${retries} attempts left)`,
          });
          await this.sleep(1000 * (4 - retries)); // Increasing delay between retries
        }
      }
    }
  }

  async closeTabs() {
    for (let i = 0; i < this.tabs.length; i++) {
      await this.tabs[i].close();
    }
  }

  calculateSimilarity(retrievedText, desiredText) {
    const retrievedTextTokens = retrievedText
      .replace(/(\r\n|\n|\r)/gm, "")
      .toLowerCase()
      .split(" ");
    const desiredTextTokens = desiredText
      .replace(/(\r\n|\n|\r)/gm, "")
      .toLowerCase()
      .split(" ");
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
      if (
        (await this.tabs[i].getSimilarityScore()) >
        (await this.tabs[highestScorer].getSimilarityScore())
      ) {
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
        if (
          i !== (await this.getHighestScoringTabIndex()) ||
          (await this.tabs[i].getSimilarityScore()) === -1
        ) {
          if ((await this.tabs[i].getReady()) === true) {
            logger.info({ tab: i, message: "Loading page" });
            try {
              const page = await this.tabs[i].loadPage();
              logger.info({
                tab: i,
                message: `Loaded page in ${
                  Date.now() - this.tabs[i].getStartTime()
                }ms`,
              });
              await this.tabs[i]
                .getInnerHtmlTextOfAllElements()
                .then(async (pageInnerHtmlText) => {
                  const similarityScore = await this.calculateSimilarity(
                    pageInnerHtmlText,
                    this.registrationPageInnerText
                  );
                  await this.tabs[i].setSimilarityScore(similarityScore);
                  logger.info({
                    tab: i,
                    message: `${similarityScore.toFixed(2)}% similarity found`,
                  });

                  if (similarityScore > this.similarityThreshold) {
                    this.paused = true;
                    logger.info({
                      tab: i,
                      message: `Paused operation as page with > ${this.similarityThreshold}% found`,
                    });
                  }
                  const highestScoringTab =
                    await this.getHighestScoringTabIndex();
                  if (highestScoringTab !== this.lastHighScorer) {
                    this.lastHighScorer = highestScoringTab;
                    await this.tabs[highestScoringTab].bringToFront();
                  }
                  await this.tabs[i].setReady(true);
                });
            } catch (error) {
              if (error.message === "Page crashed!") {
                logger.error({
                  tab: i,
                  message: "Page crashed, restarting tab",
                });
                await this.restartTab(i);
                continue;
              } else {
                logger.error({
                  tab: i,
                  message: `Error loading page: ${error.message}`,
                });
              }
            } finally {
              await this.tabs[i].setReady(true);
            }

            const finishTime = Date.now();
            if (
              finishTime - this.tabs[i].getStartTime() <
              this.refreshRateInMs
            ) {
              await this.sleep(
                this.refreshRateInMs -
                  (finishTime - this.tabs[i].getStartTime())
              );
            }
          } else {
            await this.sleep(10);
          }
        }
      }
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = Puppets;
