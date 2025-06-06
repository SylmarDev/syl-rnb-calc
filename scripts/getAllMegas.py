# Copyright (C) Sylvia Rothove 2025
# export a file with all megas and their abilities for their non-mega form

import csv

class Record:
    trainerName = ""
    monName = ""
    ability = ""

    def __init__(self, tn, mn, a):
        self.trainerName = tn
        self.monName = mn
        self.ability = a

    def toList(self):
        return [self.trainerName, self.monName, self.ability]

def findFirstElementWithChar(c, li):
    # c is a char "["
    # li is a list of strings
    i = 0
    for item in li:
        if c in item:
            return i
        i += 1

    return -1

records = []

with open("scripts/data/Trainer Battles.txt", "r", encoding="utf-8") as f:
    line = f.readline()
    while (line != ""):
        lineSplitByWhitespace = line.split(' ')

        if len(lineSplitByWhitespace) < 2 or "Lv." not in lineSplitByWhitespace[1]:
            if line.strip() != "~":
                trainerName = line.strip()
            
            if "[" in trainerName:
                splitByBrace = trainerName.split("[")
                trainerName = splitByBrace[0].strip()
                if "Elite Four" in trainerName and "Double" in splitByBrace[1]:
                    trainerName += "Double"

            line = f.readline()
            continue
        
        # print(lineSplitByWhitespace[2])
        
        if "ite:" in lineSplitByWhitespace[2] and "Eviolite" not in lineSplitByWhitespace[2]:
            monName = lineSplitByWhitespace[0]
            startSlice = findFirstElementWithChar("[", lineSplitByWhitespace)
            natureAndAbility = " ".join(lineSplitByWhitespace[startSlice:])
            ability = natureAndAbility.split("|")[1][:-2]
            records.append(Record(trainerName, monName, ability))
            print(f"{trainerName}'s Mega {monName}, base ability: {ability}") # DEBUG

        line = f.readline()

print("\n\ndone reading, now writing")

with open("scripts/data/megaBaseForms.csv", 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["Trainer Name", "Pokemon", "Ability"])

    for mega in records:
        writer.writerow(mega.toList())

print("done!")