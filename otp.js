const nodeCmd = require('node-cmd');
const express = require('express');
const axios = require('axios');
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
function runCommand(command) {
    return new Promise((resolve, reject) => {
        nodeCmd.run(command, (err, data, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}
async function main() {
    try {
        const data = await runCommand('adb shell am broadcast -a kienit2005.sms.GET_OTP');
        const logs = await runCommand('adb logcat -d | findstr "OTP"'); // Hoặc grep trên Linux
        const lines = logs.trim().split('\n');
        const lastLine = lines.reverse().find(line => line.includes('OTP'));
        const match = lastLine ? lastLine.match(/OTP:\s*(\d+)/) : null;

        if (match) {
            return match[1];
        } else {
            return '999';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
async function CreateTransID(token, accountNo, bankcode, amount, description) {
    try {
        let options = {
            method: 'GET',
            url: 'https://spayment.net/transferbank/viettelpay/create',
            data: {
                token,
                accountNo,
                bankcode,
                amount,
                description
            }
        };
        const response = await axios(options);
        const data = response.data;
        if (data.code !== '00') {
            return {
                error: true,
                message: data.message
            };
        }
        const tokenpayment = data.data.tokenpayment;
        // timeout 2s
        await delay(2000);
        const code = await main();
        if (code === '999') {
            return {
                error: true,
                message: 'Lấy OTP thất bại'
            };
        }
        console.log('OTP:', code);
        const confirmResult = await ConFimdTransID(token, tokenpayment, code);
        return confirmResult;
    } catch (error) {
        return {
            error: true,
            message: error.message
        };
    }
}
async function ConFimdTransID(token, spaytoken, code) {
    try {
        let options = {
            method: 'GET',
            url: 'https://spayment.net/transferbank/viettelpay/confirm',
            data: {
                token,
                spaytoken,
                code
            }
        };
        const response = await axios(options);
        return response.data;
    } catch (error) {
        return {
            error: true,
            message: error.message
        };
    }
}
const port = 2005;
const app = express();
app.get('/api/transfer-viettel', async (req, res) => {
    try {
        const { token, accountNo, bankcode, amount, description } = req.query;
        const result = await CreateTransID(token, accountNo, bankcode, amount, description);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
