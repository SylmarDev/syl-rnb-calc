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
    new ChangelogLine(1, 1, 0, "Megas form switching now changes their ability, added Changelog")
]