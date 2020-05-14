import {
    createJabraApplication, DeviceType, JabraType, jabraEnums,
    _getJabraApiMetaSync, _JabraNativeAddonLog, AddonLogSeverity, 
    enumRemoteMmiType, enumRemoteMmiInput, enumRemoteMmiPriority, enumRemoteMmiSequence
} from '../main/index';

(async () => {
    try {
        let jabra = await createJabraApplication('A7tSsfD42VenLagL2mM6i2f0VafP/842cbuPCnC+uE8=')

        let meta = _getJabraApiMetaSync();
        // console.log("Got Jabra meta " + JSON.stringify(meta, null, 2));

        _JabraNativeAddonLog(AddonLogSeverity.info, "test2", "this is a test");

        jabra.getSDKVersionAsync().then(v => {
            console.log("SDK version is '" + v + "'");
        }).catch(err => {
            console.error("'get sdk version failed : " + err);
            console.log('get sdk version failed with error code : ' + err.code || "undefined"); 
        });

        jabra.on('attach', async (device: DeviceType) => {
            console.log(device.deviceID);
            
            if (device.deviceID === 0) {
                await device.getRemoteMmiFocusAsync(
                    enumRemoteMmiType.MMI_TYPE_MFB, 
                    enumRemoteMmiInput.MMI_ACTION_NONE, 
                    enumRemoteMmiPriority.MMI_PRIORITY_HIGH
                ).catch(err => console.log(err));
                        
                let isInFocus = await device.isRemoteMmiInFocusaAsync(enumRemoteMmiType.MMI_TYPE_MFB).catch(err => console.log(err));
                console.log('isInFocus', isInFocus)
                
                let audioActionOutput = { 
                    red: 0, 
                    green: 1,
                    blue: 1, 
                    sequence: enumRemoteMmiSequence.MMI_LED_SEQUENCE_FAST 
                }

                await device.setRemoteMmiActionAsync(enumRemoteMmiType.MMI_TYPE_MFB, audioActionOutput).catch(err => console.log(err));
                
                await device.releaseRemoteMmiFocusAsync(enumRemoteMmiType.MMI_TYPE_MFB).catch(err => console.log(err));  
            }
        });

        jabra.on('detach', (device: DeviceType) => {
            console.log('Device detached with device ', JSON.stringify(device));
            jabra.disposeAsync();
        });
    } catch (err) {
        console.error("Got exception err " + err);
        console.log('get exception error code : ' + err.code || "undefined"); 
    }
})();
