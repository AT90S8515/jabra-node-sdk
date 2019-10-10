// This file is included by the index.html file and will be executed in the renderer process for that window.
console.log('renderer.js loaded');

import { createApiClient } from '@gnaudio/jabra-electron-renderer-helper';
import { enumDeviceBtnType, DeviceType, JabraType, ClassEntry, JabraEventsList, DeviceEventsList, enumHidState, MethodEntry } from '@gnaudio/jabra-node-sdk';

import { player, initSDKBtn, unInitSDKBtn, initStaticVersionInfo, checkInstallBtn, notyf, showError, setupDevices, toggleScrollMessageAreaBtn, 
         toggleScrollErrorAreaBtn, devicesBtn, setupUserMediaPlaybackBtn, deviceSelector, clearMessageAreaBtn, clearErrorAreaBtn, messageArea, errorArea, 
         messagesCount, errorsCount, messageFilter, copyMessagesBtn, methodSelector, param1Hint, param2Hint, param3Hint, param4Hint, param5Hint, 
         methodHelp, txtParam1, txtParam2, txtParam3, txtParam4, txtParam5, nativeSdkVersion, nativeSdkVersionContainer, apiClassSelector, setupApiClasses, addDevice, removeDevice, setupApiMethods, invokeApiBtn } from './guihelper';
import { BoundedQueue } from './queue';
import { nameof } from '../common/util';

const stressWaitInterval = 1000;
const maxQueueSize = 1000;

let variables = {
  audioElement: player,
  mediaStream: undefined,
  deviceInfo: undefined
}
  
let boomArm = undefined;
let txDb = undefined;
let txPeakDb = undefined;
let rxDb = undefined;
let rxPeakDb = undefined;
let rxSpeech = undefined;
let txSpeech = undefined;

let scrollMessageArea = true;
let scrollErrorArea = true;
// let scrollLogArea = true;

let errors = new BoundedQueue<string>(maxQueueSize);
let messages = new BoundedQueue<string>(maxQueueSize);
// let logs = new BoundedQueue<string>(maxQueueSize);

let stressInvokeCount = undefined;
let stressInterval = undefined;

initStaticVersionInfo();

let jabra: JabraType | undefined = undefined;

initSDKBtn.onclick = () => {
    let response = createApiClient(window.electron.ipcRenderer).then((_jabra) => {        
        setupApiClasses([JabraType, DeviceType]);

        _jabra.on('attach', (device) => {
            addDevice(device);
            addEventMessage("Received attach event");

            updateApiMethods();
        });

        _jabra.on('detach', (device) => {
            removeDevice(device);
            addEventMessage("Received detach event");

            updateApiMethods();
        });

        _jabra.on('firstScanDone', () => {
            addEventMessage("Received firstScanDone event");
        });
        
        jabra = _jabra
    });
    commandEffect("createApiClient", response);
}
        
  // Close API when asked.
unInitSDKBtn.onclick = () => {
    let response = jabra!.disposeAsync();
    commandEffect("disposeAsync", response);
};

checkInstallBtn.onclick = () => {
    let response = jabra!.getSDKVersionAsync();
    commandEffect(nameof<JabraType>("getSDKVersionAsync"), response);
};

setupUserMediaPlaybackBtn.onclick = () => {

};

deviceSelector.onchange = ((e) => {

});

function getCurrentDevice() {
    let id = Number.parseInt(deviceSelector.value);
    return jabra!.getAttachedDevices().find(device => device.deviceID === id);
}

function getCurrentApiClassObject(): JabraType | DeviceType | undefined {
    let clazzName = apiClassSelector.value;
    switch (clazzName) {
        case JabraType.name: 
             return jabra; 
             break;
        case DeviceType.name:
             return getCurrentDevice();
             break;
        default: throw new Error("Unknown Api Class '" + clazzName + "'");
    }        
}

function getCurrentMethodMeta(): MethodEntry | undefined {
    let currentApiObject = getCurrentApiClassObject(); 
    if (currentApiObject) {
        let clazzMeta = currentApiObject.getMeta();
        let selectedMethodName = methodSelector.value;
        return clazzMeta.methods.find(method => method.name = selectedMethodName);
    } else {
        return undefined;
    }
}

function updateApiMethods() {
    let currentApiObject = getCurrentApiClassObject(); 
    setupApiMethods(currentApiObject ? currentApiObject.getMeta() : undefined);
}

apiClassSelector.onchange = ((e) => {
    updateApiMethods();
});

  // Update hints for API call:
methodSelector.onchange = ((e) => {
    let methodName = methodSelector.value;
  //  TODO: Update hints for API call:
});

invokeApiBtn.onclick = () => {
    let meta = getCurrentMethodMeta();
    if (meta) {
        invokeSelectedApi(meta);
    } else {
        addError("No api selected to invoke");
    }
}

// Resolves arguments for different API methods. All methods that require
// complex values or have default values should be explicitly handled here:
const commandArgs: { [name: string]: () => any[] } = {
  __default__: () => [ convertParam(txtParam1.value), convertParam(txtParam2.value), convertParam(txtParam3.value), convertParam(txtParam4.value), convertParam(txtParam5.value) ],
};

// Call into user selected API method.
function invokeSelectedApi(method: MethodEntry): Promise<any> {
    let currentApiObject = getCurrentApiClassObject(); 
    if (currentApiObject) {
        const apiFunc = (currentApiObject as any)[method.name];

        let argsResolver = commandArgs[method.name];
        if (!argsResolver) {
            argsResolver = commandArgs["__default__"];
        }

        const args = argsResolver();

        try {
            let result = apiFunc.call(jabra, ...args);
            return commandEffect(method.name, result).then(() => {});
        } catch (err) {
            addError(err);
            return Promise.reject(err);
        }
    } else {
        return Promise.reject(new Error("No api selected to execute"));
    }
}

// Setup hints to help out with API use:
function setupApiHelp() {
    /*
    param1Hint.innerText = "";
    param2Hint.innerText = "";
    param3Hint.innerText = "";
    param4Hint.innerText = "";
    param5Hint.innerText = "";
    methodHelp.innerText = "";
    (txtParam1 as any).style="";
    (txtParam2 as any).style="";
    (txtParam3 as any).style="";
    (txtParam4 as any).style="";
    (txtParam5 as any).style="";

    function getInputStyle(optional: any) {
      return optional ? "border:1px solid #00ff00" : "border:1px solid #ff0000";
    }

    let apiFuncName = methodSelector.options[methodSelector.selectedIndex].value;
    var help = commandTxtHelp[apiFuncName];
    if (!help) {
      help = commandTxtHelp["__default__"];
    }

    if (help) {
      if (help.length>0) {
        methodHelp.innerText = help[0];
      }

      if (help.length>1) {
        param1Hint.innerText = help[1];
        (txtParam1 as any).style = getInputStyle(help[1].includes("?:"));
      }
      if (help.length>2) {
        param2Hint.innerText = help[2];
        (txtParam2 as any).style = getInputStyle(help[2].includes("?:"));
      }
      if (help.length>3) {
        param3Hint.innerText = help[3];
        (txtParam4 as any).style = getInputStyle(help[3].includes("?:"));
      }
      if (help.length>4) {
        param4Hint.innerText = help[4];
        (txtParam4 as any).style = getInputStyle(help[4].includes("?:"));
      }
      if (help.length>5) {
        param5Hint.innerText = help[5];
        (txtParam5 as any).style = getInputStyle(help[5].includes("?:"));
      }
    }
  }
  */
}

function convertParam(value: any): any {
    let tValue = value.trim();
    
    // Remove leading zero from numbers to avoid intreprenting them as octal.
    if (/0[0-9a-fA-F]+/.test(tValue)) {
      while (tValue.startsWith("0")) tValue=tValue.substring(1);
    }

    // Re-intreprent # prefixed numbers as hex number
    if (/#[0-9a-fA-F]+/.test(tValue)) {
      tValue = "0x" + tValue.substring(1);
    }

    // Peek and if we can find signs of non-string than evaluate it otherwise return as string.
    if (tValue.startsWith("[") 
        || tValue.startsWith("/") 
        || tValue.startsWith('"') 
        || tValue.startsWith("'") 
        || tValue.startsWith("{")
        || tValue.toLowerCase() === "true" 
        || tValue.toLowerCase() === "false"
        || !isNaN(tValue)) {
      return eval(tValue); // Normally dangerous but since this is a test app it is acceptable.
    } else { // Assume string otherwise.
      return value;
    }
}

// Update state with result from previously executed command and return promise with result.
function commandEffect(apiFuncName: string, result: Promise<any> | any) {
    if (result instanceof Promise) {
      return result.then((value) => {
        addStatusMessage("Api call " + apiFuncName + " succeeded.");

        // Handle special calls that must have side effects in this test application:
        if (apiFuncName === createApiClient.name) {
          // Use the Jabra library
          addStatusMessage("Jabra library initialized successfully")
          initSDKBtn.disabled = true;
          unInitSDKBtn.disabled = false;
          devicesBtn.disabled = false;
          setupUserMediaPlaybackBtn.disabled = false;
          checkInstallBtn.disabled = false;

          notyf.success("Jabra library initialized successfully");
        } else if (apiFuncName === nameof<JabraType>("disposeAsync")) {
          initSDKBtn.disabled = false;
          unInitSDKBtn.disabled = true;
          devicesBtn.disabled = true;
          setupUserMediaPlaybackBtn.disabled = true;
          checkInstallBtn.disabled = true;
  
          while (deviceSelector.options.length > 0) {                
            deviceSelector.remove(0);
          }
  
          variables = {
            audioElement: player,
            mediaStream: undefined,
            deviceInfo: undefined
          }
  
          notyf.success("Jabra library uninitialized");
  
          addResponseMessage(result);
        } else if (apiFuncName === "getUserDeviceMediaExt") { // TODO ???
          // Store result for future use in new API calls that needs them.
          variables.mediaStream = value.stream;
          variables.deviceInfo = value.deviceInfo;

          // Configure player to use stream
          player.srcObject =  value.stream;
          player.muted = false;

          // Print prettyfied result:
          addResponseMessage({ stream: (value.stream ? "<MediaStream instance>" : value.stream), "deviceInfo": value.deviceInfo });
          addStatusMessage("NB: Storing stream and deviceinfo to use for subsequent API calls!");
        } else if (apiFuncName === nameof<JabraType>("getAttachedDevices")) {
          while (deviceSelector.options.length > 0) {
            deviceSelector.remove(0);
          }
    
          // Normally one should not need to check for legacy_result, but for this
          // special test page we would like it to work with older extensions/chromehosts
          // while at the same time using newest JS API. This is not normally
          // supported so we need special code to deal with legazy result formats as well.
          // Do not do this yourself - upgrade dependencies or use older API.
    
            // Decode device information normally - recommended way going forward.
           (value as DeviceType[]).forEach(device => {
            var opt = document.createElement('option');
            opt.value = device.deviceID.toString();
            opt.innerHTML = device.deviceName;
            deviceSelector.appendChild(opt);
          });
    
          if (deviceSelector.options.length == 0) {
            addError("No devices found");
          }

          addResponseMessage(value);
        } else if (apiFuncName === nameof<JabraType>("getSDKVersionAsync")) {
            nativeSdkVersion.innerHTML = value;
      
            addResponseMessage(value);

            (nativeSdkVersionContainer as any).style = "display: block";           
        } else { // Default handling of general API call:
          // Just print output if there is any:
          if (value != undefined && value != null) {
            addResponseMessage(value);
          }
        }

        return value;
      }).catch((error) => {
        addStatusMessage("Api call " + apiFuncName + " failed");

        if (apiFuncName === "getDevices") {
          while (deviceSelector.options.length > 0) {
            deviceSelector.remove(0);
          }
        }

        addError(error);

        return undefined;
      });
    } else { // Unpromised result:
      addStatusMessage("Api call " + apiFuncName + " completed.");

      if (result != undefined && result != null) { // Default handling of general API call:
        addResponseMessage(result);
      }

      return Promise.resolve(result);
    }
  }

  
  toggleScrollMessageAreaBtn.onclick = () => {
    scrollMessageArea = !scrollMessageArea;
    toggleScrollMessageAreaBtn.value = scrollMessageArea ? "Scroll ON" : "Scroll OFF";
  };

  toggleScrollErrorAreaBtn.onclick = () => {
    scrollErrorArea = !scrollErrorArea;
    toggleScrollErrorAreaBtn.value = scrollErrorArea ? "Scroll ON" : "Scroll OFF";
  };


  clearMessageAreaBtn.onclick = () => {
    messages.clear();
    messageArea.value="";
    messagesCount.innerText = "0";
  };

  clearErrorAreaBtn.onclick = () => {
    errors.clear();
    errorArea.value="";
    errorsCount.innerText = "0";
  };

  function messageFilterAllows(str: string) {
    return messageFilter.value === "" || str.toLocaleLowerCase().includes(messageFilter.value.toLocaleLowerCase());
  }

  function addError(err: Error | string) {  
    let txt;
    if (typeof err === 'string' || err instanceof String) {
      txt = "error string: " + err;
    } else if (err instanceof Error) {
      txt = err.name + " : " + err.message;
    } else {
      txt = "error object: " + JSON.stringify(err, null, 2);
    }

    errors.push(txt);
    updateErrorArea();
  }

  function updateErrorArea() {
    let filteredErrorsArray = errors.getAll();
    errorsCount.innerText = filteredErrorsArray.length.toString();
    errorArea.value = filteredErrorsArray.join("\n");
    if (scrollErrorArea) {
      errorArea.scrollTop = errorArea.scrollHeight;
    }
  }

  function addStatusMessage(msg: string | any) {
    let txt = (typeof msg === 'string' || msg instanceof String) ? msg.toString() : "Status: " + JSON.stringify(msg, null, 2);
    messages.push(txt);
    updateMessageArea();
  }

  function addResponseMessage(msg: string | any) {
    let txt = (typeof msg === 'string' || msg instanceof String) ? "response string: " + msg.toString() : "response object: " + JSON.stringify(msg, null, 2);
    messages.push(txt);
    updateMessageArea();
  }

  function addEventMessage(msg: string | any) {
    let txt = (typeof msg === 'string' || msg instanceof String) ? "event string: " + msg.toString() : "event object: " + JSON.stringify(msg, null, 2);
    messages.push(txt);
    updateMessageArea();
  }

  function updateMessageArea() {
    let filteredMessagesArray = messages.getAll().filter(txt => messageFilterAllows(txt));
    messageArea.value = filteredMessagesArray.join("\n");
    messagesCount.innerText = filteredMessagesArray.length.toString();
    if (scrollMessageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
    }
  }

  copyMessagesBtn.onclick = () => {
    let clipText = messages.getAll().filter(txt => messageFilterAllows(txt)).join("\n");
    navigator.clipboard.writeText(clipText)
    .then(() => {})
    .catch(err => {
      addError("Could not copy to clipboard");
    });
  };

  messageFilter.oninput = () => {
    updateMessageArea();
  };



// Create a API client proxy for the JabraType api class, that allows the jabra client code
// to transparently access the Jabra api. Behind the scenes, this is accompished by internal 
// IPC messages between the client and a Jabra API server running in the main process.
/*
createApiClient(window.electron.ipcRenderer).then((jabra) => {
    console.log("jabraApiClient initialized");

    let devices = jabra.getAttachedDevices();
    setupDevices(devices);

    function executeOnActiveDemoDevice( callback: (device: DeviceType) => Promise<any>) {
        let activeDevice = devices.find(d => d.deviceID == activeDemoDeviceId);
        if (activeDevice) {
            callback(activeDevice).then((v) => {
                // Callback operation succeeded
            }).catch((err) => {
                notyf.error(err);
            });
        } else {
            notyf.error("please insert a device and try again");
        }
    }

    jabra.on('attach', (device) => {
        notyf.success(device.deviceName + " attached");

        device.isGnHidStdHidSupportedAsync().then((supported) => {
            if (supported) {
                return device.setHidWorkingStateAsync(enumHidState.GN_HID);
            } else {
                return Promise.reject(new Error("GN protocol not supported"));
            }
        }).catch( (e) => {
            showError("Could not switch to GN protocol for device " + device.deviceName +". Please try another device as some functions in this demo may not work.");
        });

        device.on("btnPress", (btnType: enumDeviceBtnType, value: boolean) => {
           if (activeDemoDeviceId === device.deviceID) {
            let msg = getBtnMessageEventDescription(device.deviceID, btnType, value);
            notyf.success(msg);
           }
        });

        devices = jabra.getAttachedDevices();
        setupDevices(devices);
    });

    jabra.on('detach', (device) => {
        notyf.success(device.deviceName + " detached");
        devices = Array.from(jabra.getAttachedDevices().values());
        setupDevices(devices);
    });

}).catch( (err) => {
    console.error("Could not initialize Jabra Api client : " + err);
    showError(err);
});

*/



