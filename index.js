const prompt = require('prompt-sync')({sigint: true});
const fetch = require('node-fetch');
const PDFDocument = require('pdf-lib').PDFDocument;
const fs = require('fs');


(async () => {

    let baseUrl = prompt("Input base url:"); 

    let headers = {"token": prompt("Input token:"), "appid": "56dd9b6c1d40e68e859eedb1"};

    let pageNumber = prompt("Input page number:")
    
    console.log("Downloading pages");

    const pdfDoc = await PDFDocument.create()

    for (i = 0; i<pageNumber; i++) {
        console.log(`Downloading page ${i+1}/${pageNumber}`);

        let pageData = await fetch(baseUrl+i).then((res) => res.arrayBuffer());
        
        let pageImage = await pdfDoc.embedPng(pageData);

        let page = pdfDoc.addPage([pageImage.width, pageImage.height]);

        page.drawImage(pageImage, {
            x: 0,
            y: 0,
        });


    }

    fs.writeFile(prompt("Input file name:") + ".pdf", await pdfDoc.save(), (e)=>{});

    console.log("Saving . . .");

})();