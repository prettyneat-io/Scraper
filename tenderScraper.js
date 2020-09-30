const request = require("request-promise");
const cheerio = require("cheerio");
const { title } = require("process");
const { get } = require("request-promise");
const axios = require("axios");
const { fstat } = require("fs");
const { isNumber } = require("util");


// MAIN PAGE
async function tScrape() {

     let outputArray = [];
    //  const result = await request.get("https://www.etenders.gov.mt/epps/quickSearchAction.do?selectedItem=quickSearchAction.do%3FsearchSelect%3D1&d-3680175-p=&searchSelect=1&T01_ps=10")
     const result = await request.get("http://127.0.0.1:5500/Index.html");
     const $ = cheerio.load(result);
     let obj = {};
     let objArray = [];
     let counter = 0;

     $('td.extra').remove();
     $(" tbody > tr > td").each((index,element) => {

        let link = $(element).find('a').attr('href');
        if(obj.Status  !== undefined){
            objArray.push(JSON.parse(JSON.stringify(obj)));
            obj = {};
        }

        const remainder = getRemainder(index, 10);
        const value = $(element).text().trim();
        obj = assignTendersToJson(remainder, obj, value, link);
     });
   
     return objArray;
}
function getRemainder(value, divisor){
    return value % divisor;
}
function assignTendersToJson(cellNumber, obj, value, link){
    switch(cellNumber){
        case 0: {
            obj.Id = value;
            break;
        }
        case 1: {
            obj.Title = value;
            obj.Link = link;
            break;
        }
        case 2: {
            obj.UniqueId = value;
            break;
        }
        case 3: {
            obj.Authority = value;
            break;
        }
        case 4: {
            obj.Info = value;
            break;
        }
        case 5: {
            obj.Deadline = value;
            break;
        }
        case 6: {
            obj.Procedure = value;
            break;
        }
        case 7: {
            obj.Notice = value;
            break;
        }
        case 8: {
            obj.HiddenCell = value;
            break;
        }
        case 9: {
            obj.Status = value;
            break;
        }


    }

    return obj;
}
async function generateHTMLFromMainJson(data,htmlArray) {
    const openingHtml = `<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>PrettyNeat| Tenders</title><link rel="stylesheet" href="css/mpstyle.css"> </head><body><div class = "header"><img src="logo.png"><div class = "innerheader"><div class="logocontainer"><h1>Pretty<span>Tenders</span></h1></div><ul class="navigation"><a><li>Home</li></a><a><li>About</li></a><a><li>Portfolio</li></a><a><li>Contact</li></a></ul></div></div></div><table id="ttable" class="center"> <thead> <tr> <th>#</th> <th>CfT Title</th><th>Page Link</th><th class="UniqueId">CfT UniqueID</th> <th class="ca">CA</th><th class="info">Info</th><th class="submission">Tender Submission Deadline</th> <th class="procedure">Procedure</th></tr></thead> <tbody> `;
    const closingHtml = `</tbody></table></div></body><footer><div class="footer"><div class="innerfooter"><div class ="logocontainer">Need Help?</div></div></footer></html>`;
    let newHtml = ``;
    // console.log(data)
    for(var i = 0; i < data.length; i++){
        // console.log(i)
        let id = data[i].Link.replace('/epps/cft/prepareViewCfTWS.do?resourceId=','');
        newHtml += '<tr>';
        newHtml += '<td class="id">'+ data[i].Id + '</td>';
        newHtml += '<td class="title"><details><summary>'+data[i].Title+'</summary>'+'<br>'+'<ul class="dropdown">'+'<li>'+'Published by:'+''+htmlArray[i].PublishedBy+'</li>'+'<br>'+'<li>'+'Deadline:'+''+htmlArray[i].Deadline+'</li>'+'<br>'+'<li>'+'Date of Publication/Invitation:'+htmlArray[i].DateOfInvitation+'</li>'+'<br>'+'<li>'+'Procedure:'+''+htmlArray[i].Procedure+'</li>'+'</details>'+'</ul>'+'</td>';
        newHtml += '<td class="link"><a target="_blank" href="/'+id+'.html">'+id+'</a></td>';
        // newHtml += '<td><a target="_blank" href="https://www.etenders.gov.mt'+data[i].Link+'">Link</a></td>';
        newHtml += '<td class="uniqueid">'+data[i].UniqueId+'</td>';
        newHtml+= '<td class="authority">' +data[i].Authority+'</td>';
        newHtml += '<td class="info">'+data[i].Info+'</td>';
        newHtml += '<td class="deadline">'+data[i].Deadline+'</td>';
        newHtml += '<td class="procedure">'+data[i].Procedure+'</td>';
        newHtml += '</tr>';
        // console.log(newHtml)
        // console.log(i)
    }
    return `${openingHtml}${newHtml}${closingHtml}`

}
async function exportHTMLFromMainJson(input){
    const fs = require("fs");
    fs.writeFile('exportmain.html', input, function(err){
        if (err){
            return console.log(err);
        }
    })
    // console.log(input)
}  
// LINKED PAGES
async function generateJsonData(link) {
    try{
        const {data} = await axios.get(link);
        //const {data} = await axios.get("https://www.etenders.gov.mt/epps/cft/prepareViewCfTWS.do?resourceId=");
        const $ = cheerio.load(data);
        let obj = {};
        let objArray = [];
        let isOffset = false;
        $("dl > dd").each((index,element) => {
           // const tendLink = $(element).text().trim()
            const value = $(element).text().trim();
            if(index === 0){ // Function happening at obj.Deadline(first field)
                const foundNumber = value.split('').find(letter => !isNaN(letter));// splits each data string in Deadline field into an array of letters and checks if there are any numbers(!isNan = is NOT not a number = a number )
                // console.log(foundNumber, value.split(''));
            
                if(!isNaN(foundNumber) && Number.isNaN(parseInt(foundNumber))){ //if the data in foundNumber is not a number isOffet = true. ParseInt is turning the data string '6' into an actual number as it is still in string state. 
                    //console.log('Found!');
                    isOffset = true;
                   
                }
            }
            let remainder = getRemainder(index, 30);
            if(isOffset) {
                remainder += 1 //meaning if isoffset= true disregard obj.Deadline. if offset is = false, generate obj.Deadline.
            }
            obj = assignLinkDataToJson(remainder, obj, value);
            // tendLinks.push(tendLink)
            if(obj.Status !== undefined){
             //if(obj.Status !== undefined){
            }
        });
        
        return obj;   
        //return tendLinks;
    }
    catch (error) {
        throw error;
    }
}; 
function getRemainder(value, divisor){          
    return value % divisor;
} 
function assignLinkDataToJson(cellNumber, obj, value){     
    switch(cellNumber){
        case 0: { 
            obj.Deadline = value;
            break;
        }
        case 1: {
            obj.NameOfAuthority = value;
            break;
        }
        case 2: {
            obj.PublishedBy = value;
            break;
        }
        case 3: {
            obj.Title = value;
            break;
        }
        case 4: {
            obj.CfTUniqueId = value;
            break;
        }
        case 5: {
            obj.EvaluationMechanism = value;
            break;
        }
        case 6: {
            obj.Description = value;
            break;
        }
        case 7: {
            obj.ProcurementType = value;
            break;
        }
        //case 8: {
            //obj.CpcCategory = value;
           // break;
        //}
        case 8: {
            obj.Directive = value;
            break;
        }
        case 9: {
            obj.Procedure = value.replace(/\s+/g, ' ').trim();
            break;
        }
        case 10: {
            obj.CftInvolves = value.replace(/\s+/g, ' ').trim();
            break;
        }
        case 11: {
            obj.CpvCodes = value.replace(/\s+/g, ' ').trim();
            break;
        }
        case 12: {
            obj.EauctionInclusion = value;
            break;
        }
        case 13: {
            obj.NUTSCodes = value;
            break;
        }
        case 14: {
            obj.AboveOrBelowThreshold = value;
            break;
        }
        case 15: {
            obj.PaymentOptions = value;
            break;
        }
        case 16: {
            obj.TimeLimitOfTenders = value;
            break;
        }
        case 17: {
            obj.DeadlineForInvitations = value;
            break;
        }
        case 18: {
            obj.ClarificationsPeriodEnd= value;
            break;
        }
        case 19: {
            obj.DocumentsUpload = value;
            break;
        }
        case 20: {
            obj.OpeningDate = value;
            break;
        }
        case 21: {
            obj.AllowNotificationRegistration = value;
            break;
        }
        case 22: {
            obj.ContractAwardedInLots = value;
            break;
        }
        case 23: {
            obj.EuFunding = value;
            break;
        }
        case 24: {
            obj.MultipleTendersAccepted = value;
            break;
        }
        case 25: {
            obj.DateOfInvitation = value;
            break;
        }
        case 26: {
            obj.TEDLinksForNotices = value;
            break;
        }
        case 27: {
            obj.DateOfAwarding = value;
            break;
        }
        case 28: {
            obj.DoesTheCallFallUnderGPP = value;
            break;
        }
        case 29: {
            obj.CertificationCheck = value;
            break;
        }
    }
    return obj;
}
async function generateJsonForEachLinkedPage(data){
    const idArray = data.map(function(value, index){
        return value.Link.replace('/epps/cft/prepareViewCfTWS.do?resourceId=', '');
    })

    let arrayOfJsonAtLinks = new Array();

    for(let i = 0; i < idArray.length; i++){
        const fullLink = 'https://www.etenders.gov.mt/epps/cft/prepareViewCfTWS.do?resourceId=' + idArray[i];
        const jsonFromLinkedPage = await generateJsonData(fullLink);
        JSON.parse(arrayOfJsonAtLinks.push(jsonFromLinkedPage));
        // console.log(idArray[i])
    }
    return arrayOfJsonAtLinks.sort();
}
async function generateHTMLPerLinkedPage(data) {
    const openinglinkedpagesHTML = '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Tender Details:</title> <link rel="stylesheet" href="url1.css"> <script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script> </head> <body> <table style="width:100%" id="urltable1" class="centre"> <thead> <tr> <th>Deadline:</th> <th>NameOfAuthority:</th> <th>PublishedBy:</th> <th>Title:</th> <th>CfTUniqueId:</th> <th>Evaluation Mechanism:</th> <th>Description:</th> <th>Procurement Type:</th> <th>Directive:</th> <th>Procedure:</th> <th>CftInvolves:</th> <th>CpvCodes:</th> <th>E-auction Inclusion:</th> <th>NUTS Codes:</th> <th>Above or Below Thres:</th> <th>Payment Options:</th> <th>Time-limit Of Tenders:</th> <th>Deadline For Invitations:</th> <th>Clarifications Period End:</th> <th>Upload of documents within the clarifications:</th> <th>Tenders Opening Date:</th> <th>Allow supplier to Register for Notifications:</th> <th>Contract awarded in Lots:</th> <th>Eu Funding:</th> <th>Multiple tenders will be accepted:</th> <th>Date of Publication/Invitation:</th> <th>TED links for published notices: </th> <th>DateOfAwarding:</th> <th>Does The Call Fall Under The GPP:</th> <th>Certification Check:</th> </tr> </thead> <tbody> '
    const closingLinkedpagesHTML = '</script> </tbody> </table> </body> </html>';
    let newHtml = "";

    let linkedHtmlPageArray = new Array(); 
    for(var i = 0; i < data.length; i++){
        // console.log(data[i])
        newHtml += '<tr>';
        newHtml += '<td>'+ data[i].Deadline + '</td>';
        newHtml += '<td>'+data[i].NameOfAuthority+'</td>';
        newHtml += '<td>'+data[i].PublishedBy+'</td>';
        newHtml+= '<td>' +data[i].Title+'</td>';
        newHtml += '<td>'+data[i].CfTUniqueId+'</td>';
        newHtml += '<td>'+data[i].EvaluationMechanism+'</td>';
        newHtml += '<td>'+data[i].Description+'</td>';
        newHtml += '<td>'+data[i].ProcurementType+'</td>';
        newHtml += '<td>'+data[i].Directive+'</td>';
        newHtml += '<td>'+data[i].Procedure+'</td>';
        newHtml += '<td>'+data[i].CftInvolves+'</td>';
        newHtml += '<td>'+data[i].CpvCodes+'</td>';
        newHtml += '<td>'+data[i].EauctionInclusion+'</td>';
        newHtml += '<td>'+data[i].NUTSCodes+'</td>';
        newHtml += '<td>'+data[i].AboveOrBelowThreshold+'</td>';
        newHtml += '<td>'+data[i].PaymentOptions+'</td>';
        newHtml += '<td>'+data[i].TimeLimitOfTenders+'</td>';
        newHtml += '<td>'+data[i].DeadlineForInvitations+'</td>';
        newHtml += '<td>'+data[i].ClarificationsPeriodEnd+'</td>';
        newHtml += '<td>'+data[i].DocumentsUpload+'</td>';
        newHtml += '<td>'+data[i].OpeningDate+'</td>';
        newHtml += '<td>'+data[i].AllowNotificationRegistration+'</td>';
        newHtml += '<td>'+data[i].ContractAwardedInLots+'</td>';
        newHtml += '<td>'+data[i].EuFunding+'</td>';
        newHtml += '<td>'+data[i].MultipleTendersAccepted+'</td>';
        newHtml += '<td>'+data[i].DateOfInvitation+'</td>';
        newHtml += '<td>'+data[i].TEDLinksForNotices+'</td>';
        newHtml += '<td>'+data[i].DateOfAwarding +'</td>';
        newHtml += '<td>'+data[i].DoesTheCallFallUnderGPP+'</td>';
        newHtml += '<td>'+data[i].CertificationCheck+'</td>';
        newHtml += '</tr>';
        //console.log(newHtml)
        //console.log(i)
        let thisPage =  `${openinglinkedpagesHTML}${newHtml}${closingLinkedpagesHTML}`;
        linkedHtmlPageArray.push(thisPage);
        
    }
    console.log(linkedHtmlPageArray)
    return linkedHtmlPageArray
     

}
// CONTRACT PAGES
async function generateContractData(contract) {
    try{
        const {data} = await axios.get(contract);
        const $ = cheerio.load(data);
        let obj = {};
        let objArray = [];
        let isOffset = false;

        $('td.extra').remove();
        

        let arrayOfContracts = new Array();    
        for(let i = 0; i < contract.length; i++){
            $("tbody > tr").each((rowIndex,row) => {  
                    var tds = $(row).find('td');
                    tds.each((tdindex, td) =>{
                    let remainder = getRemainder(tdindex, 5);
                    const value = $(td).text().trim();
                    obj = assignContractsToJson(remainder, obj, value);
                
                })
                arrayOfContracts.push(obj);
                //objArray.push(obj);
                obj = {};
            }) 
            console.log(arrayOfContracts);
            return arrayOfContracts;
        } 
    

        //console.log(objArray);
        //return objArray;   
 }
        catch (error) {
        throw error;
        }
  

}; 
async function generateForEachContractData(data){
    let contractId =   data.map(function(value, index){
        return value.Link.replace('/epps/cft/prepareViewCfTWS.do?resourceId=', '');
    })
        let arrayOfContractAtLinks = new Array();

        for(let i = 0; i < contractId.length; i++){
            const fullLink = 'https://www.etenders.gov.mt/epps/cft/listContractDocuments.do?resourceId=' + contractId[i];
            const jsonforContracts = await generateContractData(fullLink);
            JSON.parse(arrayOfContractAtLinks.push(jsonforContracts));

        }
        return arrayOfContractAtLinks;//.sort (for some reason).

    
}
async function generateHTMLPerContractPage(data) {
const openinglinkedpagesHTML = '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Tender Contract Details:</title> <link rel="stylesheet" href="url1.css"> <script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script> </head> <body> <table style="width:100%" id="urltable1" class="centre"> <thead> <tr> <th>Addendum ID</th> <th>Title</th> <th>File</th> <th>Description</th> <th>Language</th></tr> </thead> <tbody> '
const closingLinkedpagesHTML = '</script> </tbody> </table> </body> </html>';
let newHtml = "";

let contractHtmlPageArray = new Array(); 


    for(let i = 0; i < data.length; i++){
        for(let j = 0; j < data[i].length; j++){
             
        
            newHtml += '<tr>';
            newHtml += '<td>'+ data[i][j].AddendumId + '</td>';
            newHtml += '<td>'+data[i][j].Title+'</td>';
            newHtml += '<td>'+data[i][j].File+'</td>';
            newHtml+= '<td>' +data[i][j].Description+'</td>';
            newHtml += '<td>'+data[i][j].Language+'</td>';
            newHtml += '</tr>';
            //console.log(newHtml)
            //console.log(i)
        }
    
    
        // Array is pushed after the for loop ends not during as this will generate an html per row.
        let thisPage =  `${openinglinkedpagesHTML}${newHtml}${closingLinkedpagesHTML}`;
        contractHtmlPageArray.push(thisPage);
    }
    
    console.log(contractHtmlPageArray)
    return contractHtmlPageArray;
     

}
function assignContractsToJson(cellNumber,obj,value){
    switch(cellNumber){
        case 0:{
            obj.AddendumId = value.replace(/\s+/g, ' ').trim();;
        }
        case 1:{
            obj.Title = value.replace(/\s+/g, ' ').trim();;
        }
        case 2:{
            obj.File = value.replace(/\s+/g, ' ').trim();;
        }
        case 3:{
            obj.Description = value.replace(/\s+/g, ' ').trim();;
        }
        case 4:{
            obj.Language = value.replace(/\s+/g, ' ').trim();;
        }
    }
    console.log(obj);
    return obj
    
}
function getRemainder(value, divisor){          
    return value % divisor;
}

// POPULATE FILES

async function populateLinkedpagetoFile(htmlArray, mainPageJsonArray){
    let idArray = new Array();
    for(let i = 0; i < htmlArray.length; i++){
        let pageID = mainPageJsonArray[i].Link.replace('/epps/cft/prepareViewCfTWS.do?resourceId=', '')
        idArray.push(pageID);

        const fs = require("fs");
        fs.writeFile( pageID + ".html", htmlArray[i], function(err){
            if (err) {
                return console.log(err);
            }
        })
        //console.log(mainPageJsonArray[i].Link)   
        //extract title from Link above
        //store title in variable
        //use variable as filename (ie. before .html)       
    }  
}
async function populateContractstoFile(mainPageJsonArray,contractHtmlPageArray){
   
    let idArray = new Array();
    for(let i = 0; i < contractHtmlPageArray.length; i++){
        let ContractpageID = mainPageJsonArray[i].Link.replace('/epps/cft/prepareViewCfTWS.do?resourceId=', '')
        idArray.push(ContractpageID);
    
        const fs = require("fs");
        fs.writeFile( ContractpageID + "z.html", contractHtmlPageArray[i], function(err){
            if (err) {
                return console.log(err);
            }
        })
        //console.log(mainPageJsonArray[i].Link)   
        //extract title from Link above
        //store title in variable
        //use variable as filename (ie. before .html)       
    }  
} 
async function init(){ 
    //Data generation  
    const mainPageJsonArray = await tScrape();
    const eachContractedPage = await generateForEachContractData(mainPageJsonArray);
    const linkedPageArrayOfJsons =  await generateJsonForEachLinkedPage(mainPageJsonArray);
    
    //Html For The Pages
    const mainPageHtml = await generateHTMLFromMainJson(mainPageJsonArray,linkedPageArrayOfJsons);
    const contractHtmlPageArray = await generateHTMLPerContractPage(eachContractedPage);
    const linkedPageHtmlArray = await generateHTMLPerLinkedPage(linkedPageArrayOfJsons)  
    
    //export
    const exportContracts = await populateContractstoFile(mainPageJsonArray,contractHtmlPageArray);
    const exportMainPageHtml = await exportHTMLFromMainJson(mainPageHtml);
    const exportLinkedPage = await populateLinkedpagetoFile(linkedPageHtmlArray, mainPageJsonArray);
    
    
};

init();



