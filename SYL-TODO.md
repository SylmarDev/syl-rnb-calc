3/31
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

STATUS NAME: 
export type StatusName = 'slp' | 'psn' | 'brn' | 'frz' | 'par' | 'tox';

In general
- Someday make a test suite to verify this all works
- Finish off special move cases
  - Guaranteed Atk/SpAtk drop moves
  - Protect
  - Poisoning Moves
  - Setup moves
  - Shell Smash needs revision
  - Recovery Moves
  - Sun based recovery
  - Rest
  - Encore (will need an aiOption for encore incentive)
  - Counter / Mirror Coat
- Clean up TODO's
  - Make multi hit moves work correctly
  - Make status category
    - default to +6 if move is not in moveStringsToAdd and move is score of 0 and type of status
  - Imprison AI Option or Field toggle
  - Baton Pass must include AI Option for "Last AI Mon"
  - "Should AI Recover function"
    - will likely need to return the chance that function returns true, which will then be used as a modifier on the score of the recovery move being clicked
- Make switch % chance underneath all the moves (only make it show if its above 0, it should be a very rare case)
- Figure out something to make the Crit buttons look less ugly (Colors?)
  - Maybe show the crit rate of each move as a percentage next to the crit toggle, that way the button isn't as big. Take focus energy and high crit ratio moves into account
- Add post-ko switch in order to display (that's deterministic so it should be easier lol)
- Add a pie chart (chart.js perhaps?) that reloads and visualizes the everything for visual learners