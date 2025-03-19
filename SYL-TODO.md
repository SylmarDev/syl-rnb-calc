3/16
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

STATUS NAME: 
export type StatusName = 'slp' | 'psn' | 'brn' | 'frz' | 'par' | 'tox';

In general
- Someday make a test suite to verify this all works
- Finish off special move cases
  - Guaranteed Atk/SpAtk drop moves
  - Protect
  - Imprison
  - Baton Pass
  - Poisoning Moves
  - Setup moves
  - Shell Smash needs revision
  - Recovery Moves
  - Sun based recovery
  - Rest
  - Taunt
  - Encore (will need an aiOption for encore incentive)
  - Counter / Mirror Coat
- Clean up TODO's
  - Add Trick Room to fields
  - Add Substitue to fields
  - Add toxic spikes to fields
  - Make multi hit moves work correctly
  - Make status category
  - Make stealth rock, spikes, and toxic spikes -20 if max layers are up
  - "Should AI Recover function"
    - will likely need to return the chance that function returns true, which will then be used as a modifier on the score of the recovery move being clicked
- Make switch % chance underneath all the moves (only make it show if its above 0, it should be a very rare case)
- Add post-ko switch in order to display (that's deterministic so it should be easier lol)