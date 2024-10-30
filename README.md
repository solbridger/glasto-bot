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

`<PUT RESULTS IN THIS SECTION>`

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

Prequisites: `Node v20.X`

Install deps

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

### On the day

On the day, if you have obtain the exact link for the ticket page (e.g. https://glastonbury.seetickets.com/event/glastonbury-2024-deposits/worthy-farm/2500000) then
all you need to do is update the `start` command in the `package.json` file under the `scripts` section. Simply update the `--site=` value
to be the more accurate link that was found. This will help get closer to the registration page.

Note that it takes 1-2 minutes for all the browsers to spin up and go to the URL.

Also the terminal has two command shortcuts:
- `ctrl + c` this will immediately cancel the script (DON'T DO THIS, THIS IS ONLY FOR THE END WHEN THE BUYING PROCESS IS OVER TO TERMINATE THE BROWSERS)
- `enter` if a browser is successful in getting through, you can press `enter` to continue the script in the other 14. However it is probably recommended to only do that after you have successfully purhaced your first 6 and want to start the script again

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
