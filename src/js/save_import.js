var RNB_HP_TYPES = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];

var RNB_CURVE_FNS = {
	0: function (n) { return Math.pow(n, 3); },
	1: function (n) {
		return n <= 50 ? Math.floor(((100 - n) * Math.pow(n, 3)) / 50)
			: n <= 68 ? Math.floor(((150 - n) * Math.pow(n, 3)) / 100)
			: n <= 98 ? Math.floor(Math.floor((1911 - 10 * n) / 3) * Math.pow(n, 3) / 500)
			: Math.floor((160 - n) * Math.pow(n, 3) / 100);
	},
	2: function (n) {
		return n < 15 ? Math.floor((Math.floor((n + 1) / 3) + 24) * Math.pow(n, 3) / 50)
			: n <= 36 ? Math.floor((n + 14) * Math.pow(n, 3) / 50)
			: Math.floor((Math.floor(n / 2) + 32) * Math.pow(n, 3) / 50);
	},
	3: function (n) { return Math.floor((6 * Math.pow(n, 3)) / 5) - 15 * n * n + 100 * n - 140; },
	4: function (n) { return Math.floor((4 * Math.pow(n, 3)) / 5); },
	5: function (n) { return Math.floor((5 * Math.pow(n, 3)) / 4); },
};

function saveImportExpRequired(species, level) {
	return RNB_CURVE_FNS[RNB_CURVES[species - 1]](level);
}

function saveImportCalcLevel(exp, species) {
	var level = 1;
	while (level < 100 && exp >= saveImportExpRequired(species, level + 1)) level++;
	return level;
}

function saveImportGetHP(ivs) {
	var t = Math.floor(((ivs[0] % 2) + 2 * (ivs[1] % 2) + 4 * (ivs[2] % 2) + 8 * (ivs[5] % 2) + 16 * (ivs[3] % 2) + 32 * (ivs[4] % 2)) * 5 / 21);
	return RNB_HP_TYPES[t];
}

function saveImportGetNature(hn, pid) {
	return hn === 26 ? RNB_NATURES[pid % 25] : RNB_NATURES[hn];
}

function saveImportGetAbility(species, alt) {
	var cur = RNB_ABILITIES[species * 3 + alt];
	return cur === 'None' ? RNB_ABILITIES[species * 3] : cur;
}

var RNB_PSEL = [
	[0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2], [0, 2, 3, 1], [0, 3, 2, 1],
	[1, 0, 2, 3], [1, 0, 3, 2], [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
	[1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2], [2, 3, 0, 1], [3, 2, 0, 1],
	[1, 2, 3, 0], [1, 3, 2, 0], [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
];

function saveImportDecodeBoxMon(view, off) {
	var pid = view.getUint32(off, true) >>> 0;
	var otid = view.getUint32(off + 4, true) >>> 0;
	var flags = view.getUint8(off + 19);
	if (flags & 1 || !(flags & 2) || flags & 4) return null;
	var key = (pid ^ otid) >>> 0;
	var stored = view.getUint16(off + 28, true) >>> 0;
	var sum = 0;
	var raw = [];
	for (var s = 0; s < 4; s++) {
		var base = off + 32 + s * 12;
		raw[s] = [
			(view.getUint32(base, true) >>> 0) ^ key,
			(view.getUint32(base + 4, true) >>> 0) ^ key,
			(view.getUint32(base + 8, true) >>> 0) ^ key,
		];
		for (var w = 0; w < 3; w++) sum += (raw[s][w] & 0xFFFF) + (raw[s][w] >>> 16);
	}
	if ((sum & 0xFFFF) !== stored) return null;
	var sel = RNB_PSEL[pid % 24];
	var sub = sel.map(function (i) { return raw[i]; });
	var g = sub[0], a = sub[1], mi = sub[3];
	var ivWord = mi[1] >>> 0;
	return {
		pid: pid, otid: otid,
		species: g[0] & 0xFFFF,
		item: (g[0] >>> 16) & 0xFFFF,
		exp: g[1],
		moves: [
			a[0] & 0xFFFF, (a[0] >>> 16) & 0xFFFF,
			a[1] & 0xFFFF, (a[1] >>> 16) & 0xFFFF,
		],
		ivs: [
			(ivWord >>> 1) & 31, (ivWord >>> 6) & 31, (ivWord >>> 11) & 31,
			(ivWord >>> 21) & 31, (ivWord >>> 26) & 31, (ivWord >>> 16) & 31,
		],
		hiddenNature: (g[2] >>> 16) & 0x1F,
		abilitySlot: (mi[2] >>> 29) & 3,
		partyLevel: view.getUint8(off + 84),
		hp: view.getUint16(off + 86, true),
		maxHP: view.getUint16(off + 88, true),
	};
}

function saveImportIsReal(m) {
	if (!m || m.species === 0 || m.species >= RNB_MONS.length) return false;
	var i;
	for (i = 0; i < 4 && m.moves[i] === 0; i++);
	if (i === 4) return false;
	for (i = 0; i < 4 && m.moves[i] !== 0 && m.moves[i] >= RNB_MOVES.length; i++);
	if (i === 4) return false;
	if (m.exp > saveImportExpRequired(m.species, 100)) return false;
	return true;
}

function saveImportConcatBlocks(blocks) {
	var total = blocks.length * 0xF80;
	var out = new Uint8Array(total);
	for (var i = 0; i < blocks.length; i++) out.set(blocks[i], i * 0xF80);
	return out;
}

function parseSave(bytes) {
	var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	var sectors = [];
	for (var p = 0; p < Math.floor(bytes.length / 0x1000); p++) {
		var base = p * 0x1000;
		if ((view.getUint32(base + 0xFF8, true) >>> 0) === 0x8012025) {
			sectors.push({ id: view.getUint16(base + 0xFF4, true) >>> 0, counter: view.getUint32(base + 0xFFC, true) >>> 0, base: base });
		}
	}
	if (!sectors.length) return null;
	var maxCounter = Math.max.apply(null, sectors.map(function (s) { return s.counter; }));
	var blocks = {};
	for (var i = 0; i < sectors.length; i++) {
		var s = sectors[i];
		if (s.counter === maxCounter) blocks[s.id] = bytes.subarray(s.base, s.base + 0xF80);
	}
	var sb1Ids = [1, 2, 3, 4], storageIds = [5, 6, 7, 8, 9, 10, 11, 12, 13];
	var sb1Arr = [], storageArr = [];
	for (i = 0; i < sb1Ids.length; i++) {
		if (!blocks[sb1Ids[i]]) return null;
		sb1Arr.push(blocks[sb1Ids[i]]);
	}
	for (i = 0; i < storageIds.length; i++) {
		if (!blocks[storageIds[i]]) return null;
		storageArr.push(blocks[storageIds[i]]);
	}
	var sb1 = saveImportConcatBlocks(sb1Arr);
	var storage = saveImportConcatBlocks(storageArr);
	var sv = new DataView(sb1.buffer), st = new DataView(storage.buffer);

	var mons = { party: [], box: [] };
	var partyCount = Math.min(sv.getUint32(0x234, true) >>> 0, 6);
	for (i = 0; i < partyCount; i++) {
		var m = saveImportDecodeBoxMon(sv, 0x238 + i * 100);
		if (saveImportIsReal(m)) { m.src = 'party'; mons.party.push(m); }
	}
	for (i = 0; i < 120; i++) {
		var off = 4 + i * 80;
		if ((st.getUint32(off, true) >>> 0) === 0) continue;
		m = saveImportDecodeBoxMon(st, off);
		if (saveImportIsReal(m)) { m.src = 'box'; mons.box.push(m); }
	}
	return mons;
}

function monToShowdown(m) {
	var name = RNB_MONS[m.species - 1] !== undefined ? RNB_MONS[m.species - 1] : '#' + m.species;
	var item = m.item && RNB_ITEMS[m.item - 1] ? ' @ ' + RNB_ITEMS[m.item - 1] : '';
	var level = m.src === 'party' ? m.partyLevel : saveImportCalcLevel(m.exp, m.species);
	var nature = saveImportGetNature(m.hiddenNature, m.pid);
	var ability = saveImportGetAbility(m.species, m.abilitySlot);
	var lines = [
		name + item,
		'Ability: ' + ability,
		'Level: ' + level,
		nature + ' Nature',
		'IVs: ' + m.ivs[0] + ' HP / ' + m.ivs[1] + ' Atk / ' + m.ivs[2] + ' Def / '
			+ m.ivs[3] + ' SpA / ' + m.ivs[4] + ' SpD / ' + m.ivs[5] + ' Spe',
	];
	for (var j = 0; j < 4; j++) {
		var mv = RNB_MOVES[m.moves[j]];
		if (mv === undefined || mv === '') continue;
		lines.push(mv === 'Hidden Power' ? '- Hidden Power ' + saveImportGetHP(m.ivs) : '- ' + mv);
	}
	return lines.join('\n');
}

function parseSaveToShowdownText(bytes) {
	var mons = parseSave(bytes);
	if (!mons) return null;
	var all = mons.party.concat(mons.box);
	if (!all.length) return '';
	return all.map(monToShowdown).join('\n\n') + '\n\n';
}
