# Helg- och marknadsdagskontroll – 22 augusti 2026

Den publika Value Scout-klienten laddade den nya klientfilen och visade korrekt färskhetsrad: `Senaste dagliga börsdata: 21 aug. 2026 · helg, nästa dagliga börsdata kommer nästa handelsdag`.

Det publika API:t returnerade för WMT den korrekta etiketten `-9,2 % 20 aug. (för 1 handelsdag sedan)` samt `marketDataLabel: 21 aug. 2026`. Under en pågående scanneromgång var WMT däremot markerad som liveverifierad i UI:t men visade fortfarande den gamla etiketten `i går`. Detta visar att den kvarvarande bristen finns i klientens uppdaterings-/sammanfogningsflöde, inte i produktionens API-formattering.

Scanneromgången stoppades och startades på nytt efter att API-distributionen bekräftats. Under de första sekunderna visas alla tidigare analyser som `SPARAT RESULTAT`, vilket är avsiktligt tills symbolernas nya batchsvar kommer tillbaka. Den fortsatta kontrollen ska därför vänta in WMT:s färska batch innan resultatet bedöms.

Slutlig kontroll med klientfilen `index-Dim0WTq0.js` bekräftade att **alla tre synliga sparade signaler** — JD.L, WMT och SSAB-A.ST — nu visar `20 aug. (för 1 handelsdag sedan)` i stället för `i går`. Den publika klienten visar dessutom marknadsdataraden med `21 aug. 2026` och helgförklaringen redan innan en färsk batch har slutförts.
