const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-core');
const args = require('args');
args
    .option('hostname', 'host/ip of the ubquity')
    .option('username', 'Username')
    .option('password', 'Password')
    .option('headless', 'Run chrome in headless mode', true)
    .option('dbusername', 'Database username', 'pi')
    .option('dbpassword', 'Database password', 'test')
    .option('dbhostname', 'Database hostname', 'smarty4')
    .option('dbdatabase', 'Database database', 'ubnt')

const flags = args.parse(process.argv, {
    mri: {
        boolean: ['headless']
    }
});
const baseurl = `http://${flags.hostname}`;
const timeout = 2 * 60 * 1000;    //minutes to wait after navigation of a big page

(async () => {
    //Load the browser
    // const browser = await puppeteer.launch({ headless: flags.headless, args: ['--start-maximized'], executablePath: 'chromium-browser' });
    const browser = await puppeteer.launch({ headless: flags.headless, args: ['--start-maximized'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setDefaultNavigationTimeout(timeout);

    //Go to the ubiquity login page
    await page.goto(baseurl, {
        waitUntil: 'networkidle2'
    });

    //Type in the username and password and click login
    await page.evaluate((u, p) => {
        document.querySelector('#username').value = u;
        document.querySelector('#password').value = p;
        document.querySelector('body > table > tbody > tr:nth-child(3) > td > input[type=submit]').click();
    }, flags.username, flags.password);
    //Wait for the click to process
    await page.waitForNavigation({ timeout: timeout });
    //Give some time for the javascript to load on the page
    await page.waitForSelector('#canvas0 > div.legend > table > tbody > tr:nth-child(1) > td.legendLabel');
    //Now that the numbers have shown up some take time to populate
    await page.waitFor(10000);
    //Grab the data
    let data = await page.evaluate(() => {
        let o = new Object();
        o.model = document.querySelector('#devmodel').textContent.trim();
        o.name = document.querySelector('#hostname').textContent.trim();
        o.mode = document.querySelector('#netmode').textContent.trim();
        o.ssid = document.querySelector('#essid').textContent.trim();
        o.security = document.querySelector('#security').textContent.trim();
        o.version = document.querySelector('#fwversion').textContent.trim();
        o.uptime = document.querySelector('#uptime').textContent.trim();
        o.channel = document.querySelector('#channel').textContent.trim();
        o.frequency = document.querySelector('#frequency').textContent.trim().split(' ')[0];
        o.frequency_start = document.querySelector('#freqstart').textContent.trim();
        o.frequency_stop = document.querySelector('#freqstop').textContent.split(' ')[0].trim();
        o.distance = document.querySelector('#ack').textContent.split(' ')[0].trim();
        o.chains = document.querySelector('#chains').textContent.trim();
        o.txpower = document.querySelector('#txpower').textContent.split(' ')[0].trim();
        o.antenna = document.querySelector('#antenna').textContent.replace('dBi', '').trim();
        o.wlan0_mac = document.querySelector('#ifinfo > div:nth-child(1) > span.value').textContent.trim();
        o.lan0_mac = document.querySelector('#ifinfo > div:nth-child(2) > span.value').textContent.trim();
        o.lan0_link = document.querySelector('#ifinfo > div:nth-child(3) > span.value').textContent.split('Mbps')[0].trim();
        o.ap_mac = document.querySelector('#apmac').textContent.trim();
        o.signal_strength = document.querySelector('#signal').textContent.split(' ')[0].trim();
        o.signal_horizontal = document.querySelector('#signal_0').textContent.trim();
        o.signal_vertical = document.querySelector('#signal_1').textContent.trim();
        o.noise_floor = document.querySelector('#noisef').textContent.split(' ')[0].trim();
        o.ccq = document.querySelector('#ccq').textContent.split(' ')[0].trim();
        o.txrate = document.querySelector('#txrate').textContent.split(' ')[0].trim();
        o.rxrate = document.querySelector('#rxrate').textContent.split(' ')[0].trim();
        o.airmax = document.querySelector('#polling').textContent.trim();
        o.priority = document.querySelector('#pollprio').textContent.trim();
        o.quality = document.querySelector('#amq').textContent.split(' ')[0].trim();
        o.capacity = document.querySelector('#amc').textContent.split(' ')[0].trim();
        o.airselect = document.querySelector('#airselect').textContent.trim();
        o.connections = document.querySelector('#count').textContent.trim();
        //bottom charts need some math help
        function speed_convert(str) {
            let res = Number(str.replace(/[^0-9\.]+/g, ""));
            //see if we need to convert kbps to mbps
            if (str.includes('kbps')) {
                //divide the number by 1000
                res /= 1000.0;
            } else if (str.includes('Mbps')) {
                //Do nothing, unit we want
            } else if (str.includes('bps')) {
                //bytes, divide by a ton for mbps units
                res /= 1000000.0;
            }
            return res;
        }
        o.wlan0_rx = speed_convert(document.querySelector('#canvas0 > div.legend > table > tbody > tr:nth-child(1) > td.legendLabel').textContent.trim());
        o.wlan0_tx = speed_convert(document.querySelector('#canvas0 > div.legend > table > tbody > tr:nth-child(2) > td.legendLabel').textContent.trim());
        o.wlan0_tx = speed_convert(document.querySelector('#canvas1 > div.legend > table > tbody > tr:nth-child(1) > td.legendLabel').textContent.trim());
        o.wlan0_tx = speed_convert(document.querySelector('#canvas1 > div.legend > table > tbody > tr:nth-child(2) > td.legendLabel').textContent.trim());

        return o;
    });
    // console.log(data);

    //insert it
    const options = {
        client: 'mysql2',
        connection: {
            host: flags.dbhostname,
            user: flags.dbusername,
            password: flags.dbpassword,
            database: flags.dbdatabase
        }
    };
    const knex = require('knex')(options);

    let paramString = "";
    for (let v of Object.keys(data)) {
        paramString += "`" + v + "`,";
    }
    //last one chop off the comma 
    paramString = paramString.substring(0, paramString.length - 1);

    let valueString = "";
    for (let v of Object.values(data)) {
        if (isNaN(v)) {
            valueString += "'" + v + "',";
        } else if (v == "") {
            valueString += "NULL,";
        } else {
            valueString += v + ",";
        }

    }
    //last one chop off the comma 
    valueString = valueString.substring(0, valueString.length - 1);

    let sql = `INSERT INTO ubnt (${paramString}) VALUES (${valueString})`;

    // console.log(sql);

    await knex.raw(sql).then(
        () => console.log(`Inserted successfully`)
    ).catch((err) => { console.log(err); throw err })
        .finally(() => {
            knex.destroy();
        });

    //Logout regardless
    await page.evaluate(() => {
        document.querySelector('body > table > tbody > tr.menu > td:nth-child(2) > input[type=button]').click();
    });
    //Wait for the click to process
    await page.waitForNavigation({ timeout: timeout });
    //I'm done
    process.exit(0);

})();