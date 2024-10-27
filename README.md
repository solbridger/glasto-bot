# Glastonbury Ticket Helper

A fork of [glasto-helper](https://github.com/JackOHara/glasto-helper) which was
built to successfully get Glastonbury tickets in 2023 and 2024.

This updated version builds upon the original script and adds a few
improvements:

- Bumped the similarity threshold to 75%
- Improved error handling and logging of page crash errors
- Improved error handling of spawning too many tabs during the initialisation
  phase using an exponential backoff retry mechanism
- Updated `live.txt` and `test.txt` to include more accurate text for the 2025
  sale page based on the 2024 sale page
- Added `npm run` scripts to make it easier to run the scripts
- Linting fixes.

## 2025 Glastonbury Coach Sale

## Usage

This app launches chrome via puppeteer. It opens a number of browsers set by the
user. It will then iterate through each browser and load the set URL in a tab.
It will only begin loading the page on the next browser tab when a certain
amount of time has passed so it does not surpass the set rate limit (60 a minute
on glastonbury site).

After each page has loads it calculates a similarity rating by comparing the
text on the loaded page to the text in `resources/live.txt` . It is using the
inner text of all elements within the body of the returned page. The browser
will then automatically switch to the tab with the highest similarity rating.
This tab will not be reloaded until another tab beats its similarity rating.

You can pause by pressing the enter key on the command line. It should
automatically stop when the reg page loads.

`--site` : URL

`--rate-limit` : rate limit per minute

`--max-tabs` : the number of tabs to use. The more the better. A tab will reload
after the iteration of loading tabs has looped back around to it. So more tabs
means more time for a page to load.

`--test` : Will use `resources/test.txt` for comparison. For use with test site.

## To run

```
npm i
```

Example run command:

```
npm run start
```

This executes the following command:

```
node main.js --site="https://glastonbury.seetickets.com" --rate-limit=55 --max-tabs=15
```

## Testing

For testing, I am hitting a mock site I created using CRA hosted on Vercel. The
app is available at https://glasto-test-site-2025.vercel.app/. The website text
content is all based on the 2024 Glastonbury ticket sale page.

The test site has a random number generator which simulates rendering the sale
page when `Math.random()` is greater than `0.995`, which is about 1 in 200
attempts. Given the refresh rate of the main script, this should run simulate
getting through to the payment page in about 3-4 minutes on average.

To run the test:

```
npm run test
```

This executes the following command:

```
node main.js --site="https://glasto-test-site-2025.vercel.app/" --rate-limit=55 --max-tabs=15 --test
```
