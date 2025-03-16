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


- Make the checkbox that appears to ask for special conditions (i.e First Turn Out, used for Stealth Rocks, Spikes, TSpikes, Sticky Web, Fake Out, etc.)

STATUS NAME: 
export type StatusName = 'slp' | 'psn' | 'brn' | 'frz' | 'par' | 'tox';

In general
- Someday make a test suite to verify this all works
- Finish off special move cases
- Clean up TODO's
  - Add Trick Room to fields
  - Create aiSeesKill (:456 of ai.ts)
- Add post-ko switch in order to display (that's deterministic so it should be easier lol)