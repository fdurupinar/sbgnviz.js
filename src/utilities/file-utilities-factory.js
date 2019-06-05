/*
* File Utilities: To be used on read/write file operation
*/

var libUtilities = require('./lib-utilities');
var libs = libUtilities.getLibs();
var jQuery = $ = libs.jQuery;
var saveAs = libs.saveAs;

module.exports = function () {
 // Helper functions Start
 // see http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
 function b64toBlob(b64Data, contentType, sliceSize) {
   contentType = contentType || '';
   sliceSize = sliceSize || 512;

   var byteCharacters = atob(b64Data);
   var byteArrays = [];

   for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
     var slice = byteCharacters.slice(offset, offset + sliceSize);

     var byteNumbers = new Array(slice.length);
     for (var i = 0; i < slice.length; i++) {
       byteNumbers[i] = slice.charCodeAt(i);
     }

     var byteArray = new Uint8Array(byteNumbers);

     byteArrays.push(byteArray);
   }

   var blob = new Blob(byteArrays, {type: contentType});
   return blob;
 }

 function loadXMLDoc(fullFilePath) {
   if (window.XMLHttpRequest) {
     xhttp = new XMLHttpRequest();
   }
   else {
     xhttp = new ActiveXObject("Microsoft.XMLHTTP");
   }
   xhttp.overrideMimeType('application/xml');
   xhttp.open("GET", fullFilePath, false);
   xhttp.send();
   return xhttp.responseXML;
 }

 // Should this be exposed or should this be moved to the helper functions section?
 function textToXmlObject(text) {
   if (window.ActiveXObject) {
     var doc = new ActiveXObject('Microsoft.XMLDOM');
     doc.async = 'false';
     doc.loadXML(text);
   } else {
     var parser = new DOMParser();
     var doc = parser.parseFromString(text, 'text/xml');
   }
   return doc;
 }
 // Helper functions End

 var sbgnmlToJson, jsonToSbgnml, jsonToNwt, uiUtilities, tdToJson,
     sifToJson, graphUtilities, layoutToText, nwtToJson, jsonToSif;
 var updateGraph;
 var options, cy;

 function fileUtilities (param) {
   sbgnmlToJson = param.sbgnmlToJsonConverter;
   nwtToJson = param.nwtToJsonConverter;
   jsonToSbgnml = param.jsonToSbgnmlConverter;
   jsonToNwt = param.jsonToNwtConverter;
   jsonToSif = param.jsonToSifConverter;
   uiUtilities = param.uiUtilities;
   tdToJson = param.tdToJsonConverter;
   sifToJson = param.sifToJsonConverter;
   layoutToText = param.layoutToText;
   graphUtilities = param.graphUtilities;
   updateGraph = graphUtilities.updateGraph.bind(graphUtilities);
   options = param.optionUtilities.getOptions();
   cy = param.sbgnCyInstance.getCy();
 }

 fileUtilities.loadXMLDoc = loadXMLDoc;

 fileUtilities.saveAsPng = function(filename) {
   var pngContent = cy.png({scale: 3, full: true});

   // this is to remove the beginning of the pngContent: data:img/png;base64,
   var b64data = pngContent.substr(pngContent.indexOf(",") + 1);

   // lower quality when response is empty
   if(!b64data || b64data === ""){
     pngContent = cy.png({maxWidth: 15000, maxHeight: 15000, full: true});
     b64data = pngContent.substr(pngContent.indexOf(",") + 1);
   }

   saveAs(b64toBlob(b64data, "image/png"), filename || "network.png");
 };

 fileUtilities.saveAsJpg = function(filename) {
   var jpgContent = cy.jpg({scale: 3, full: true});

   // this is to remove the beginning of the pngContent: data:img/png;base64,
   var b64data = jpgContent.substr(jpgContent.indexOf(",") + 1);

   // lower quality when response is empty
   if(!b64data || b64data === ""){
     jpgContent = cy.jpg({maxWidth: 15000, maxHeight: 15000, full: true});
     b64data = jpgContent.substr(jpgContent.indexOf(",") + 1);
   }

   saveAs(b64toBlob(b64data, "image/jpg"), filename || "network.jpg");
 };

 fileUtilities.saveAsSvg = function(filename) {
   var svgContent = cy.svg({scale: 1, full: true});
   saveAs(new Blob([svgContent], {type:"image/svg+xml;charset=utf-8"}), filename || "network.svg");
 };

 fileUtilities.loadSample = function(filename, folderpath) {
   uiUtilities.startSpinner("load-spinner");

   // Users may want to do customized things while a sample is being loaded
   // Trigger an event for this purpose and specify the 'filename' as an event parameter
   $(document).trigger( "sbgnvizLoadSample", [ filename, cy ] ); // Aliases for sbgnvizLoadSampleStart
   $(document).trigger( "sbgnvizLoadSampleStart", [ filename, cy ] );

   // load xml document use default folder path if it is not specified
   var xmlObject = loadXMLDoc((folderpath || 'sample-app/samples/') + filename);

   setTimeout(function () {
     updateGraph(nwtToJson.convert(xmlObject));

     fileUtilities.collapseMarkedNodes();

     uiUtilities.endSpinner("load-spinner");
     $(document).trigger( "sbgnvizLoadSampleEnd", [ filename, cy ] ); // Trigger an event signaling that a sample is loaded
   }, 0);
 };

 fileUtilities.loadSIFFile = function(file, layoutBy, callback) {
   var convert = function( text ) {
     return sifToJson.convert(text);
   };

   var runLayout = function() {
     if ( layoutBy ) {
       if ( typeof layoutBy === 'function' ) {
         layoutBy();
       }
       else {
         var layout = cy.layout( layoutBy );

         // for backward compatibility need to make this if check
         if ( layout && layout.run ) {
           layout.run();
         }
       }
     }
   };

   fileUtilities.loadFile( file, convert, undefined, callback, undefined, runLayout );
 };

 fileUtilities.loadTDFile = function functionName(file, callback) {
   var convert = function( text ) {
     return tdToJson.convert(text);
   };

   fileUtilities.loadFile( file, convert, undefined, callback );
 };

 fileUtilities.loadSBGNMLFile = function(file, callback1, callback2) {
   var convert = function( text ) {
     return sbgnmlToJson.convert(textToXmlObject(text));
   };

   fileUtilities.loadFile( file, convert, callback1, callback2, fileUtilities.collapseMarkedNodes );
 };

 fileUtilities.loadNwtFile = function(file, callback1, callback2) {
   var convert = function( text ) {
     return nwtToJson.convert(textToXmlObject(text));
   };

   fileUtilities.loadFile( file, convert, callback1, callback2, fileUtilities.collapseMarkedNodes );
 };

 // collapse the nodes whose collapse data field is set
 fileUtilities.collapseMarkedNodes = function() {
   // collapse nodes
   var nodesToCollapse = cy.nodes("[collapse]");
   if (nodesToCollapse.length > 0 ){
     cy.expandCollapse('get').collapse(nodesToCollapse, {layoutBy: null});

     nodesToCollapse.forEach(function(ele, i, eles){
       ele.position(ele.data("positionBeforeSaving"));
     });
     nodesToCollapse.removeData("positionBeforeSaving");
   }
 };

 /*
   callback is a function remotely defined to add specific behavior that isn't implemented here.
   it is completely optional.
   signature: callback(textXml)
 */
 fileUtilities.loadFile = function(file, convertFcn, callback1, callback2, callback3, callback4) {
   var self = this;
   uiUtilities.startSpinner("load-file-spinner");

   var textType = /text.*/;

   var reader = new FileReader();

   reader.onload = function (e) {
     var text = this.result;

     setTimeout(function () {

       if (typeof callback1 !== 'undefined') callback1(text);

       var cyGraph;
       try {
         cyGraph = convertFcn( text );
         // Users may want to do customized things while an external file is being loaded
         // Trigger an event for this purpose and specify the 'filename' as an event parameter
         $(document).trigger( "sbgnvizLoadFile", [ file.name, cy ] ); // Aliases for sbgnvizLoadFileStart
         $(document).trigger( "sbgnvizLoadFileStart", [ file.name, cy ] );
       }
       catch (err) {
         uiUtilities.endSpinner("load-file-spinner");
         console.log(err);
         if (typeof callback2 !== 'undefined') callback2();
         return;
       }

       updateGraph(cyGraph);

       if (typeof callback3 !== 'undefined') {
         callback3();
       }

       uiUtilities.endSpinner("load-file-spinner");
       $(document).trigger( "sbgnvizLoadFileEnd", [ file.name, cy ] ); // Trigger an event signaling that a file is loaded

       if (typeof callback4 !== 'undefined') {
         callback4();
       }
     }, 0);
   };

   reader.readAsText(file);
 };

 fileUtilities.loadSBGNMLText = function(textData, tileInfoBoxes){
     setTimeout(function () {
         updateGraph(sbgnmlToJson.convert(textToXmlObject(textData)), undefined, undefined, tileInfoBoxes);
         uiUtilities.endSpinner("load-file-spinner");
     }, 0);

 };

 // supported versions are either 0.2 or 0.3
 fileUtilities.saveAsSbgnml = function(filename, version, renderInfo, mapProperties, nodes, edges) {
   var sbgnmlText = jsonToSbgnml.createSbgnml(filename, version, renderInfo, mapProperties, nodes, edges);
   var blob = new Blob([sbgnmlText], {
     type: "text/plain;charset=utf-8;",
   });
   saveAs(blob, filename);
 };

 // supported versions are either 0.2 or 0.3
 fileUtilities.saveAsNwt = function(filename, version, renderInfo, mapProperties, nodes, edges) {
   var sbgnmlText = jsonToNwt.createNwt(filename, version, renderInfo, mapProperties, nodes, edges);
   var blob = new Blob([sbgnmlText], {
     type: "text/plain;charset=utf-8;",
   });
   saveAs(blob, filename);
 };

 fileUtilities.exportLayoutData = function(filename, byName) {
   var layoutText = layoutToText.convert( byName );

   var blob = new Blob([layoutText], {
     type: "text/plain;charset=utf-8;",
   });
   saveAs(blob, filename);
 };

 fileUtilities.saveAsPlainSif = function(filename) {
   var text = jsonToSif.convert();

   var blob = new Blob([text], {
     type: "text/plain;charset=utf-8;",
   });
   saveAs(blob, filename);
 };

 fileUtilities.convertSbgnmlTextToJson = function(sbgnmlText){
     return sbgnmlToJson.convert(textToXmlObject(sbgnmlText));
 };

 fileUtilities.convertSifTextToJson = function(sifText){
        return sifToJson.convert(sifText);
 };
 
  fileUtilities.createJsonFromSBGN = function(){


    var sbgnmlText = jsonToSbgnml.createSbgnml();
    return sbgnmlToJson.convert(textToXmlObject(sbgnmlText));
};

fileUtilities.createJsonFromSif = function(){

    var sifText = jsonToSif.convert();
    return sifToJson.convert(sifText);
    
};
 
 fileUtilities.getCurrentSif = function(){
    return jsonToSif.convert();
}
 return fileUtilities;
};
