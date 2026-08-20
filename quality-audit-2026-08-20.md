# Value Scout – produktionsgranskning 20 augusti 2026

## Observerade förbättringspunkter

- Vid uppstart visas tidigare scannerresultat medan den nya 300-symbolersgenomgången är pågående. Detta är bra för kontinuitet, men resultat som väntar på att ersättas behöver märkas tydligare som **senaste sparade resultat** för att inte uppfattas som färsk data.
- Den synliga LRCX-raden innehöll den tidigare datumetiketten `19 aug. (i dag)` medan den nya körningen var på 7 %. Produktions-API:t hade redan returnerat korrektare datumlogik i föregående kontroll, vilket indikerar att klienten behöver tydligare hantering av delvis uppdaterade scannerresultat.
- Statusytan visar genomgångsprocent, men saknar förklaring av att signaler och data kan bytas under pågående omgång. En explicit rad för delresultat och aktuell datakvalitet behövs.
- Grundfunktionerna är tillgängliga och scannerflödet startar, men full genomgång av 300 symboler behöver följas upp med slutresultat, felutfall och mobil kontroll.

## Paper trading och portfölj

Paper trading laddar den sparade orderjournalen och visar att bakgrundsbevakningen är aktiv. Den historiska LRCX-ordern återger dock den lagrade relativa formuleringen `19 aug. (i dag)` även när den visas en senare dag. Eftersom en beslutsjournal ska fungera som revisionsunderlag bör den visa ett absolut datum eller formulera att den relativa etiketten gällde vid tidpunkten för beslutet.

Portföljvyn har ett tydligt tomläge och de centrala fälten är tillgängliga. För att undvika ogiltiga eller svårtolkade innehav behöver tilläggsflödet dessutom ge direkt återkoppling om okänd ticker/fondkod, saknad kurs och huruvida kursvärdet kommer från liveanalysen eller det angivna snittpriset.

## Bygg och förhandsvisning

Den lokala källfilen `index.html` hade tidigare ersatts av referenser till en gammal byggartefakt, vilket gjorde att en ny Vite-build inte kunde köras. Ingången har återställts till `src/main.tsx`, byggkonfigurationen har låsts till GitHub Pages-sökvägen `/value-scout/`, och den temporära Vite Preview-domänen har tillåtits för visuell kontroll. Detta påverkar inte den publika applikationens säkerhetsmodell utan endast den lokala förhandsvisningen.

Den byggda klienten laddar nu korrekt från `/value-scout/` och visar den nya liveverifieringsräknaren. Den tillfälliga förhandsvisningsdomänen kan inte hämta publika marknadsdata eftersom datatjänstens CORS-regler endast tillåter den riktiga GitHub Pages-domänen. Det är avsiktligt och bevarar API-skyddet; slutlig dataverifiering ska därför göras efter GitHub Pages-publiceringen.

## GitHub Pages-publicering

Kvalitetsrundan publicerades till `gh-pages` i commit `ab8f996`. Den första kontrollen från den publika adressen visade att den föregående klientversionen fortfarande serverades medan den nya genomgången hade börjat. Nästa kontroll ska bekräfta GitHub Pages-källgren och distributionsstatus innan uppgiften markeras som liveverifierad.

GitHub Pages-konfigurationen använder `main`, inte `gh-pages`. Därför synkroniserades den testade committen även till `main` i commit `6142d2b`. Den publika klienten visar nu korrekt den nya märkningen **BLANDAD DATA**, antal liveverifierade resultat och etiketten **SPARAT RESULTAT** för den äldre LRCX-raden. Konsolen är utan JavaScript-fel. Under den första genomgången returnerade batchanrop fallbackdata, vilket är korrekt märkt men ska utredas för att öka andelen liveverifierade signaler.

En direkt kontroll från samma publika webborigin mot scan-API:t returnerade HTTP 200 och analysdata för NKE, UNP och RTX. Detta betyder att API:t är nåbart och att den tydliga fallbackmärkningen fungerar som skydd mot en osäker batch. Nästa sidaomladdning och genomgång kontrolleras för att säkerställa att klienten därefter räknar dessa svar som liveverifierade.

Efter att den onödiga `Cache-Control`-headern togs bort svarade den publika scannern med **3 liveverifierade** resultat i den första batchen. Paper trading visar även att en sparad signal måste liveverifieras innan den kan användas för en ny order. Äldre journalposter visar nu absolut datum, men en gammal etikett renderades som `19 aug. (19 aug. 2026)`; den sista formateringsrättningen ska ersätta hela kombinationen i stället för att enbart ersätta den relativa parentesen.
