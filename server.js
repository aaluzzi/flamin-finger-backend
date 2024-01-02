const express = require('express');
const axios = require('axios');

const app = express();

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
		res.json(userDataResponse.data);
	} catch (err) {
		return next(err);
	}
});

app.listen(process.env.PORT, () => {
	console.log(`Listening on ${process.env.PORT}`);
});
