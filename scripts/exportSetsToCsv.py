# Copyright (C) Sylvia Rothove 2025
# convert gen8.js to a csv to compare it to the trainer-battles.txt
import json
import re
import csv
import sys

class Record:
    monName = ""
    trainerName = ""
    level = -1
    move1 = ""
    move2 = ""
    move3 = ""
    move4 = ""

    class __init__():
        pass

    def toList(self):
        return [self.monName, self.trainerName, str(self.level),
                self.move1, self.move2, self.move3, self.move4]

#if __name__ != "__main__()":
    #sys.exit()

# thanks dek
def removeTrailingCommas(json_string):
    json_string = re.sub(r',\s*([]}])', r'\1', json_string)
    return json_string

with open("scripts/data/sets.json", "r", encoding="utf-8") as f:
    json_content = f.read()
    correctedJson = removeTrailingCommas(json_content)
    data = json.loads(correctedJson)

# have this throw err 
assert (isinstance(data, dict))
# free memory
del json_content
del correctedJson

# list of records
formattedData = []

for monName, monData in data.items():
    if isinstance(monData, dict):
        for trainerName, trainerData in monData.items():
            if isinstance(trainerData, dict):
                
                level = trainerData.get("level", "N/A")
                moves = trainerData.get("moves", [])

                record = [monName, trainerName, str(level)]
                record.extend(moves)

                formattedData.append(record)
                print(f"Added {trainerName}'s {monName}") # debug
    else:
        print("Loaded data not a dict")

with open('setsFromCalc.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["Pokemon", "Trainer", "Level",
                     "Move 1", "Move 2", "Move 3", "Move 4"])
    writer.writerows(formattedData)
    # one by one for debugging
    #for row in formattedData:
        #writer.writerow(row)

print("done!")