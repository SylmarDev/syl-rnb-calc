/* ============================================================
   Round Simulator — battle-round logging overlay for RnB Calc
   ============================================================ */
(function () {
    'use strict';

    // ── State ──────────────────────────────────────────────────
    var rounds = [];
    var roundCounter = 0;

    // Tracked HP state — starts from current form values, updated each round
    var trackedHP = { p1: null, p2: null }; // {current, max}

    // ── Helpers ────────────────────────────────────────────────
    function getP1Name() {
        var v = $("#p1 input.set-selector").val();
        if (!v) return 'Pokémon 1';
        return v.indexOf('(') !== -1 ? v.substring(0, v.indexOf(' (')) : v;
    }

    function getP2Name() {
        var v = $("#p2 input.set-selector").val();
        if (!v) return 'Pokémon 2';
        return v.indexOf('(') !== -1 ? v.substring(0, v.indexOf(' (')) : v;
    }

    function getP1Sprite() { return $("#p1mon").attr("src") || ""; }
    function getP2Sprite() { return $("#p2mon").attr("src") || ""; }

    function getP1Item() { return $("#p1 .item").val() || "None"; }
    function getP2Item() { return $("#p2 .item").val() || "None"; }

    function getP1Ability() { return $("#p1 .ability").val() || "None"; }
    function getP2Ability() { return $("#p2 .ability").val() || "None"; }

    function getP1Status() { return $("#p1 .status").val() || "Healthy"; }
    function getP2Status() { return $("#p2 .status").val() || "Healthy"; }

    // Read move names from the result labels (populated by performCalculations)
    function getResultMoveNames(side) {
        var prefix = side === 'L' ? 'L' : 'R';
        var names = [];
        for (var i = 1; i <= 4; i++) {
            var label = $("label[for='resultMove" + prefix + i + "']").text();
            names.push(label && label !== 'Loading...' ? label : '(No Move)');
        }
        return names;
    }

    // Read from form selectors as fallback
    function getFormMoveNames(side) {
        var prefix = side === 'L' ? '#p1' : '#p2';
        var names = [];
        for (var i = 1; i <= 4; i++) {
            var sel = $(prefix + " .move" + i + " .move-selector").val();
            names.push(sel || "(No Move)");
        }
        return names;
    }

    function getMoveNames(side) {
        var result = getResultMoveNames(side);
        if (result.every(function(n) { return n === '(No Move)'; })) {
            return getFormMoveNames(side);
        }
        return result;
    }

    function getCurrentHP(side) {
        var prefix = side === 'L' ? '#p1' : '#p2';
        return {
            current: ~~$(prefix + " .current-hp").val(),
            max: ~~$(prefix + " .max-hp").text()
        };
    }

    function initTrackedHP() {
        var p1hp = getCurrentHP('L');
        var p2hp = getCurrentHP('R');
        trackedHP.p1 = { current: p1hp.current, max: p1hp.max };
        trackedHP.p2 = { current: p2hp.current, max: p2hp.max };
    }

    function getSpeedInfo() {
        var p1spd = ~~$("#p1 .sp .totalMod").text() || ~~$("#p1 .sp .total").text();
        var p2spd = ~~$("#p2 .sp .totalMod").text() || ~~$("#p2 .sp .total").text();
        var trickRoom = $("#trickroom").prop("checked");
        var faster;
        if (p1spd === p2spd) {
            faster = 'tie';
        } else if (trickRoom) {
            faster = p1spd < p2spd ? 'p1' : 'p2';
        } else {
            faster = p1spd > p2spd ? 'p1' : 'p2';
        }
        return { p1: p1spd, p2: p2spd, trickRoom: trickRoom, faster: faster };
    }

    function getDamageInfo(sideIdx, moveIdx) {
        if (typeof damageResults === 'undefined' || !damageResults || !damageResults[sideIdx] || !damageResults[sideIdx][moveIdx]) return null;
        var r = damageResults[sideIdx][moveIdx];
        var range = r.range();
        return {
            desc: r.moveDesc(notation),
            fullDesc: r.fullDesc(notation, false),
            range: range,
            minDmg: range[0],
            maxDmg: range[1],
            kochance: r.kochance(),
            damage: r.damage
        };
    }

    // Compute crit damage by re-running calc with crit forced
    function getCritDamageInfo(sideIdx, moveIdx) {
        try {
            var p1 = createPokemon($("#p1"));
            var p2 = createPokemon($("#p2"));
            var p1field = createField();
            var p2field = p1field.clone().swap();

            var attacker, defender, field, moveSource;
            if (sideIdx === 0) {
                attacker = p1; defender = p2; field = p1field;
                moveSource = $("#p1");
            } else {
                attacker = p2; defender = p1; field = p2field;
                moveSource = $("#p2");
            }

            var moveDiv = moveSource.find(".move" + (moveIdx + 1));
            var moveName = moveDiv.find("select.move-selector").val();
            if (!moveName || moveName === '(No Move)') return null;

            var move = new calc.Move(gen, moveName, {
                ability: attacker.ability,
                item: attacker.item,
                isCrit: true,
                hits: +moveDiv.find(".move-hits").val() || undefined,
                overrides: {
                    basePower: +moveDiv.find(".move-bp").val(),
                    type: moveDiv.find(".move-type").val()
                }
            });

            var result = calc.calculate(gen, attacker, defender, move, field);
            var range = result.range();
            return {
                desc: result.moveDesc(notation),
                range: range,
                minDmg: range[0],
                maxDmg: range[1]
            };
        } catch (e) {
            return null;
        }
    }

    function getAIPercentages() {
        var pcts = [];
        for (var i = 1; i <= 4; i++) {
            pcts.push($("#resultMoveRateR" + i).text());
        }
        return pcts;
    }

    function getWeather() {
        var w = $("input:radio[name='weather']:checked").val();
        return w || 'None';
    }

    function getTerrain() {
        var t = $("input:checkbox[name='terrain']:checked").val();
        return t || 'None';
    }

    // ── Build current round data ──────────────────────────────
    function captureRoundData(p1ActionType, p1MoveIdx, p2MoveIdx, comment) {
        if (trackedHP.p1 === null) {
            initTrackedHP();
        }

        var speed = getSpeedInfo();
        var p1Moves = getMoveNames('L');
        var p2Moves = getMoveNames('R');

        var p1HPBefore = { current: trackedHP.p1.current, max: trackedHP.p1.max };
        var p2HPBefore = { current: trackedHP.p2.current, max: trackedHP.p2.max };

        var p1Action, p2Action;

        if (p1ActionType === 'switch') {
            p1Action = { type: 'switch', label: 'Switch' };
        } else {
            var dmg = getDamageInfo(0, p1MoveIdx);
            var critDmg = getCritDamageInfo(0, p1MoveIdx);
            p1Action = {
                type: 'attack',
                move: p1Moves[p1MoveIdx],
                moveIdx: p1MoveIdx,
                damage: dmg,
                critDamage: critDmg
            };
        }

        var dmg2 = getDamageInfo(1, p2MoveIdx);
        var critDmg2 = getCritDamageInfo(1, p2MoveIdx);
        p2Action = {
            type: 'attack',
            move: p2Moves[p2MoveIdx],
            moveIdx: p2MoveIdx,
            damage: dmg2,
            critDamage: critDmg2,
            aiPcts: getAIPercentages()
        };

        // Simulate HP after round using average damage
        var firstSide = (speed.faster === 'p2') ? 'p2' : 'p1';

        var p1HPAfter = p1HPBefore.current;
        var p2HPAfter = p2HPBefore.current;

        if (firstSide === 'p1') {
            if (p1Action.type === 'attack' && p1Action.damage) {
                var avgDmg = Math.round((p1Action.damage.minDmg + p1Action.damage.maxDmg) / 2);
                p2HPAfter = Math.max(0, p2HPAfter - avgDmg);
            }
            if (p2HPAfter > 0 && p2Action.damage) {
                var avgDmg2 = Math.round((p2Action.damage.minDmg + p2Action.damage.maxDmg) / 2);
                p1HPAfter = Math.max(0, p1HPAfter - avgDmg2);
            }
        } else {
            if (p2Action.damage) {
                var avgDmg2 = Math.round((p2Action.damage.minDmg + p2Action.damage.maxDmg) / 2);
                p1HPAfter = Math.max(0, p1HPAfter - avgDmg2);
            }
            if (p1HPAfter > 0 && p1Action.type === 'attack' && p1Action.damage) {
                var avgDmg = Math.round((p1Action.damage.minDmg + p1Action.damage.maxDmg) / 2);
                p2HPAfter = Math.max(0, p2HPAfter - avgDmg);
            }
        }

        trackedHP.p1.current = p1HPAfter;
        trackedHP.p2.current = p2HPAfter;

        return {
            roundNum: ++roundCounter,
            p1: {
                name: getP1Name(),
                sprite: getP1Sprite(),
                item: getP1Item(),
                ability: getP1Ability(),
                status: getP1Status(),
                hpBefore: p1HPBefore,
                hpAfter: { current: p1HPAfter, max: p1HPBefore.max },
                action: p1Action
            },
            p2: {
                name: getP2Name(),
                sprite: getP2Sprite(),
                item: getP2Item(),
                ability: getP2Ability(),
                status: getP2Status(),
                hpBefore: p2HPBefore,
                hpAfter: { current: p2HPAfter, max: p2HPBefore.max },
                action: p2Action
            },
            speed: speed,
            weather: getWeather(),
            terrain: getTerrain(),
            trickRoom: speed.trickRoom,
            comment: comment || ''
        };
    }

    // ── Rendering ─────────────────────────────────────────────
    function hpBarColor(pct) {
        var n = parseFloat(pct);
        if (n > 50) return '#4caf50';
        if (n > 20) return '#ff9800';
        return '#f44336';
    }

    function renderRoundCard(rd) {
        var speedIcon = rd.speed.trickRoom ? '🔄' : '⚡';
        var fasterLabel;
        if (rd.speed.faster === 'tie') fasterLabel = 'Speed Tie';
        else if (rd.speed.faster === 'p1') fasterLabel = rd.p1.name + ' moves first';
        else fasterLabel = rd.p2.name + ' moves first';

        var firstActor, firstSide, secondActor, secondSide;
        if (rd.speed.faster === 'p2') {
            firstActor = rd.p2; firstSide = 'p2';
            secondActor = rd.p1; secondSide = 'p1';
        } else {
            firstActor = rd.p1; firstSide = 'p1';
            secondActor = rd.p2; secondSide = 'p2';
        }

        var weatherTerrain = '';
        if (rd.weather !== 'None') weatherTerrain += '<span class="rs-tag rs-weather">' + escapeHtml(rd.weather) + '</span>';
        if (rd.terrain !== 'None') weatherTerrain += '<span class="rs-tag rs-terrain">' + escapeHtml(rd.terrain) + ' Terrain</span>';
        if (rd.trickRoom) weatherTerrain += '<span class="rs-tag rs-trickroom">Trick Room</span>';

        var commentHtml = '';
        if (rd.comment) {
            commentHtml = '<div class="rs-comment">' + escapeHtml(rd.comment) + '</div>';
        }

        var html = '' +
            '<div class="rs-round-card" data-round="' + rd.roundNum + '">' +
                '<div class="rs-round-header">' +
                    '<span class="rs-round-num">Round ' + rd.roundNum + '</span>' +
                    '<span class="rs-speed-info">' + speedIcon + ' ' + escapeHtml(fasterLabel) +
                        ' <small>(' + rd.speed.p1 + ' vs ' + rd.speed.p2 + ')</small></span>' +
                    '<div class="rs-conditions">' + weatherTerrain + '</div>' +
                    '<button class="rs-delete-round" data-round="' + rd.roundNum + '" title="Delete round">&times;</button>' +
                '</div>' +
                '<div class="rs-round-body">' +
                    '<div class="rs-action-order">' +
                        '<div class="rs-action-first">' +
                            '<div class="rs-order-label">1st</div>' +
                            renderActorAction(firstActor, firstSide, rd) +
                        '</div>' +
                        '<div class="rs-action-arrow">➜</div>' +
                        '<div class="rs-action-second">' +
                            '<div class="rs-order-label">2nd</div>' +
                            renderActorAction(secondActor, secondSide, rd) +
                        '</div>' +
                    '</div>' +
                '</div>' +
                commentHtml +
            '</div>';
        return html;
    }

    function renderActorAction(actor, side, rd) {
        var hpBeforePct = actor.hpBefore.max > 0 ? (actor.hpBefore.current / actor.hpBefore.max * 100).toFixed(1) : '100';
        var hpAfterPct = actor.hpAfter.max > 0 ? (actor.hpAfter.current / actor.hpAfter.max * 100).toFixed(1) : '100';
        var barColorBefore = hpBarColor(hpBeforePct);
        var barColorAfter = hpBarColor(hpAfterPct);
        var sideClass = side === 'p1' ? 'rs-p1' : 'rs-p2';
        var hpChanged = actor.hpBefore.current !== actor.hpAfter.current;
        var hpDiff = actor.hpBefore.current - actor.hpAfter.current;

        var actionHtml;
        if (actor.action.type === 'switch') {
            actionHtml = '<div class="rs-move-name rs-switch">↔ Switch</div>';
        } else {
            var moveName = actor.action.move;
            var dmg = actor.action.damage;
            var critDmg = actor.action.critDamage;
            var dmgText = dmg ? dmg.desc : '—';
            var koText = dmg && dmg.kochance ? dmg.kochance : '';

            var rangeHtml = '';
            if (dmg) {
                rangeHtml = '<div class="rs-damage-range">' +
                    '<span class="rs-range-label">Dmg:</span> ' +
                    dmg.minDmg + ' - ' + dmg.maxDmg +
                    '</div>';
            }

            var critHtml = '';
            if (critDmg) {
                critHtml = '<div class="rs-crit-info">⚔ Crit: ' + critDmg.minDmg + ' - ' + critDmg.maxDmg + '</div>';
            }

            actionHtml = '' +
                '<div class="rs-move-name">' + escapeHtml(moveName) + '</div>' +
                '<div class="rs-damage-text">' + escapeHtml(dmgText) + '</div>' +
                rangeHtml +
                critHtml +
                (koText ? '<div class="rs-ko-chance">' + escapeHtml(koText) + '</div>' : '');
        }

        var aiHtml = '';
        if (side === 'p2' && actor.action.aiPcts && actor.action.type === 'attack') {
            var pcts = actor.action.aiPcts;
            var hasAI = pcts.some(function(p) { return p && p !== '??%'; });
            if (hasAI) {
                aiHtml = '<div class="rs-ai-pct">AI %: ' + escapeHtml(pcts[actor.action.moveIdx] || '??%') + '</div>';
            }
        }

        var hpSimHtml = '';
        if (hpChanged) {
            hpSimHtml = '<div class="rs-hp-sim">' +
                '<div class="rs-hp-sim-label">After round:</div>' +
                '<div class="rs-hp-bar-wrap">' +
                    '<div class="rs-hp-bar" style="width:' + Math.max(0, Math.min(100, hpAfterPct)) + '%;background:' + barColorAfter + '"></div>' +
                '</div>' +
                '<div class="rs-hp-after-text">' +
                    actor.hpAfter.current + '/' + actor.hpAfter.max +
                    ' (' + hpAfterPct + '%)' +
                    ' <span class="rs-hp-diff">-' + hpDiff + '</span>' +
                '</div>' +
            '</div>';
        }

        var html = '' +
            '<div class="rs-actor ' + sideClass + '">' +
                '<div class="rs-actor-header">' +
                    (actor.sprite ? '<img class="rs-sprite" src="' + escapeHtml(actor.sprite) + '" alt="">' : '') +
                    '<div class="rs-actor-info">' +
                        '<div class="rs-actor-name">' + escapeHtml(actor.name) + '</div>' +
                        '<div class="rs-hp-bar-wrap">' +
                            '<div class="rs-hp-bar" style="width:' + Math.max(0, Math.min(100, hpBeforePct)) + '%;background:' + barColorBefore + '"></div>' +
                        '</div>' +
                        '<div class="rs-hp-text">' + actor.hpBefore.current + '/' + actor.hpBefore.max + ' (' + hpBeforePct + '%)</div>' +
                    '</div>' +
                '</div>' +
                '<div class="rs-details">' +
                    '<span class="rs-tag rs-item">🎒 ' + escapeHtml(actor.item) + '</span>' +
                    '<span class="rs-tag rs-ability">' + escapeHtml(actor.ability) + '</span>' +
                    (actor.status !== 'Healthy' ? '<span class="rs-tag rs-status">' + escapeHtml(actor.status) + '</span>' : '') +
                '</div>' +
                actionHtml +
                aiHtml +
                hpSimHtml +
            '</div>';
        return html;
    }

    function renderAllRounds() {
        var $log = $('#rs-round-log');
        if (rounds.length === 0) {
            $log.html('<div class="rs-empty">No rounds recorded yet. Use the controls above to log a round.</div>');
            return;
        }
        var html = '';
        for (var i = 0; i < rounds.length; i++) {
            html += renderRoundCard(rounds[i]);
        }
        $log.html(html);
        $log.scrollTop($log[0].scrollHeight);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Populate move selectors ───────────────────────────────
    function populateMoveOptions() {
        var p1Moves = getMoveNames('L');
        var p2Moves = getMoveNames('R');

        var $p1 = $('#rs-p1-move');
        var $p2 = $('#rs-p2-move');
        var p1Val = $p1.val();
        var p2Val = $p2.val();

        $p1.empty();
        $p2.empty();

        for (var i = 0; i < p1Moves.length; i++) {
            if (p1Moves[i] && p1Moves[i] !== '(No Move)') {
                $p1.append('<option value="' + i + '">' + escapeHtml(p1Moves[i]) + '</option>');
            }
        }
        for (var i = 0; i < p2Moves.length; i++) {
            if (p2Moves[i] && p2Moves[i] !== '(No Move)') {
                $p2.append('<option value="' + i + '">' + escapeHtml(p2Moves[i]) + '</option>');
            }
        }
        if (p1Val !== null) $p1.val(p1Val);
        if (p2Val !== null) $p2.val(p2Val);
    }

    // ── Export ─────────────────────────────────────────────────
    function exportRoundsText() {
        if (rounds.length === 0) return 'No rounds recorded.';
        var lines = [];
        lines.push('=== BATTLE ROUND LOG ===');
        lines.push('');
        for (var i = 0; i < rounds.length; i++) {
            var rd = rounds[i];
            lines.push('--- Round ' + rd.roundNum + ' ---');
            var spd = rd.speed.faster === 'tie' ? 'Speed Tie' : (rd.speed.faster === 'p1' ? rd.p1.name : rd.p2.name) + ' moves first';
            lines.push('Speed: ' + rd.speed.p1 + ' vs ' + rd.speed.p2 + ' (' + spd + (rd.trickRoom ? ', Trick Room' : '') + ')');
            if (rd.weather !== 'None') lines.push('Weather: ' + rd.weather);
            if (rd.terrain !== 'None') lines.push('Terrain: ' + rd.terrain);
            lines.push('');

            lines.push(rd.p1.name + ' [' + rd.p1.item + ' / ' + rd.p1.ability + ']');
            lines.push('  HP: ' + rd.p1.hpBefore.current + '/' + rd.p1.hpBefore.max + ' -> ' + rd.p1.hpAfter.current + '/' + rd.p1.hpAfter.max);
            if (rd.p1.action.type === 'switch') {
                lines.push('  Action: Switch');
            } else {
                lines.push('  Action: ' + rd.p1.action.move);
                if (rd.p1.action.damage) lines.push('  Damage: ' + rd.p1.action.damage.minDmg + ' - ' + rd.p1.action.damage.maxDmg);
                if (rd.p1.action.critDamage) lines.push('  Crit Damage: ' + rd.p1.action.critDamage.minDmg + ' - ' + rd.p1.action.critDamage.maxDmg);
            }
            lines.push('');

            lines.push(rd.p2.name + ' [' + rd.p2.item + ' / ' + rd.p2.ability + ']');
            lines.push('  HP: ' + rd.p2.hpBefore.current + '/' + rd.p2.hpBefore.max + ' -> ' + rd.p2.hpAfter.current + '/' + rd.p2.hpAfter.max);
            lines.push('  Action: ' + rd.p2.action.move);
            if (rd.p2.action.damage) lines.push('  Damage: ' + rd.p2.action.damage.minDmg + ' - ' + rd.p2.action.damage.maxDmg);
            if (rd.p2.action.critDamage) lines.push('  Crit Damage: ' + rd.p2.action.critDamage.minDmg + ' - ' + rd.p2.action.critDamage.maxDmg);
            if (rd.p2.action.aiPcts) lines.push('  AI %: ' + rd.p2.action.aiPcts.join(' / '));
            lines.push('');

            if (rd.comment) lines.push('Comment: ' + rd.comment);
            lines.push('');
        }
        return lines.join('\n');
    }

    // ── Event Binding ─────────────────────────────────────────
    $(document).ready(function () {
        // Toggle panel
        $('#rs-toggle-btn').on('click', function () {
            var $panel = $('#rs-panel');
            var $icon = $(this).find('.rs-toggle-icon');
            if ($panel.is(':visible')) {
                $panel.slideUp(200);
                $icon.text('▶');
            } else {
                $panel.slideDown(200);
                $icon.text('▼');
                populateMoveOptions();
            }
        });

        // Refresh move options whenever calc runs
        $(".calc-trigger").on("change keyup", function () {
            setTimeout(populateMoveOptions, 150);
        });

        // Reset tracked HP when pokemon changes
        $("#p1 .set-selector, #p2 .set-selector").on("change", function () {
            trackedHP.p1 = null;
            trackedHP.p2 = null;
            setTimeout(populateMoveOptions, 400);
        });

        // P1 action type toggle
        $('#rs-p1-action-type').on('change', function () {
            if ($(this).val() === 'switch') {
                $('#rs-p1-move').prop('disabled', true).css('opacity', 0.4);
            } else {
                $('#rs-p1-move').prop('disabled', false).css('opacity', 1);
            }
        });

        // Log round
        $('#rs-log-round').on('click', function () {
            var p1ActionType = $('#rs-p1-action-type').val();
            var p1MoveIdx = ~~$('#rs-p1-move').val();
            var p2MoveIdx = ~~$('#rs-p2-move').val();
            var comment = $('#rs-comment').val().trim();

            var rd = captureRoundData(p1ActionType, p1MoveIdx, p2MoveIdx, comment);
            rounds.push(rd);
            renderAllRounds();
            $('#rs-comment').val('');
            $('#rs-round-count').text(rounds.length);
        });

        // Delete round
        $('#rs-round-log').on('click', '.rs-delete-round', function () {
            var num = ~~$(this).data('round');
            rounds = rounds.filter(function (r) { return r.roundNum !== num; });
            recalcTrackedHP();
            renderAllRounds();
            $('#rs-round-count').text(rounds.length);
        });

        // Clear all
        $('#rs-clear-all').on('click', function () {
            if (rounds.length === 0) return;
            if (!confirm('Clear all ' + rounds.length + ' recorded rounds?')) return;
            rounds = [];
            roundCounter = 0;
            trackedHP.p1 = null;
            trackedHP.p2 = null;
            renderAllRounds();
            $('#rs-round-count').text(0);
        });

        // Export
        $('#rs-export').on('click', function () {
            var text = exportRoundsText();
            navigator.clipboard.writeText(text).then(function () {
                var $btn = $('#rs-export');
                var orig = $btn.html();
                $btn.text('Copied!');
                setTimeout(function () { $btn.html(orig); }, 1500);
            });
        });

        // Initial populate with delay to let performCalculations run first
        setTimeout(populateMoveOptions, 1000);
    });

    function recalcTrackedHP() {
        if (rounds.length > 0) {
            var last = rounds[rounds.length - 1];
            trackedHP.p1 = { current: last.p1.hpAfter.current, max: last.p1.hpAfter.max };
            trackedHP.p2 = { current: last.p2.hpAfter.current, max: last.p2.hpAfter.max };
        } else {
            trackedHP.p1 = null;
            trackedHP.p2 = null;
        }
    }
})();
