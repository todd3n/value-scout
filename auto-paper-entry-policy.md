# Automatisk paper-entry – policy B

Value Scout får öppna **högst tre samtidiga öppna paper-positioner per installation**. Funktionen är enbart simulering och kan aldrig skapa en mäklarorder eller påverka riktiga pengar.

En position får öppnas endast när den schemalagda bakgrundskontrollen har en färsk serveranalys, relevant börs är öppen, signalen har `setup = sniper`, modellpoäng minst 70/100, datakvalitet minst 80/100, ett giltigt pris samt en dokumenterad köporsak. Signalen måste avse en nedgång högst en handelsdag gammal. Kandidater rangordnas på samma sätt som serverns scanner: setup, färskhet och nedgångens storlek.

Den virtuella beräkningen utgår från 500 000 SEK och 2 % risk per position, vilket matchar Value Scouts förvalda simulationsinställningar. Varje entry skapar både en mottagen och en fylld paper-order med ett deterministiskt order-ID, källor, målpris, stop-nivå och bevis. Samma symbol kan inte öppnas två gånger samtidigt eller automatiskt återöppnas samma marknadsdag.

Den befintliga 15-minuterskontrollen används även för entries. Den fortsätter att hantera mål, stop, signalinvalidiering och tidsutgång för öppna positioner. Automationen kan vara aktiverad eller avstängd per installation i Paper trading.
