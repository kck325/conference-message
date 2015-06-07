function saveData() {
  var accountSid = document.getElementById("accountSid").value;
  var authToken = document.getElementById("authToken").value;
  chrome.storage.sync.set({'accountSid': accountSid, 'authToken': authToken}, function(){
  if (!chrome.runtime.error) {
    console.log("success");
  }
  });
  showHideEditSection(true);
}

function serialize(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

var HttpClient = function(authHeader) {
  var request = function(aUrl, aType, aCallback, aParams) {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onreadystatechange = function() { 
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
        aCallback(anHttpRequest.responseText);
      else
        console.log(anHttpRequest.status);
    }

    anHttpRequest.open( aType, aUrl, true );            
    anHttpRequest.setRequestHeader("Authorization", authHeader);
    if (aType == "POST") {
      console.log("aaa");
      anHttpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    aParams = aParams || {};
    var encodedParams = "";
    if (aParams) {
      encodedParams = serialize(aParams);
    }
    console.log(encodedParams);
    anHttpRequest.send( encodedParams );
  }

  this.get = function(aUrl, aCallback) {
    request(aUrl, "GET", aCallback);
  }

  this.post = function(aUrl, aParams, aCallback) {
    request(aUrl, "POST", aCallback, aParams);
  }
}

function updateVoiceUri(accountSid, authToken) {
  var aMessage = document.getElementById("voiceMessage").value;
  aMessage = encodeURI(aMessage);
  var sid = document.getElementById("voiceMessage").getAttribute("sid");
  var voiceUri = document.getElementById("voiceMessage").getAttribute("voiceurl");
  voiceUri = voiceUri.substring(0, voiceUri.indexOf("&Message="));
  voiceUri = voiceUri + "&Message=" + aMessage;
  var url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/IncomingPhoneNumbers/" + sid;
  var aParams = {"VoiceUrl": voiceUri, "VoiceMethod": "GET"};
  var authHeader = "Basic " + btoa(accountSid + ":" + authToken);
  var client = new HttpClient(authHeader);
  client.post(url, aParams, function(content) { console.log(content)});
}

function getPhoneNumbers(accountSid, authToken) {
  var url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/IncomingPhoneNumbers.json";
  var authHeader = "Basic " + btoa(accountSid + ":" + authToken);
  var client = new HttpClient(authHeader);
  client.get(url, function(content) {
    var numbers = JSON.parse(content).incoming_phone_numbers;
    var totalNumbers = numbers.length;
    for (var i = 0; i < totalNumbers; i++) {
      var voice_uri = numbers[i].voice_url;
      if (voice_uri.includes("&Message=")) {
        var message = voice_uri.substring(voice_uri.indexOf("&Message=") + 9);
	message = decodeURI(message);
	document.getElementById("voiceMessage").value = message;
        document.getElementById("voiceMessage").setAttribute("sid", numbers[i].sid);
        document.getElementById("voiceMessage").setAttribute("voiceUrl", voice_uri);
	document.getElementById("accountSidDetails").innerText = numbers[i].friendly_name;
	break;
      }
    }
  });
}

function showHideEditSection(show) {
    var accountSidDetails = document.getElementById("accountSidDetails");
    var authTokenDetails = document.getElementById("authTokenDetails");
    if (show) {
      chrome.storage.sync.get(["accountSid", "authToken"], function(items) {
	getPhoneNumbers(items.accountSid, items.authToken);
      });
      document.getElementById("accountDetails").style.visibility = "hidden";
      document.getElementById("showDetails").style.visibility = "visible";
    } else {
      document.getElementById("accountDetails").style.visibility = "visible";
      document.getElementById("showDetails").style.visibility = "hidden";
    }
}

document.addEventListener('DOMContentLoaded', function() {
  var saveButton = document.getElementById("saveButton");
  saveButton.addEventListener('click', function() { 
    saveData();
  });
  var editButton = document.getElementById("editButton");
  editButton.addEventListener('click', function() {
    showHideEditSection(false);
  });
  var updateButton = document.getElementById("updateButton");
  updateButton.addEventListener('click', function() {
    chrome.storage.sync.get(["accountSid", "authToken"], function(items) {
      updateVoiceUri(items.accountSid, items.authToken);
    });
  });
  chrome.storage.sync.get("accountSid", function(items) {
    if (!chrome.runtime.error) {
      var sid = items.accountSid;
      showHideEditSection(typeof sid !== 'undefined');
    }
  });
});
