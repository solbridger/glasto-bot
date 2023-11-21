#!/usr/bin/env node

const readline = require('readline');
const yargs = require('yargs');
const fs = require('fs');
const util = require('util');
// Puppets Custom class
const Puppets = require('./puppets');
// Logger configuration
const logger = require('./log');

const argv = yargs.argv;
const readFile = util.promisify(fs.readFile);


function parseArgs() {
    if (!(argv['site'] && argv['rate-limit'] && argv['max-tabs'])) {
        logger.info('Usage:\nnode main.js --site="localhost:3000" --rate-limit=60 --max-tabs=10');
        process.exit(0);
    }
    return argv;
}

async function readFileAsString(filePath) {
    try {
        const data = await readFile(filePath, 'utf8');
        return data;
    } catch (error) {
        logger.error(`Error reading file: ${error.message}`);
        throw error;
    }
}

async function getRegistrationPageInnerText() {
    if (argv['test'] && argv['test'] !== 'false') {
        return await readFileAsString('resources/test.txt');
    } else {
        return await readFileAsString('resources/live.txt');
    }
}

async function run() {
    parseArgs();
    const registrationPageInnerText = await getRegistrationPageInnerText();
    const tabs = new Puppets(argv['site'], argv['rate-limit'], registrationPageInnerText);

    // Pause/resume by pressing enter
    readline.emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            tabs.closeTabs().then(() => {
                process.exit(0);
            }).catch(error => {
                logger.error(`Error closing tabs: ${error.message}`);
                process.exit(1);
            });
        } else if (key.name === 'enter') {
            tabs.setPaused(!tabs.getPaused());
        }
    });

    await tabs.initializeTabs(argv['max-tabs']);
    await tabs.loadPagesAtRate();
}

run();
