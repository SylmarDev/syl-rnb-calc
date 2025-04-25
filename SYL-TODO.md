4/24
TODO:
- Test The Following:
  - Future Sight
  - Stealth Rock
  - Sticky Web
  - Spikes, Toxic Spikes
  - AI Options generally
  - Tailwind
  - Fake Out
  - Final Gambit
  - Terrain moves
  - Explosion
  - Imprison
  - Baton Pass
  - Taunt
  - Encore
  - Toxic
  - Setup moves
  - Guaranteed Atk/SpAtk drop moves
  - Multi-Hit Moves
  - Counter / Mirror Coat
  - Reflect / Light Screen
  - Super Fang / Nature's Madness

STATUS NAME: 
export type StatusName = 'slp' | 'psn' | 'brn' | 'frz' | 'par' | 'tox';

In general
- Someday make a test suite to verify this all works
- Finish off special move cases
  - Protect
    - needs several AI options
  - Coil, Bulk Up, Calm Mind, Quiver Dance, non-Ghost Curse
  - Shell Smash needs revision
    - needs to call the calc to see if it lives after white herb
  - Contrary Edge Cases
  - Sun based recovery
  - Flame Charge (no, there's no docs or consensus on the score, but they can click it sometimes)
- Clean up TODO's
  - +6/+8's are happening on all the same entry. If Move1 and Move2 are both highest damage, they create one entry that's "Move1:6/Move2:6..." and one entry that's "Move1:8/Move2:8...". That needs to be changed for edge cases to break down into all possible lines. (i.e. it should look like 4 entries where Move1:6/Move2:6, Move1:6/Move2:8, Move1:8/Move2:6, Move1:8/Move2:8)
  - Damaging Speed Reduction and Damaging Atk/SpAtk go if score is 0, but they can get kill bonuses so that's not always true. Look into how to fix that
- Make switch % chance underneath all the moves (only make it show if its above 0, it should be a very rare case)
- Make a <span> tag that shows up to explain certain decisions in small italics when certain moves are on the enemy side to easier understand
- Crit buttons should automatically set to clicked on Guaranteed Crit moves (Frost Breath, Super Luck+Scope Lens+Air Slash)
- Figure out something to make the Crit buttons look less ugly (Colors?)
  - Maybe show the crit rate of each move as a percentage next to the crit toggle, that way the button isn't as big. Take focus energy and high crit ratio moves into account
- Add post-ko switch in order to display (this is deterministic EXCEPT for guaranteed crit cases, then it rolls for that instead of going off of max roll)
- Add a pie chart (chart.js perhaps?) that reloads and visualizes the everything for visual learners
- Add in the survival chance calculator that I have the python program for (that'll take a while)

Community suggestions
- Remove items button (set your box to have all items (none))
- Toggleable button group for...
  - Sitrus berry button, burn tick button, poison tick button
- A way to show min roll and max rolls (draw more attention to them?)
- A way to show crit rolls along with noncrit rolls together
- All stat boosts being horizontal and closer to the top so its easier to press