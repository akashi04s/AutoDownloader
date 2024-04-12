// ==UserScript==
// @name         Auto Downloader
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Auto Downloader For File-upload,StreamTape,Vidoza,DropGalaxy,upFiles
// @author       Akashi
// @license      OpenSource
// @match        https://dropgalaxy.com/*
// @match        *://*/*
// @match        *://*/recaptcha/*
// @exclude      *blogspot.*
// @icon         https://www.google.com/s2/favicons?domain=dropgalaxy.com
// @match        *://*/recaptcha/*
// @connect      engageub.pythonanywhere.com
// @connect      engageub1.pythonanywhere.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==
//https://www.file-upload.org/2b76hmirx74p
(function() {
    'use strict';

    var currentURL = checkCurrentWebsite();
        ///AutoSolver ()




        var solved = false;
        var checkBoxClicked = false;
        var waitingForAudioResponse = false;
        //Node Selectors
        const CHECK_BOX = ".recaptcha-checkbox-border";
        const AUDIO_BUTTON = "#recaptcha-audio-button";
        const PLAY_BUTTON = ".rc-audiochallenge-play-button .rc-button-default";
        const AUDIO_SOURCE = "#audio-source";
        const IMAGE_SELECT = "#rc-imageselect";
        const RESPONSE_FIELD = ".rc-audiochallenge-response-field";
        const AUDIO_ERROR_MESSAGE = ".rc-audiochallenge-error-message";
        const AUDIO_RESPONSE = "#audio-response";
        const RELOAD_BUTTON = "#recaptcha-reload-button";
        const RECAPTCHA_STATUS = "#recaptcha-accessible-status";
        const DOSCAPTCHA = ".rc-doscaptcha-body";
        const VERIFY_BUTTON = "#recaptcha-verify-button";
        const MAX_ATTEMPTS = 5;
        var requestCount = 0;
        var recaptchaLanguage = qSelector("html").getAttribute("lang");
        var audioUrl = "";
        var recaptchaInitialStatus = qSelector(RECAPTCHA_STATUS) ? qSelector(RECAPTCHA_STATUS).innerText : ""
        var serversList = ["https://engageub.pythonanywhere.com","https://engageub1.pythonanywhere.com"];
        var latencyList = Array(serversList.length).fill(10000);
        //Check for visibility && Click the check box
        function isHidden(el) {
            return(el.offsetParent === null)
        }

        async function getTextFromAudio(URL) {
            var minLatency = 100000;
            var url = "";

            //Selecting the last/latest server by default if latencies are equal
            for(let k=0; k< latencyList.length;k++){
                if(latencyList[k] <= minLatency){
                    minLatency = latencyList[k];
                    url = serversList[k];
                }
            }

            requestCount = requestCount + 1;
            URL = URL.replace("recaptcha.net", "google.com");
            if(recaptchaLanguage.length < 1) {
                console.log("Recaptcha Language is not recognized");
                recaptchaLanguage = "en-US";
            }
            console.log("Recaptcha Language is " + recaptchaLanguage);

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: "input=" + encodeURIComponent(URL) + "&lang=" + recaptchaLanguage,
                timeout: 60000,
                onload: function(response) {
                    console.log("Response::" + response.responseText);
                    try {
                        if(response && response.responseText) {
                            var responseText = response.responseText;
                            //Validate Response for error messages or html elements
                            if(responseText == "0" || responseText.includes("<") || responseText.includes(">") || responseText.length < 2 || responseText.length > 50) {
                                //Invalid Response, Reload the captcha
                                console.log("Invalid Response. Retrying..");
                            } else if(qSelector(AUDIO_SOURCE) && qSelector(AUDIO_SOURCE).src && audioUrl == qSelector(AUDIO_SOURCE).src && qSelector(AUDIO_RESPONSE)
                                      && !qSelector(AUDIO_RESPONSE).value && qSelector(AUDIO_BUTTON).style.display == "none" && qSelector(VERIFY_BUTTON)) {
                                qSelector(AUDIO_RESPONSE).value = responseText;
                                qSelector(VERIFY_BUTTON).click();
                            } else {
                                console.log("Could not locate text input box")
                            }
                            waitingForAudioResponse = false;
                        }

                    } catch(err) {
                        console.log(err.message);
                        console.log("Exception handling response. Retrying..");
                        waitingForAudioResponse = false;
                    }
                },
                onerror: function(e) {
                    console.log(e);
                    waitingForAudioResponse = false;
                },
                ontimeout: function() {
                    console.log("Response Timed out. Retrying..");
                    waitingForAudioResponse = false;
                },
            });
        }


        async function pingTest(url) {
            var start = new Date().getTime();
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: "",
                timeout: 8000,
                onload: function(response) {

                    if(response && response.responseText && response.responseText=="0") {
                        var end = new Date().getTime();
                        var milliseconds = end - start;

                        // For large values use Hashmap
                        for(let i=0; i< serversList.length;i++){
                            if (url == serversList[i]) {
                                latencyList[i] = milliseconds;
                            }
                        }
                    }
                },
                onerror: function(e) {
                    console.log(e);
                },
                ontimeout: function() {
                    console.log("Ping Test Response Timed out for " + url);
                },
            });
        }


        function qSelectorAll(selector) {
            return document.querySelectorAll(selector);
        }

        function qSelector(selector) {
            return document.querySelector(selector);
        }



        if(qSelector(CHECK_BOX)){
            qSelector(CHECK_BOX).click();
        } else if(window.location.href.includes("bframe")){
            for(let i=0; i< serversList.length;i++){
                pingTest(serversList[i]);
            }
        }

        //Solve the captcha using audio
        var startInterval = setInterval(function() {
            try {
                if(!checkBoxClicked && qSelector(CHECK_BOX) && !isHidden(qSelector(CHECK_BOX))) {
                    //console.log("checkbox clicked");
                    qSelector(CHECK_BOX).click();
                    checkBoxClicked = true;
                }
                //Check if the captcha is solved
                if(qSelector(RECAPTCHA_STATUS) && (qSelector(RECAPTCHA_STATUS).innerText != recaptchaInitialStatus)) {
                    solved = true;
                    console.log("SOLVED");
                    clearInterval(startInterval);
                }
                if(requestCount > MAX_ATTEMPTS) {
                    console.log("Attempted Max Retries. Stopping the solver");
                    solved = true;
                    clearInterval(startInterval);
                }
                if(!solved) {
                    if(qSelector(AUDIO_BUTTON) && !isHidden(qSelector(AUDIO_BUTTON)) && qSelector(IMAGE_SELECT)) {
                        // console.log("Audio button clicked");
                        qSelector(AUDIO_BUTTON).click();
                    }
                    if((!waitingForAudioResponse && qSelector(AUDIO_SOURCE) && qSelector(AUDIO_SOURCE).src
                        && qSelector(AUDIO_SOURCE).src.length > 0 && audioUrl == qSelector(AUDIO_SOURCE).src
                        && qSelector(RELOAD_BUTTON)) ||
                       (qSelector(AUDIO_ERROR_MESSAGE) && qSelector(AUDIO_ERROR_MESSAGE).innerText.length > 0 && qSelector(RELOAD_BUTTON) &&
                        !qSelector(RELOAD_BUTTON).disabled)){
                        qSelector(RELOAD_BUTTON).click();
                    } else if(!waitingForAudioResponse && qSelector(RESPONSE_FIELD) && !isHidden(qSelector(RESPONSE_FIELD))
                              && !qSelector(AUDIO_RESPONSE).value && qSelector(AUDIO_SOURCE) && qSelector(AUDIO_SOURCE).src
                              && qSelector(AUDIO_SOURCE).src.length > 0 && audioUrl != qSelector(AUDIO_SOURCE).src
                              && requestCount <= MAX_ATTEMPTS) {
                        waitingForAudioResponse = true;
                        audioUrl = qSelector(AUDIO_SOURCE).src
                        getTextFromAudio(audioUrl);
                    }else {
                        //Waiting
                    }
                }
                //Stop solving when Automated queries message is shown
                if(qSelector(DOSCAPTCHA) && qSelector(DOSCAPTCHA).innerText.length > 0) {
                    console.log("Automated Queries Detected");
                    clearInterval(startInterval);
                }
            } catch(err) {
                console.log(err.message);
                console.log("An error occurred while solving. Stopping the solver.");
                clearInterval(startInterval);
            }
        }, 5000);











///websitedata

    var dropgalaxypage1 = false;
    var dropgalaxypage2 = false;
    function checkCurrentWebsite() {
      currentURL = window.location.href;
      return currentURL;
    }

    /////DropGalaxy page 1
    var ads_button1 = "button-0";
    var btnClickDonwnload1 = "method_free";
    var btnClickDonwnload2 = "downloadbtn";
    var btnClickDonwnload3 = "dl";
    if (currentURL.includes("dropgalaxy") ||currentURL.includes("financemonk")   ){


        var copyLinkElement = document.getElementById("copylink");

        if (copyLinkElement) {
            // Define a function to close the window and trigger click event
            function closeWindowAndClick() {
                // Close the window


                // Trigger click event
                copyLinkElement.click();

            }

            // Wait for 10 seconds before executing the function
            setTimeout(closeWindowAndClick, 10000); // 10000 milliseconds = 10 seconds
        } else {
            // Element doesn't exist
            console.log("Element with ID 'copylink' not found.");
        }



///show ads
// var scriptElement = document.createElement('script');
// scriptElement.type = 'text/javascript';
// scriptElement.textContent = `
//     var atOptions = {
//         'key' : '50d11e7ecc2c61cfd9808aa3a6eb644f',
//         'format' : 'iframe',
//         'height' : 60,
//         'width' : 468,
//         'params' : {}
//     };
//     var scriptElement = document.createElement('script');
//     scriptElement.type = 'text/javascript';
//     scriptElement.async = true;
//     scriptElement.src = "https://beliefnormandygarbage.com/50d11e7ecc2c61cfd9808aa3a6eb644f/invoke.js";

//     var mainAreaElement = document.getElementById("a-ads5");

//     var parentNode = mainAreaElement.parentNode;
//   parentNode.insertBefore(scriptElement, mainAreaElement);

//     `;

// var mainAreaElement = document.getElementById("a-ads5");
// if (mainAreaElement) {
//   var parentNode = mainAreaElement.parentNode;
//   parentNode.insertBefore(scriptElement, mainAreaElement);

// } else {
//     console.error("Element with id 'a-ads5' galaxydrop page 3  not found.");
// }

// var mainAreaElement1 = document.getElementById("row");
// if (mainAreaElement1) {
//   var parentNode1 = mainAreaElement1.parentNode;
//   parentNode1.insertBefore(scriptElement, mainAreaElement1);

// } else {
//     console.error("Element with id 'row' galaxydrop page 2  not found.");
// }



/////show adsss



    let intervalId = setInterval(() => {
     if (document.getElementById(ads_button1)){
        document.getElementById(ads_button1).click();
     }
     if (document.getElementById(btnClickDonwnload1)){
         if (dropgalaxypage1 == false){
           document.getElementById(btnClickDonwnload1).click();
             dropgalaxypage1 = true;
         }
         //dfrom

    }

    }, 1000);


        /////DropGalaxy page 2
        var pageLoaded = false;
        if (dropgalaxypage2 == false){

            if (document.getElementById(ads_button1)){
                  document.getElementById(ads_button1).click();
                }
                const downloadIntervalId = setInterval( () => {
                var downloadButton = document.getElementById(btnClickDonwnload2);
                if(downloadButton) {
                    if (!document.readyState || document.readyState === 'complete' && pageLoaded ) {
                    dropgalaxypage2 = true;
                    downloadButton.click();
                    clearInterval(intervalId);

                    }
                } else {
                    console.log("Download button not found!");
                }
                if (document.getElementById(ads_button1)){
                    document.getElementById(ads_button1).click();
                 }
            }

            , 5000)
            window.addEventListener('load', function() {
                pageLoaded = true;
            });


        }

        ////dropgalaxy page 3
        if (document.getElementById(btnClickDonwnload3)){


            const PAGE_3_IDENTIFIER = 'url'
            const downloadBtn = document.getElementById(PAGE_3_IDENTIFIER)
            const url = downloadBtn.value
            // This is false when popups are blocked
            const didWindowOpen = window.open(url, '_self');

            if (!didWindowOpen) {
                downloadBtn.click()
            }
        }

        ////showads galaxy drop


        //row
    }
      /////File-Upload page 1
    if (currentURL.includes("babup.com")){
        document.getElementById("proceed").click();
    }
    if (currentURL.includes("file-upload")) {
        // Find the link with id "proceed"
       var freeDownloadButton = document.querySelector('input[name="method_free"]');
       var LastDownLoad = document.getElementById( "download-btn");

          if (freeDownloadButton) {
              // Simulate a click event on the button

                freeDownloadButton.click();

            } else {
              console.log('Free Download button not found!');
          }
        if (LastDownLoad){
            LastDownLoad.click();
        }
       ///ADS HERE before_file_desc
//         if (document.getElementById("before_file_desc")){
// var scriptElement = document.createElement('script');
// scriptElement.type = 'text/javascript';
// scriptElement.textContent = `
//     var atOptions = {
//         'key' : '50d11e7ecc2c61cfd9808aa3a6eb644f',
//         'format' : 'iframe',
//         'height' : 60,
//         'width' : 468,
//         'params' : {}
//     };
//     var scriptElement = document.createElement('script');
//     scriptElement.type = 'text/javascript';
//     scriptElement.async = true;
//     scriptElement.src = "https://beliefnormandygarbage.com/50d11e7ecc2c61cfd9808aa3a6eb644f/invoke.js";

//     var mainAreaElement = document.getElementById("before_file_desc");

//     var parentNode = mainAreaElement.parentNode;
//   parentNode.insertBefore(scriptElement, mainAreaElement);

//     `;

// var mainAreaElement = document.getElementById("before_file_desc");
// if (mainAreaElement) {
//   var parentNode = mainAreaElement.parentNode;
//   parentNode.insertBefore(scriptElement, mainAreaElement);

// } else {
//     console.error("Element with id 'before_file_desc' galaxydrop page 3  not found.");
// }}
///page 2
// if (document.getElementById("F1")){
// var scriptElement1 = document.createElement('script');
// scriptElement1.type = 'text/javascript';
// scriptElement1.textContent = `
//     var atOptions = {
//         'key' : '50d11e7ecc2c61cfd9808aa3a6eb644f',
//         'format' : 'iframe',
//         'height' : 60,
//         'width' : 468,
//         'params' : {}
//     };
//     var scriptElement = document.createElement('script');
//     scriptElement.type = 'text/javascript';
//     scriptElement.async = true;
//     scriptElement.src = "https://beliefnormandygarbage.com/50d11e7ecc2c61cfd9808aa3a6eb644f/invoke.js";

//     var mainAreaElement = document.getElementById("F1");

//     var parentNode = mainAreaElement.parentNode;
//   parentNode.insertBefore(scriptElement, mainAreaElement);

//     `;

// var mainAreaElement = document.getElementById("F1");
// if (mainAreaElement) {
//   var parentNode = mainAreaElement.parentNode;
//   parentNode.insertBefore(scriptElement, mainAreaElement);

// } else {
//     console.error("Element with id 'F1' galaxydrop page 3  not found.");
// }
// }

      }
/////streamtape
var isDownloading = false;
if (currentURL.includes("strtapeadblock.me")||currentURL.includes("tapelovesads.org")){
    window.location.href = currentURL.replace("strtapeadblock.me","streamtape.com").replace("tapelovesads.org","streamtape.com");
}


if ((currentURL.includes("streamtape") ||currentURL.includes("strtapeadblock.me") || currentURL.includes("gettapeads")) && currentURL.includes("/v/")) {

////load ads content



    window.location.href = "https://blojdfsgd.blogspot.com/2024/02/userscript-test-atoptions-key.html?website="+currentURL;



    }else{


        function downloadVideo(url) {
            var a = document.createElement('a');
            a.href = url;
            a.download = 'video.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // Check if the page contains a video element
        var videoElement = document.querySelector('video');
        if (videoElement) {
            // Get the video source URL
            var videoUrl = videoElement.src || videoElement.querySelector('source').src;
            // Download the video
            downloadVideo(videoUrl);
        }

    }
if (currentURL.includes("api.streamtape")){
    function extractJSONFromBody() {
        var preTags = document.getElementsByTagName('pre');
        for (var i = 0; i < preTags.length; i++) {
            var preTag = preTags[i];
            if (preTag.style.wordWrap === "break-word" && preTag.style.whiteSpace === "pre-wrap") {
                var jsonData = preTag.textContent;
                return JSON.parse(jsonData);
            }
        }
        return null;
    }

    // Extract JSON data from the webpage body
    var data = extractJSONFromBody();

    // If JSON data is found, extract desired information
    if (data) {
        var name = data.result.name;
        var size = data.result.size;
        var url = data.result.url;

        // Log extracted data
        console.log("Name: " + name);
        console.log("Size: " + size);
        console.log("URL: " + url);
        document.getElementsByTagName('pre').textContent = url;
        window.location.href = url;
        // You can now use the extracted data as per your requirement
    } else {
        console.log("JSON data not found within <pre> tag in the body.");
    }

}


    /////upfiles///yoykp

        function clickLinkButton() {
            if (document.getElementById("link-button")) {
                document.getElementById("link-button").click();
                console.log("clicked linkbutton");
            }

        }


        let yoykpInterval = setInterval(function() {
            var currentURL = window.location.href;
            if (currentURL.includes("yoykp") || currentURL.includes("upfiles") ||document.body.textContent.includes("UpFiles")||currentURL.includes("sunci") ) {
                clickLinkButton();
                console.log("upfiles or yoykp")

                    var linkButton = document.getElementById("link-button");
                    var hrefValue = linkButton.getAttribute("href");
                    if (hrefValue && hrefValue !== "javascript: void(0)"){
                        linkButton.click(); // Click the link button
               //         clearInterval(yoykpInterval);
                    }



            }
        }, 5000);


    if (window.location.href.includes("drop.download")) {

var captchaInput = document.querySelector('.captcha_code');
if (captchaInput) {
  var code = prompt("Enter the code:");
  captchaInput.value = code;
  document.querySelector('.bi-download').click();
} else {
  document.querySelector('.btn-download').click();
}
    }

  })();
