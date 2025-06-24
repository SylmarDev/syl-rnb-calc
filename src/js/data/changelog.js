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
    new ChangelogLine(1, 2, 2, "Shell Smash AI now sees focus sash")
];