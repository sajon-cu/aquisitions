import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';

const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
        // Shield protects your app from common attacks such as SQL injection
        shield({ mode: 'LIVE' }),
        // Create a bot detection rule
        detectBot({
            mode: 'LIVE',
            allow: [
                'CATEGORY:SEARCH_ENGINE', // Google, Bing, etc
                'CATEGORY:PREVIEW',
                'CATEGORY:MONITOR', // Allows uptime monitors & testing tools
                'CURL', // Allows command-line / API clients like curl and Postman
            ],
        }),
        slidingWindow({
            mode: 'LIVE',
            interval: '2s',
            max: 5,
        }),
    ],
});

export default aj;
