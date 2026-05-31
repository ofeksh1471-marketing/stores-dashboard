# RECYCLES monthly reports

מיני־סייט סטטי לדוחות חודשיים של חנויות RECYCLES.

## הרצה מקומית

מתוך תיקיית הפרויקט:

```bash
python3 -m http.server 8062
```

ואז לפתוח:

```text
http://localhost:8062/reports/
```

## כתובות קיימות

- `http://localhost:8062/reports/bikecare-7g2k4/`
- `http://localhost:8062/reports/einhorn-9x1m8/`
- `http://localhost:8062/reports/rimon-5q8t2/`
- `http://localhost:8062/reports/tobike-a91x7/`
- `http://localhost:8062/reports/217-k4p7d/`

## עדכון נתונים

מקור הנתונים המרכזי נמצא כאן:

```text
data/report-data.json
```

אפשר לעדכן אותו ידנית, או להשתמש בכלי:

```text
http://localhost:8062/tools/import.html
```

הכלי טוען את ה־JSON הקיים, מקבל קבצי CSV, ומוריד קובץ `report-data.json` מעודכן. אחרי ההורדה מחליפים את הקובץ הישן שבתיקיית `data`.

## CSV מומלץ

`campaigns.csv`

```csv
storeId,monthKey,month,name,goal,budget,impressions,interactions,clicks,leads
bikecare,2026-06,יוני 2026,רכיבות מבחן ORBEA,פניות,300,8200,420,165,12
```

`facebook.csv`

```csv
storeId,monthKey,month,newFollowers,organicReach,interactions,pageVisits,messages
bikecare,2026-06,יוני 2026,8,4200,190,76,3
```

`instagram.csv`

```csv
storeId,monthKey,month,newFollowers,organicReach,interactions,profileVisits,messages
bikecare,2026-06,יוני 2026,10,6800,340,145,5
```

`summary.csv`

```csv
storeId,monthKey,month,summaryBullets
bikecare,2026-06,יוני 2026,עלה קמפיין רכיבות מבחן; פורסם פוסט אורגני בעמוד החנות
```

## הוספת חודש חדש

כאשר מזינים `monthKey` חדש, לדוגמה `2026-07`, הכלי מוסיף דוח חדש ולא מוחק חודשים קודמים. הדרופדאון בעמוד החנות יציג את כל החודשים הקיימים.
