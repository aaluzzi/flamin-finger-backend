const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(cors({
    origin: 'https://flamin-finger.netlify.app',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

const User = require('./models/user');

app.get('/login', (req, res) => {
	res.redirect(
		`https://discord.com/oauth2/authorize?response_type=code&client_id=${process.env.DISCORD_CLIENT_ID}&scope=identify&redirect_uri=${process.env.DISCORD_REDIRECT_URI}&prompt=consent`
	);
});

app.get('/api/callback', async (req, res, next) => {
	try {
		const code = req.query['code'];
		const tokenResponse = await axios.post(
			'https://discord.com/api/oauth2/token',
			new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID,
				client_secret: process.env.DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				redirect_uri: process.env.DISCORD_REDIRECT_URI,
				code: code,
			}),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);

		const userDataResponse = await axios.get('https://discord.com/api/v10/users/@me', {
			headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
		});

		const user = {
			id: userDataResponse.data.id,
			username: userDataResponse.data.username,
			name: userDataResponse.data.global_name,
		};

		const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

        res.redirect(`${process.env.FRONTEND_URL}/?token=${accessToken}`);
	} catch (err) {
		return next(err);
	}
});

app.get('/api/user', authenticateToken, async (req, res) => {
	let user = await User.findOne({ discordId: req.user.id }).lean().select('-_id -__v');
	if (!user) {
		user = req.user;
        user.touchHighscore = null;
        user.mouseHighscore = null;
	}
	res.json(user);
});

app.get('/api/scores/mouse', async (req, res) => {
    try {
        const users = await User.find({ mouseHighscore: { $ne: null } })
            .lean()
            .sort({ mouseHighscore: -1 })
            .limit(20)
            .select('username mouseHighscore mouseHighscoreDate -_id');

        const transformedUsers = users.map(user => ({
            username: user.username,
            highscore: user.mouseHighscore,
            highscoreDate: user.mouseHighscoreDate
        }));

        res.json(transformedUsers);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/scores/touch', async (req, res) => {
    try {
        const users = await User.find({ touchHighscore: { $ne: null } })
            .lean()
            .sort({ touchHighscore: -1 })
            .limit(20)
            .select('username touchHighscore touchHighscoreDate -_id');

        const transformedUsers = users.map(user => ({
            username: user.username,
            highscore: user.touchHighscore,
            highscoreDate: user.touchHighscoreDate
        }));

        res.json(transformedUsers);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/submit/mouse', authenticateToken, async (req, res) => {
    const score = Number(req.headers['score']);
    if (score && score > 0 && score <= 99) {
        await User.findOneAndUpdate(
            { discordId: req.user.id },
            {
                discordId: req.user.id,
                username: req.user.username,
                name: req.user.name,
                mouseHighscore: score,
                mouseHighscoreDate: new Date(),
                $setOnInsert: { 
                    touchHighscore: null,
                    touchHighscoreDate: null
                }
            },
            { upsert: true }
        );

        res.sendStatus(200);
    } else {
        res.status(400).send('Invalid score');
    }
});

app.post('/submit/touch', authenticateToken, async (req, res) => {
    const score = Number(req.headers['score']);
    if (score && score > 0 && score <= 99) {
        await User.findOneAndUpdate(
            { discordId: req.user.id },
            {
                discordId: req.user.id,
                username: req.user.username,
                name: req.user.name,
            	touchHighscore: score,
                touchHighscoreDate: new Date(),
                $setOnInsert: { 
                    mouseHighscore: null,
                    mouseHighscoreDate: null
                }
            },
            { upsert: true }
        );

        res.sendStatus(200);
    } else {
        res.status(400).send('Invalid score');
    }
});

function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (token == null) {
		return res.sendStatus(401);
	}

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
		if (err) {
			return res.sendStatus(403);
		}
		req.user = user;
		next();
	});
}

app.listen(process.env.PORT, () => {
	console.log(`Listening on ${process.env.PORT}`);
});
