#Kurento on Meteor 

these webrtc demos are based on the [kurento tutorial](http://doc-kurento.readthedocs.org/en/stable/tutorials.html) adapted for [meteor](http://www.meteor.com) 


##Installation
1. install meteor with ``curl https://install.meteor.com/ | sh``
2. clone this repo with ``git clone https://github.com/inspiraluna/kurento-meteor.git``
3. ``cd kurento-meteor/ PROJECTNAME``
4. install and run kurento [docker](https://www.docker.com/) [image] (https://github.com/Kurento/kurento-docker/tree/master/docker) please run it with ``sudo docker run -d --name kurento -p 8888:8888 fiware/stream-oriented-kurento``
5. configure settings.json if kurento media server runs on different host
6. run ``meteor npm install`` (install all npm modules)
7. run ``meteor --settings setings.json` 
8. connect to http://localhost:3000

``
{
  
  "private": {
  	   "ws_uri": "ws://kurento-reachable-ip:8888/kurento",
  }	

}
``


##iOS
- in order to run on ios, please execute ``meteor add-platform ios``
- connect your ios device and run ``meteor run ios-device``  and open the project in xcode
- don't convert to latest swift syntax! 
- within "Build Settings" add/set:
	-  "Enable Bitcode" to ``no``
	-  "Runpath Search Paths" setting with value ``@executable_path/Frameworks``
	-  "Objective-C Bridging Header" to ``${PROJECT_NAME}/Plugins/cordova-plugin-iosrtc/cordova-plugin-iosrtc-Bridging-Header.h`` (read more about the "Bridging Header" above). see: https://github.com/eface2face/cordova-plugin-iosrtc/blob/master/docs/Building.md
	- meteor run-device ios

##Android
- in order to run on android, please execute ``meteor add-platform android``
- edit AndroidManifest.xml in .meteor/local/cordova-build/platforms/android and add:  
	``  <uses-permission android:name="android.permission.RECORD_AUDIO" />
    	<uses-permission android:name="android.permission.RECORD_VIDEO" />
		<uses-permission android:name="android.permission.CAMERA" /> 
		<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
	``  
- connect your android device and run ``meteor run android-device``
- you have to install ssl on your local meteor server since webrtc does not allow non ssl connection via crosswalk. check https://letsencrypt.org/

##Packages
- signaling is done by [meteor streams] (http://arunoda.github.io/meteor-streams/) (inactive project!) 
- for webrtc on ios https://github.com/eface2face/cordova-plugin-iosrtc/ 


##Changes
- 2015-05-04 update to meteor 1.3
- 2016-04-08 moved iceserver settings to settings.json
- 2016-04-08 Update to Meteor 1.3 with npm
- 2016-03-16 (offline - train Eggenfelden-Kufstein) - enable spinner 

