class ChangelogLine {
    constructor(majorVersion, minorVersion, patchVersion, desc) {
        this.majorVersion = majorVersion;
        this.minorVersion = minorVersion;
        this.patchVersion = patchVersion;
        this.desc = desc;
    }
}

const CHANGELOG = [
    new ChangelogLine(1, 0, 0, "Initial Release"),
    new ChangelogLine(1, 1, 0, "Megas form switching now changes their ability, added Changelog"),
    new ChangelogLine(1, 1, 1, "Added Bulldoze to damaging speed reducing moves"),
    new ChangelogLine(1, 1, 2, "Fixed Changelog in light mode (oops, I don't test in light mode)"),
    new ChangelogLine(1, 1, 3, "Megas hold their Mega stones"),
    new ChangelogLine(1, 1, 4, "Fixed issue with several mega pokemon abilities not changing and throwing an error (thanks Jmash for finding this)"),
    new ChangelogLine(1, 2, 0, "Player multi hit moves now show kills to AI (for AI clicking prio)"),
    new ChangelogLine(1, 2, 1, "Fixed No Move being chooseable when tied with other 0 score moves"),
    new ChangelogLine(1, 2, 2, "Shell Smash AI now sees its own Focus Sash (thanks rysace)"),
    new ChangelogLine(1, 2, 3, "Fixed bug with player mega form switching not updating player calcs (thanks neverknight)"),
    new ChangelogLine(1, 2, 4, "Fixed King's Rock, and Nature's Madness not showing up in the calc due to apostrophes (thanks Berry), added Mystical Fire to Guaranteed Atk/Sp Atk drop logic"),
    new ChangelogLine(1, 2, 5, "Added Scary Face to speed reducing moves logic"),
    new ChangelogLine(1, 2, 6, "Shell Smash AI now takes player's speed into account when testing if it dies"),
    new ChangelogLine(1, 2, 7, "Leech Seed no longer clicked against grass types"),
    new ChangelogLine(1, 2, 8, "Leech Seed no longer clicked against grass types for real oops"),
    new ChangelogLine(1, 2, 9, "Parasol Lady Madeline and Camper Lawrence (Shed Shell double) show as one fight"),
    new ChangelogLine(1, 3, 0, "Search bar searches by trainer name as well, added Toggleable Box search feature, toggles stay selected in between sessions"),
    new ChangelogLine(1, 3, 1, "Grassy Glide now gets +1 Prio when it AI sees fast kill in Grassy Terrain, Self-Destruct procs AI Options to show up (thanks dylanrae)"),
    new ChangelogLine(1, 3, 2, "Mega Charizard's now update ability correctly"),
    new ChangelogLine(1, 3, 3, "Speed reducing moves now correctly observe type immunities"),
    new ChangelogLine(1, 3, 4, "Fixed issue with non-mega abilities transferring over when a different mon was chosen"),
    new ChangelogLine(1, 3, 5, "Bug Maniac Jeffrey now works as intended"),
    new ChangelogLine(1, 3, 6, "Thunder Wave no longer sees it can para Limber mons"),
    new ChangelogLine(1, 3, 7, "Morning Sun, Synthesis, and Moonlight now properly calc even out of the sun. First Impression now has first turn out checkbox"),
    new ChangelogLine(2, 0, 0, "Added Range Compare, teams on top, fixed many bugs"),
];