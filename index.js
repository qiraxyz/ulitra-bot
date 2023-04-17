const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();

// create new client
const client = new Client({
    authStrategy: new LocalAuth()
});

// config api
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// client qr code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

const fs = require('fs');
let chatData = {}; // variabel global untuk menyimpan data chat sebelumnya

client.on('message', async message => {
    if (message.body.startsWith('!chat')) {
        let prompt = message.body.slice(6);
        let context = ''; // inisialisasi variabel context untuk menyimpan konteks chat sebelumnya

        if (chatData[message.from]) { // cek apakah chatData telah ada sebelumnya untuk nomor pengirim
            const prevPrompt = chatData[message.from].prompt; // ambil prompt sebelumnya
            const prevResponse = chatData[message.from].response; // ambil response sebelumnya
            context = `${prevPrompt} ${prevResponse}`; // gabungkan prompt dan response sebelumnya sebagai konteks
        }

        const model = 'text-davinci-003';
        const minTemperature = 0.9;
        const maxTemperature = 1.0;
        const temperature = Math.random() * (maxTemperature - minTemperature) + minTemperature;
        const maxTokens = 2000;

        try {
            const response = await axios.post('https://api.openai.com/v1/engines/' + model + '/completions', {
                prompt: `${prompt} ${context}`, // gabungkan prompt baru dengan konteks chat sebelumnya
                max_tokens: maxTokens,
                temperature: temperature,
            }, {
                headers: {
                    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const text = response.data.choices[0].text.trim();

            console.log(`Prompt: ${prompt}\nResponse: ${text}`);
            await message.reply(text);

            // simpan data chat ke variabel chatData
            chatData[message.from] = {
                prompt: prompt,
                response: text,
            };

            // simpan data chat ke file JSON
            fs.writeFile('chatData.json', JSON.stringify(chatData), (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log('Chat data has been updated and saved to chatData.json');
            });

        } catch (error) {
            console.log(error);
        }
    }
});



client.initialize();
