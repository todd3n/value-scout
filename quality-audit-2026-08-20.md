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
