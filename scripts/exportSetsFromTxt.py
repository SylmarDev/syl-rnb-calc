# Copyright (C) Sylvia Rothove 2025
# convert trainer-battles.txt to a csv to compare it to the setsFromCalc.csv

import csv

# importing from other script was causing problems
class Record:
    monName = ""
    trainerName = ""
    level = -1
    move1 = ""
    move2 = ""
    move3 = ""
    move4 = ""

    def __init__(self, mn, tn, l, m1 = "", m2 = "", m3 = "", m4 = ""):
        self.monName = mn
        self.trainerName = tn
        self.level = l
        self.move1 = m1
        self.move2 = m2
        self.move3 = m3
        self.move4 = m4

    def toList(self):
        return [self.monName, self.trainerName, str(self.level),
                self.move1, self.move2, self.move3, self.move4]

# takes a character to find and a list of strings
def findFirstElementWithChar(c, li):
    # c is a char "["
    # li is a list of strings
    i = 0
    for item in li:
        if c in item:
            return i
        i += 1

    return -1

sets = [] # list of sets'
trainerName = ""

with open("scripts/data/Trainer Battles.txt", "r", encoding="utf-8") as f:
    line = f.readline()
    while (line != ""):
        lineSplitByWhitespace = line.split(' ')

        if len(lineSplitByWhitespace) < 2 or "Lv." not in lineSplitByWhitespace[1]:
            if line.strip() != "~":
                trainerName = line.strip()
            
            line = f.readline()
            continue
        
        startSlice = 2

        if "@" in lineSplitByWhitespace[2]:
            startSlice = findFirstElementWithChar(":", lineSplitByWhitespace) + 1

        # get end slice
        endSlice = findFirstElementWithChar("[", lineSplitByWhitespace)

        if endSlice == 2:
            line = f.readline()
            continue

        moves = [move.strip() for move in " ".join(lineSplitByWhitespace[startSlice:endSlice]).split(",")]

        level = lineSplitByWhitespace[1].split(".")[1]

        while len(moves) < 4:
            moves.append("")

        sets.append(Record(lineSplitByWhitespace[0], trainerName, level, moves[0], moves[1], moves[2], moves[3]))
        
        # DEBUG
        #for moveset in sets:
            #print(moveset.toList())

        # print(sets[len(sets)-1].toList())
        
        # TODO: replace with line = f.readline()
        line = f.readline()

print("done reading, now writing...")

with open("scripts/data/setsFromTrainerBattlesTxt.csv", 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["Pokemon", "Trainer", "Level",
                     "Move 1", "Move 2", "Move 3", "Move 4"])
    for moveset in sets:
        row = moveset.toList()
        # print(f"writing {row}") # DEBUG
        writer.writerow(row)

print("done!")