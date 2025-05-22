# TODO:
(last updated 5/22)
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
  - Triple Axel
  - Protect
  - Shell Smash
  - Coil, Bulk Up, Calm Mind, Quiver Dance, non-Ghost Curse
  - Contrary

In general
- Someday make a test suite to verify this all works
- On Highest Damage calcs, ties go to the higher ranked move based on the order of moves
- Finish off special move cases
  - Sun based recovery
  - Flame Charge (no, there's no docs or consensus on the score, but they can click it sometimes when its slower. I'd assume similar AI for speed control)
  - Sleep Talk (-20 if awake, no idea what it is if asleep. I guess I assume +6)
- Clean up TODO's
  - Grass Whistle (and probably many similar status applying moves) still get +6 if their target is statused. Use playerHasStatusCond to filter those moves out that apply non-volatile status conditions
  - Damaging Speed Reduction and Damaging Atk/SpAtk go if score is 0, but they can get kill bonuses so that's not always true. Look into how to fix that
- Make switch % chance underneath all the moves (only make it show if its above 0, it should be a very rare case)
- Make a <span> tag that shows up to explain certain decisions in small italics when certain moves are on the enemy side to easier understand
- Crit buttons should automatically set to clicked on Guaranteed Crit moves (Frost Breath, Super Luck+Scope Lens+Air Slash)
- Figure out something to make the Crit buttons look less ugly (Colors?)
  - Maybe show the crit rate of each move as a percentage next to the crit toggle, that way the button isn't as big. Take focus energy and high crit ratio moves into account
- Add post-ko switch in order to display (this is deterministic EXCEPT for guaranteed crit cases, then it rolls for that instead of going off of max roll)
- Add a pie chart (chart.js perhaps?) that reloads and visualizes the everything for visual learners
- In between the two calcs show what the screen would look like
  - will require backsprites, etc
- Add in the survival chance calculator that I have the python program for (that'll take a while)
- Code cleanup for maintainability
  - remove scripts folder
  - refactor the pushes to moveStringsToAdd all throughout ``ai.ts``, sub that for a function 

## COMMUNITY SUGGESTIONS
- Remove items button (set your box to have all items (none))
- Toggleable button group for...
  - Sitrus berry button, burn tick button, poison tick button
- A way to show min roll and max rolls (draw more attention to them?)
- A way to show crit rolls along with noncrit rolls together
- All stat boosts being horizontal and closer to the top so its easier to press


## IMPORTANT NOTES:

STATUS NAME: 
export type StatusName = 'slp' | 'psn' | 'brn' | 'frz' | 'par' | 'tox';

sets are kept in gen8.js

sets in gen8.js and Trainer Battles.txt have the same move order in every case I could see. (testing this was done in scripts folder, that can safely be deleted or backed up somewhere)