const dotenv = require('dotenv').config();
const express = require("express");
const calc = require("./calc");
const app = express();
const port = 3000;

/*
app.listen(port, () => {
	console.log("Server running on port 3000");
}); */

// behind a reverse proxy
app.set('trust proxy', true); 

const distStatic = express.static('dist');
const untrustedStatic = express.static('untrusted-site');

// blocking middleware
const allowedIps = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : [];
const restrictionsInPlace = allowedIps.length > 0;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    if (allowedIps.length > 0) {
        console.log(`Restricting access to the following IPs: ${allowedIps.join(', ')}`);
    } else {
        console.log("No IP restrictions are set. All connections allowed.");
    }
});

// Middleware to serve different content based on IP.
app.use((req, res, next) => {
    const userIp = req.ip;

    if (!restrictionsInPlace || allowedIps.includes(userIp)) {
        // If the IP is trusted, serve the main site.
        console.log(`Connection from trusted IP: ${userIp}. Serving main site.`);
        return distStatic(req, res, next);
    } else {
        // If the IP is not trusted, serve the untrusted site.
        console.warn(`Connection from untrusted IP: ${userIp}. Serving alternate site.`);
		return untrustedStatic(req, res, next);
    }
});

// parse application/json
app.use(express.json());

app.get("/calculate",(req, res, next) => {
	const gen = calc.Generations.get((typeof req.body.gen === 'undefined') ? 9 : req.body.gen);
	let error = "";
	if(typeof req.body.attackingPokemon === 'undefined')
		error += "attackingPokemon must exist and have a valid pokemon name\n";
	if(typeof req.body.defendingPokemon === 'undefined')
		error += "defendingPokemon must exist and have a valid pokemon name\n";
	if(error)
		throw new Error(error)
	const result = calc.calculate(
		gen,
		new calc.Pokemon(gen, req.body.attackingPokemon, req.body.attackingPokemonOptions),
		new calc.Pokemon(gen, req.body.defendingPokemon, req.body.defendingPokemonOptions),
		new calc.Move(gen, req.body.moveName),
		new calc.Field((typeof req.body.field === 'undefined') ? undefined : req.body.field)
	);
	res.json(result);
})

// app.use(express.static('dist'))
