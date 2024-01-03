const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

const User = require('./models/user');

app.get('/login', (req, res) => {
	res.redirect(
		`https://discord.com/oauth2/authorize?response_type=code&client_id=${process.env.DISCORD_CLIENT_ID}&scope=identify&redirect_uri=${process.env.REDIRECT_URI}&prompt=consent`
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
				redirect_uri: process.env.REDIRECT_URI,
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
            name: userDataResponse.data.global_name
        };

        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

		res.json({token: accessToken});
	} catch (err) {
		return next(err);
	}
});

app.get('/api/user', authenticateToken, async (req, res) => {
	let user = await User.findOne({discordId: req.user.id}).lean().select('-_id -__v');;
	if (!user) {
		user = req.user;
	}
	res.json(user);
});

app.post('/submit', authenticateToken, async (req, res) => {
    const score = Number(req.headers['score']);
    if (score && score > 0 && score < 999) {
		await User.findOneAndUpdate({discordId: req.user.id}, {
			discordId: req.user.id,
			username: req.user.username,
			name: req.user.name,
			highscore: score,
			highscoreDate: new Date(),
		}, {upsert: true});

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
